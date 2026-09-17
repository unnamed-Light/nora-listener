use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Stream, StreamConfig, SampleFormat};
use hound::{WavSpec, WavWriter, SampleFormat as HoundSampleFormat};
use tauri::{AppHandle, Emitter, Manager};

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct RealtimeConfig {
    pub enabled: bool,
    pub api_key: String,
    pub model: String,
    pub chunk_window_sec: u32,
    pub vad_silence_ms: u32,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct RealtimeChunkEvent {
    pub text: String,
    pub chunk_index: usize,
    pub is_final: bool,
}

struct RecordingSession {
    stream: Stream,
    samples: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    channels: u16,
    realtime_tx: Option<std::sync::mpsc::Sender<Vec<f32>>>,
    worker_handle: Option<std::thread::JoinHandle<()>>,
}

// Safety: cpal::Stream is safe to move and drop across threads on Windows WASAPI and is kept inside a Mutex.
unsafe impl Send for RecordingSession {}

static CURRENT_SESSION: Mutex<Option<RecordingSession>> = Mutex::new(None);

#[derive(serde::Serialize, Clone)]
pub struct NativeAudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

pub fn list_input_devices() -> Vec<NativeAudioDevice> {
    let host = cpal::default_host();
    let default_device_name = host.default_input_device().and_then(|d| d.name().ok());

    let mut list = Vec::new();
    if let Ok(devices) = host.input_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                let is_default = default_device_name.as_ref().map_or(false, |def| def == &name);
                list.push(NativeAudioDevice {
                    id: name.clone(),
                    name,
                    is_default,
                });
            }
        }
    }
    list
}

pub fn clean_word(w: &str) -> String {
    w.chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_lowercase()
}

pub fn stitch_transcription_tail(accumulator: &mut String, new_text: &str) -> String {
    let trimmed_new = new_text.trim();
    if trimmed_new.is_empty() {
        return String::new();
    }

    if accumulator.trim().is_empty() {
        *accumulator = trimmed_new.to_string();
        return trimmed_new.to_string();
    }

    let words_prev: Vec<&str> = accumulator.split_whitespace().collect();
    let words_new: Vec<&str> = trimmed_new.split_whitespace().collect();

    if words_prev.is_empty() {
        *accumulator = trimmed_new.to_string();
        return trimmed_new.to_string();
    }

    if words_new.is_empty() {
        return String::new();
    }

    // Check maximum overlap of length K words (from min(words_new.len(), 5) down to 1)
    let max_k = words_new.len().min(words_prev.len()).min(5);
    let mut overlap_len = 0;

    for k in (1..=max_k).rev() {
        let prev_slice = &words_prev[words_prev.len() - k..];
        let new_slice = &words_new[..k];

        let mut all_match = true;
        for i in 0..k {
            let p = clean_word(prev_slice[i]);
            let n = clean_word(new_slice[i]);
            if p.is_empty() || n.is_empty() || p != n {
                all_match = false;
                break;
            }
        }

        if all_match {
            overlap_len = k;
            break;
        }
    }

    // If whole new_text was already contained in the overlap
    if overlap_len >= words_new.len() {
        return String::new();
    }

    // Extract remaining words
    let remaining_words = &words_new[overlap_len..];
    let mut joined_remaining = remaining_words.join(" ");

    // Check if accumulator ended with sentence-ending punctuation (. ? !)
    let last_char = accumulator.trim_end().chars().last().unwrap_or('.');
    let is_sentence_end = last_char == '.' || last_char == '?' || last_char == '!';

    // If not sentence end and remaining starts with uppercase, lowercase first char if appropriate
    if !is_sentence_end && !joined_remaining.is_empty() {
        let mut chars = joined_remaining.chars();
        if let Some(first) = chars.next() {
            let second = chars.next();
            let is_acronym = second.map_or(false, |c| c.is_uppercase());
            if !is_acronym && first.is_uppercase() {
                let rest: String = joined_remaining.chars().skip(1).collect();
                joined_remaining = format!("{}{}", first.to_lowercase(), rest);
            }
        }
    }

    // Append to accumulator with single space
    if !accumulator.ends_with(' ') && !accumulator.ends_with('\n') {
        accumulator.push(' ');
    }
    accumulator.push_str(&joined_remaining);

    joined_remaining
}

fn realtime_worker_loop(
    rx: std::sync::mpsc::Receiver<Vec<f32>>,
    app: AppHandle,
    config: RealtimeConfig,
    device_sample_rate: u32,
    channels: u16,
) {
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to build HTTP client for realtime worker: {}", e);
            return;
        }
    };

    let target_rate: u32 = 16000;
    let ch = channels.max(1) as usize;

    let min_chunk_samples = (device_sample_rate as f32 * 3.2) as usize; // min 3.2 sec before pause dispatch
    let max_chunk_samples = (device_sample_rate as f32 * config.chunk_window_sec.clamp(4, 15) as f32) as usize;
    let silence_threshold_samples = ((device_sample_rate as f32 * config.vad_silence_ms.clamp(300, 2000) as f32) / 1000.0) as usize;
    let overlap_samples_count = (device_sample_rate as f32 * 0.5) as usize; // 500ms overlap

    let mut accumulated_samples = Vec::<f32>::new();
    let mut overlap_buffer = Vec::<f32>::new();
    let mut has_speech = false;
    let mut consecutive_silence_samples = 0usize;
    let mut full_transcript = String::new();
    let mut chunk_index = 0usize;

    let base_academic_prompt = "Академическая лекция в университете. Преподаватель объясняет материал студентам. Высшая математика, формулы, термины, определения, правила, примеры: ";

    let dispatch_chunk = |samples: &[f32],
                          overlap: &[f32],
                          idx: usize,
                          is_final: bool,
                          transcript_acc: &mut String| -> Option<String> {
        if samples.is_empty() {
            return None;
        }

        // Combine overlap + current samples
        let mut combined = Vec::with_capacity(overlap.len() + samples.len());
        combined.extend_from_slice(overlap);
        combined.extend_from_slice(samples);

        // Mix to mono if needed
        let mono_samples: Vec<f32> = if ch > 1 {
            combined.chunks_exact(ch).map(|chunk| chunk.iter().sum::<f32>() / ch as f32).collect()
        } else {
            combined
        };

        if mono_samples.is_empty() {
            return None;
        }

        // Resample down to 16,000 Hz
        let resampled: Vec<f32> = if device_sample_rate != target_rate {
            let ratio = device_sample_rate as f64 / target_rate as f64;
            let target_len = (mono_samples.len() as f64 / ratio) as usize;
            let mut out = Vec::with_capacity(target_len);
            for i in 0..target_len {
                let src_idx = i as f64 * ratio;
                let idx_floor = (src_idx.floor() as usize).min(mono_samples.len() - 1);
                let idx_ceil = (idx_floor + 1).min(mono_samples.len() - 1);
                let frac = (src_idx - idx_floor as f64) as f32;
                let val = mono_samples[idx_floor] * (1.0 - frac) + mono_samples[idx_ceil] * frac;
                out.push(val);
            }
            out
        } else {
            mono_samples
        };

        // Normalization
        let mut max_peak: f32 = 0.0;
        for &s in &resampled {
            let abs = s.abs();
            if abs > max_peak {
                max_peak = abs;
            }
        }

        if max_peak < 0.0005 {
            return None;
        }

        let mut normalized = resampled;
        let gain = (0.92 / max_peak).min(25.0);
        for s in &mut normalized {
            *s = (*s * gain).clamp(-1.0, 1.0);
        }

        // Encode to WAV in memory
        let spec = WavSpec {
            channels: 1,
            sample_rate: target_rate,
            bits_per_sample: 16,
            sample_format: HoundSampleFormat::Int,
        };

        let mut cursor = std::io::Cursor::new(Vec::new());
        {
            let mut writer = match WavWriter::new(&mut cursor, spec) {
                Ok(w) => w,
                Err(e) => {
                    eprintln!("Failed to create WavWriter: {}", e);
                    return None;
                }
            };
            let amplitude = i16::MAX as f32;
            for &sample in &normalized {
                let s16 = (sample * amplitude).clamp(-amplitude, amplitude) as i16;
                if let Err(e) = writer.write_sample(s16) {
                    eprintln!("Failed to write sample: {}", e);
                    return None;
                }
            }
            if let Err(e) = writer.finalize() {
                eprintln!("Failed to finalize WAV: {}", e);
                return None;
            }
        }

        let wav_bytes = cursor.into_inner();

        // Previous tail prompt conditioning (last ~25 words)
        let words: Vec<&str> = transcript_acc.split_whitespace().collect();
        let tail_slice = if words.len() > 25 {
            &words[words.len() - 25..]
        } else {
            &words[..]
        };
        let previous_tail = tail_slice.join(" ");

        let chunk_prompt = if previous_tail.is_empty() {
            base_academic_prompt.to_string()
        } else {
            format!("{}... {}", base_academic_prompt, previous_tail)
        };

        let part = match reqwest::blocking::multipart::Part::bytes(wav_bytes)
            .file_name(format!("rt_chunk_{}.wav", idx))
            .mime_str("audio/wav")
        {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Multipart error: {}", e);
                return None;
            }
        };

        let form = reqwest::blocking::multipart::Form::new()
            .text("model", config.model.clone())
            .text("response_format", "json")
            .text("language", "ru")
            .text("temperature", "0.0")
            .text("prompt", chunk_prompt)
            .part("file", part);

        let res = match client.post("https://api.groq.com/openai/v1/audio/transcriptions")
            .bearer_auth(&config.api_key)
            .multipart(form)
            .send()
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Groq API request error: {}", e);
                return None;
            }
        };

        if !res.status().is_success() {
            let status = res.status();
            let err_text = res.text().unwrap_or_default();
            eprintln!("Groq API Error: {} - {}", status, err_text);
            return None;
        }

        let json_val: serde_json::Value = match res.json() {
            Ok(j) => j,
            Err(e) => {
                eprintln!("Failed to parse Groq response: {}", e);
                return None;
            }
        };

        let raw_text = json_val.get("text").and_then(|t| t.as_str()).unwrap_or("").trim();
        if raw_text.is_empty() || crate::cloud_api::is_hallucination(raw_text) {
            return None;
        }

        let newly_added = stitch_transcription_tail(transcript_acc, raw_text);
        if newly_added.is_empty() {
            return None;
        }

        app.emit("realtime-transcription-chunk", RealtimeChunkEvent {
            text: newly_added.clone(),
            chunk_index: idx,
            is_final,
        }).ok();

        Some(newly_added)
    };

    while let Ok(raw_block) = rx.recv() {
        // Calculate RMS of incoming block (mono approximation for VAD)
        let mut sum_sq = 0.0f32;
        for &s in &raw_block {
            sum_sq += s * s;
        }
        let rms = (sum_sq / raw_block.len().max(1) as f32).sqrt();

        // VAD threshold
        if rms > 0.012 {
            has_speech = true;
            consecutive_silence_samples = 0;
        } else {
            consecutive_silence_samples += raw_block.len();
        }

        accumulated_samples.extend_from_slice(&raw_block);

        let cur_len = accumulated_samples.len();

        let trigger_pause = has_speech && cur_len >= min_chunk_samples && consecutive_silence_samples >= silence_threshold_samples;
        let trigger_max = has_speech && cur_len >= max_chunk_samples;
        let discard_silence = !has_speech && cur_len >= max_chunk_samples;

        if trigger_pause || trigger_max {
            chunk_index += 1;
            dispatch_chunk(&accumulated_samples, &overlap_buffer, chunk_index, false, &mut full_transcript);

            // Update overlap buffer to last 500ms of current samples
            let take_len = overlap_samples_count.min(accumulated_samples.len());
            overlap_buffer = accumulated_samples[accumulated_samples.len() - take_len..].to_vec();

            accumulated_samples.clear();
            has_speech = false;
            consecutive_silence_samples = 0;
        } else if discard_silence {
            let take_len = overlap_samples_count.min(accumulated_samples.len());
            overlap_buffer = accumulated_samples[accumulated_samples.len() - take_len..].to_vec();
            accumulated_samples.clear();
            has_speech = false;
            consecutive_silence_samples = 0;
        }
    }

    // Stream finished / recording stopped. Flush any remaining speech audio
    if has_speech && accumulated_samples.len() >= (device_sample_rate as f32 * 0.8) as usize {
        chunk_index += 1;
        dispatch_chunk(&accumulated_samples, &overlap_buffer, chunk_index, true, &mut full_transcript);
    } else {
        app.emit("realtime-transcription-chunk", RealtimeChunkEvent {
            text: String::new(),
            chunk_index,
            is_final: true,
        }).ok();
    }
}

pub fn start_recording(
    app: AppHandle,
    device_id: Option<String>,
    realtime_config: Option<RealtimeConfig>,
) -> Result<(), String> {
    let mut session_lock = CURRENT_SESSION.lock().map_err(|e| e.to_string())?;
    if session_lock.is_some() {
        return Err("Запись уже запущена".to_string());
    }

    let host = cpal::default_host();
    let device: Device = if let Some(target_id) = device_id.filter(|s| !s.trim().is_empty() && s != "default") {
        let mut found = None;
        if let Ok(devices) = host.input_devices() {
            for d in devices {
                if let Ok(name) = d.name() {
                    if name == target_id {
                        found = Some(d);
                        break;
                    }
                }
            }
        }
        found.ok_or_else(|| format!("Устройство '{}' не найдено", target_id))?
    } else {
        host.default_input_device().ok_or_else(|| "Устройство ввода звука по умолчанию не найдено".to_string())?
    };

    let device_name = device.name().unwrap_or_else(|_| "Микрофон".to_string());
    app.emit("transcription-log", format!("[Звукозапись] Подключение к микрофону: {}", device_name)).ok();

    let default_config = device.default_input_config().map_err(|e| format!("Ошибка конфигурации аудио: {}", e))?;
    let sample_format = default_config.sample_format();
    let stream_config: StreamConfig = default_config.clone().into();
    let sample_rate = stream_config.sample_rate.0;
    let channels = stream_config.channels;

    let samples_storage = Arc::new(Mutex::new(Vec::<f32>::new()));
    let samples_clone = Arc::clone(&samples_storage);

    // Setup realtime streaming channel & worker if enabled
    let (realtime_tx, worker_handle) = if let Some(cfg) = realtime_config.filter(|c| c.enabled && !c.api_key.trim().is_empty()) {
        let (tx, rx) = std::sync::mpsc::channel::<Vec<f32>>();
        let app_worker = app.clone();
        let handle = std::thread::Builder::new()
            .name("nora-realtime-worker".to_string())
            .spawn(move || {
                realtime_worker_loop(rx, app_worker, cfg, sample_rate, channels);
            })
            .map_err(|e| format!("Ошибка запуска воркера реального времени: {}", e))?;
        app.emit("transcription-log", "[Транскрибация в реальном времени] Фоновый потоковый воркер активен".to_string()).ok();
        (Some(tx), Some(handle))
    } else {
        (None, None)
    };

    let rt_sender = realtime_tx.clone();

    // Throttle visualizer emissions to every ~40ms (25 fps)
    let app_handle = app.clone();
    let last_emit = Arc::new(Mutex::new(std::time::Instant::now()));

    let err_fn = move |err| {
        eprintln!("Ошибка аудио-потока: {}", err);
    };

    let stream = match sample_format {
        SampleFormat::F32 => {
            let samples_buf = samples_clone;
            let last_emit_time = Arc::clone(&last_emit);
            let app_emitter = app_handle;
            let sender = rt_sender;
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(data);
                    }

                    if let Some(ref tx) = sender {
                        let _ = tx.send(data.to_vec());
                    }

                    // Check if 40ms elapsed for visualizer
                    if let Ok(mut t) = last_emit_time.lock() {
                        if t.elapsed().as_millis() >= 40 {
                            *t = std::time::Instant::now();
                            let len = data.len().min(64);
                            let waveform: Vec<f32> = data.iter().step_by((data.len() / len).max(1)).take(64).copied().collect();
                            let peak = data.iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
                            app_emitter.emit("native-audio-wave", (waveform, peak)).ok();
                        }
                    }
                },
                err_fn,
                None,
            )
        }
        SampleFormat::I16 => {
            let samples_buf = samples_clone;
            let last_emit_time = Arc::clone(&last_emit);
            let app_emitter = app_handle;
            let sender = rt_sender;
            device.build_input_stream(
                &stream_config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(&f32_data);
                    }

                    if let Some(ref tx) = sender {
                        let _ = tx.send(f32_data.clone());
                    }

                    if let Ok(mut t) = last_emit_time.lock() {
                        if t.elapsed().as_millis() >= 40 {
                            *t = std::time::Instant::now();
                            let len = f32_data.len().min(64);
                            let waveform: Vec<f32> = f32_data.iter().step_by((f32_data.len() / len).max(1)).take(64).copied().collect();
                            let peak = f32_data.iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
                            app_emitter.emit("native-audio-wave", (waveform, peak)).ok();
                        }
                    }
                },
                err_fn,
                None,
            )
        }
        SampleFormat::U16 => {
            let samples_buf = samples_clone;
            let last_emit_time = Arc::clone(&last_emit);
            let app_emitter = app_handle;
            let sender = rt_sender;
            device.build_input_stream(
                &stream_config,
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(&f32_data);
                    }

                    if let Some(ref tx) = sender {
                        let _ = tx.send(f32_data.clone());
                    }

                    if let Ok(mut t) = last_emit_time.lock() {
                        if t.elapsed().as_millis() >= 40 {
                            *t = std::time::Instant::now();
                            let len = f32_data.len().min(64);
                            let waveform: Vec<f32> = f32_data.iter().step_by((f32_data.len() / len).max(1)).take(64).copied().collect();
                            let peak = f32_data.iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
                            app_emitter.emit("native-audio-wave", (waveform, peak)).ok();
                        }
                    }
                },
                err_fn,
                None,
            )
        }
        _ => return Err("Неподдерживаемый формат аудиосэмплов".to_string()),
    }.map_err(|e| format!("Не удалось создать аудиопоток: {}", e))?;

    stream.play().map_err(|e| format!("Не удалось запустить запись: {}", e))?;

    *session_lock = Some(RecordingSession {
        stream,
        samples: samples_storage,
        sample_rate,
        channels,
        realtime_tx,
        worker_handle,
    });

    Ok(())
}

pub fn stop_recording(app: AppHandle) -> Result<String, String> {
    let session = {
        let mut session_lock = CURRENT_SESSION.lock().map_err(|e| e.to_string())?;
        session_lock.take().ok_or_else(|| "Запись не была запущена".to_string())?
    };

    drop(session.stream); // Stop recording stream
    drop(session.realtime_tx); // Closes channel to signal realtime worker loop to finish

    if let Some(handle) = session.worker_handle {
        let _ = handle.join(); // Wait for worker to finish processing remaining audio
    }

    let raw_samples = {
        let lock = session.samples.lock().map_err(|e| e.to_string())?;
        lock.clone()
    };

    if raw_samples.is_empty() {
        return Err("Записано 0 сэмплов".to_string());
    }

    // Mix multi-channel to mono
    let mono_samples: Vec<f32> = if session.channels > 1 {
        let ch = session.channels as usize;
        raw_samples
            .chunks_exact(ch)
            .map(|chunk| chunk.iter().sum::<f32>() / ch as f32)
            .collect()
    } else {
        raw_samples
    };

    // Resample down to 16,000 Hz if needed (Whisper native sample rate)
    let target_rate: u32 = 16000;
    let resampled: Vec<f32> = if session.sample_rate != target_rate {
        let ratio = session.sample_rate as f64 / target_rate as f64;
        let target_len = (mono_samples.len() as f64 / ratio) as usize;
        let mut out = Vec::with_capacity(target_len);
        for i in 0..target_len {
            let src_idx = i as f64 * ratio;
            let idx_floor = (src_idx.floor() as usize).min(mono_samples.len() - 1);
            let idx_ceil = (idx_floor + 1).min(mono_samples.len() - 1);
            let frac = (src_idx - idx_floor as f64) as f32;
            let val = mono_samples[idx_floor] * (1.0 - frac) + mono_samples[idx_ceil] * frac;
            out.push(val);
        }
        out
    } else {
        mono_samples
    };

    // Check maximum peak
    let mut max_peak: f32 = 0.0;
    for &s in &resampled {
        let abs = s.abs();
        if abs > max_peak {
            max_peak = abs;
        }
    }

    let is_silence = max_peak < 0.0005;
    let duration_sec = resampled.len() as f32 / target_rate as f32;

    // Normalization: amplify signal up to ~0.92 peak so Whisper hears speech clearly
    let mut normalized = resampled;
    if max_peak > 0.0005 {
        let gain = (0.92 / max_peak).min(30.0);
        for s in &mut normalized {
            *s = (*s * gain).clamp(-1.0, 1.0);
        }
    }

    // Save to WAV file in app_data_dir/recordings/
    let now = chrono_free_now();
    let filename = format!("Запись_{}.wav", now);

    let mut dir = app.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir());
    dir.push("recordings");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Не удалось создать директорию: {}", e))?;
    dir.push(&filename);

    let spec = WavSpec {
        channels: 1,
        sample_rate: target_rate,
        bits_per_sample: 16,
        sample_format: HoundSampleFormat::Int,
    };

    let mut writer = WavWriter::create(&dir, spec).map_err(|e| format!("Ошибка создания WAV: {}", e))?;
    for &sample in &normalized {
        let amplitude = i16::MAX as f32;
        let s16 = (sample * amplitude).clamp(-amplitude, amplitude) as i16;
        writer.write_sample(s16).map_err(|e| format!("Ошибка записи сэмпла: {}", e))?;
    }
    writer.finalize().map_err(|e| format!("Ошибка финализации WAV: {}", e))?;

    let abs_path = dir.to_string_lossy().to_string();

    if is_silence {
        app.emit("transcription-log", format!("[Звукозапись] Внимание: Записана тишина (пик {:.4}). Проверьте настройки микрофона в Windows.", max_peak)).ok();
    } else {
        app.emit("transcription-log", format!("[Звукозапись] Запись завершена ({:.1} сек, сигнал {:.0}%). Сохранено: {}", duration_sec, max_peak * 100.0, filename)).ok();
    }

    Ok(abs_path)
}

fn chrono_free_now() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now();
    let duration = now.duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let day_secs = secs % 86400;
    let hours = (day_secs / 3600 + 3) % 24; // approx UTC+3
    let minutes = (day_secs % 3600) / 60;
    let seconds = day_secs % 60;
    format!("2026_{:02}_{:02}-{:02}", hours, minutes, seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stitch_empty_accumulator() {
        let mut acc = String::new();
        let appended = stitch_transcription_tail(&mut acc, "Здравствуйте, студенты.");
        assert_eq!(acc, "Здравствуйте, студенты.");
        assert_eq!(appended, "Здравствуйте, студенты.");
    }

    #[test]
    fn test_stitch_exact_overlap() {
        let mut acc = "Мы изучаем основы алгоритмов".to_string();
        let appended = stitch_transcription_tail(&mut acc, "алгоритмов сортировки данных.");
        assert_eq!(acc, "Мы изучаем основы алгоритмов сортировки данных.");
        assert_eq!(appended, "сортировки данных.");
    }

    #[test]
    fn test_stitch_multi_word_overlap() {
        let mut acc = "На лекции по дискретной математике графы".to_string();
        let appended = stitch_transcription_tail(&mut acc, "математике графы имеют вершины и ребра.");
        assert_eq!(acc, "На лекции по дискретной математике графы имеют вершины и ребра.");
        assert_eq!(appended, "имеют вершины и ребра.");
    }

    #[test]
    fn test_stitch_no_overlap_new_sentence() {
        let mut acc = "Первая теорема доказана.".to_string();
        let appended = stitch_transcription_tail(&mut acc, "Переходим ко второй лемме.");
        assert_eq!(acc, "Первая теорема доказана. Переходим ко второй лемме.");
        assert_eq!(appended, "Переходим ко второй лемме.");
    }

    #[test]
    fn test_stitch_duplicate_chunk_ignored() {
        let mut acc = "Сортировка слиянием".to_string();
        let appended = stitch_transcription_tail(&mut acc, "Сортировка слиянием");
        assert_eq!(acc, "Сортировка слиянием");
        assert_eq!(appended, "");
    }
}
