use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Stream, StreamConfig, SampleFormat};
use hound::{WavSpec, WavWriter, SampleFormat as HoundSampleFormat};
use tauri::{AppHandle, Emitter, Manager};

struct RecordingSession {
    stream: Stream,
    samples: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    channels: u16,
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

pub fn start_recording(app: AppHandle, device_id: Option<String>) -> Result<(), String> {
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
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(data);
                    }

                    // Check if 40ms elapsed for visualizer
                    if let Ok(mut t) = last_emit_time.lock() {
                        if t.elapsed().as_millis() >= 40 {
                            *t = std::time::Instant::now();
                            // Calculate waveform slice and peak
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
            device.build_input_stream(
                &stream_config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(&f32_data);
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
            device.build_input_stream(
                &stream_config,
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - 32768.0) / 32768.0).collect();
                    if let Ok(mut lock) = samples_buf.lock() {
                        lock.extend_from_slice(&f32_data);
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
    });

    Ok(())
}

pub fn stop_recording(app: AppHandle) -> Result<String, String> {
    let session = {
        let mut session_lock = CURRENT_SESSION.lock().map_err(|e| e.to_string())?;
        session_lock.take().ok_or_else(|| "Запись не была запущена".to_string())?
    };

    drop(session.stream); // Stop recording stream

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
    // Simple timestamp format: YYYY-MM-DD_HH-MM-SS
    let _days = secs / 86400;
    let day_secs = secs % 86400;
    let hours = (day_secs / 3600 + 3) % 24; // approx UTC+3
    let minutes = (day_secs % 3600) / 60;
    let seconds = day_secs % 60;
    format!("2026_{:02}_{:02}-{:02}", hours, minutes, seconds)
}
