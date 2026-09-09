use tauri::Emitter;
use reqwest::blocking::Client;
use hound::{WavWriter, WavSpec, SampleFormat};
use anyhow::Context;

pub fn is_hallucination(text: &str) -> bool {
    let lower = text.trim().to_lowercase();
    let stripped: String = lower.chars().filter(|c| c.is_alphanumeric() || c.is_whitespace()).collect();
    let cleaned = stripped.trim();

    let hallucinations = [
        "продолжение следует",
        "субтитры сделал",
        "субтитры сделала",
        "субтитры создавал",
        "субтитры добавил",
        "субтитры",
        "спасибо за просмотр",
        "спасибо за внимание",
        "до новых встреч",
        "подпишитесь на канал",
        "ставьте лайки",
        "редактор субтитров",
        "перевод на русский язык",
        "переводчик",
        "автор субтитров",
        "дима торзок",
        "dimatorzok",
        "синицын",
        "to be continued",
        "thank you for watching",
        "thanks for watching",
        "subtitles by",
    ];

    for h in &hallucinations {
        if cleaned == *h || (cleaned.starts_with(h) && cleaned.len() <= h.len() + 25) {
            return true;
        }
    }
    false
}

pub fn transcribe_cloud(
    audio_path: &str,
    api_key: &str,
    app: &tauri::AppHandle,
    enable_diarization: bool,
    mode: &str,
) -> anyhow::Result<String> {
    let whisper_model = if mode == "speed" || mode == "cloud-speed" || mode == "turbo" {
        "whisper-large-v3-turbo"
    } else {
        "whisper-large-v3"
    };

    let mode_title = if whisper_model == "whisper-large-v3" {
        "Повышенная точность (Whisper Large v3)"
    } else {
        "Повышенная скорость (Whisper Large v3 Turbo)"
    };

    app.emit("transcription-log", format!("[Режим распознавания] {}", mode_title)).ok();
    app.emit("transcription-log", "Декодирование аудиофайла и DSP-очистка (High-Pass 80 Гц + нормализация громкости)...").ok();

    let (pcm_data, sample_rate) = crate::whisper_candle::pcm_decode(audio_path)?;

    let diar_res = if enable_diarization {
        app.emit("transcription-log", "[Акустическая диаризация] Анализ звуковой волны (высота тона F0, форманты и тембр)...").ok();
        let res = crate::diarization::acoustic_diarize(&pcm_data, sample_rate);
        let mut spk_info = Vec::new();
        for &(id, pitch) in &res.speaker_pitches {
            spk_info.push(format!("Спикер {}: ~{:.0} Гц", id, pitch));
        }
        app.emit("transcription-log", format!(
            "[Акустическая диаризация] Обнаружено физических голосов: {} ({})",
            res.num_speakers,
            spk_info.join(", ")
        )).ok();
        Some(res)
    } else {
        None
    };

    let chunk_duration_sec = 10 * 60; // 10 minutes
    let chunk_samples = chunk_duration_sec * sample_rate as usize;

    let client = Client::new();
    let mut full_transcription = String::new();

    let chunks: Vec<&[f32]> = pcm_data.chunks(chunk_samples).collect();
    let total_chunks = chunks.len();

    app.emit("transcription-log", format!("Аудио разбито на {} частей по 10 мин. Скорость Groq Whisper: ~x200", total_chunks)).ok();

    let mut last_speaker: Option<usize> = None;
    let base_academic_prompt = "Академическая лекция в университете. Преподаватель объясняет материал студентам. Высшая математика, дискретная математика, алгоритмы, программирование, русский язык, формулы, термины, определения, правила, примеры, теоремы. Четкая пунктуация, терминология, заглавные буквы: ";
    let mut previous_tail = String::new();

    for (i, chunk) in chunks.into_iter().enumerate() {
        let spec = WavSpec {
            channels: 1,
            sample_rate: sample_rate,
            bits_per_sample: 16,
            sample_format: SampleFormat::Int,
        };

        let mut cursor = std::io::Cursor::new(Vec::new());
        {
            let mut writer = WavWriter::new(&mut cursor, spec).context("Failed to create WavWriter")?;
            for &sample in chunk {
                let amplitude = i16::MAX as f32;
                let s16 = (sample * amplitude).clamp(-amplitude, amplitude) as i16;
                writer.write_sample(s16).context("Failed to write sample")?;
            }
            writer.finalize().context("Failed to finalize WAV")?;
        }

        let wav_bytes = cursor.into_inner();

        app.emit("transcription-log", format!("[Часть {}/{}] Отправка в Groq Whisper ({})...", i + 1, total_chunks, whisper_model)).ok();

        let response_format = if enable_diarization { "verbose_json" } else { "json" };

        let chunk_prompt = if previous_tail.is_empty() {
            base_academic_prompt.to_string()
        } else {
            format!("{}... {}", base_academic_prompt, previous_tail)
        };

        let part = reqwest::blocking::multipart::Part::bytes(wav_bytes)
            .file_name(format!("chunk_{}.wav", i))
            .mime_str("audio/wav")?;

        let form = reqwest::blocking::multipart::Form::new()
            .text("model", whisper_model)
            .text("response_format", response_format)
            .text("language", "ru")
            .text("temperature", "0.0")
            .text("prompt", chunk_prompt)
            .part("file", part);

        let res = client.post("https://api.groq.com/openai/v1/audio/transcriptions")
            .bearer_auth(api_key)
            .multipart(form)
            .send()?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().unwrap_or_default();
            anyhow::bail!("Groq API Error: {} - {}", status, text);
        }

        let json: serde_json::Value = res.json()?;
        let chunk_offset_sec = (i * chunk_duration_sec) as f64;

        if enable_diarization {
            let mut chunk_text_len = 0;
            let mut chunk_collected = String::new();
            if let Some(segments) = json.get("segments").and_then(|s| s.as_array()) {
                for seg in segments {
                    let seg_start = seg.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let seg_text = seg.get("text").and_then(|v| v.as_str()).unwrap_or("").trim();
                    if is_hallucination(seg_text) || seg_text.is_empty() {
                        continue;
                    }
                    chunk_text_len += seg_text.len();
                    chunk_collected.push(' ');
                    chunk_collected.push_str(seg_text);

                    let abs_time = chunk_offset_sec + seg_start;
                    let spk_id = diar_res.as_ref().map(|d| d.get_speaker_at(abs_time)).unwrap_or(1);

                    if Some(spk_id) != last_speaker {
                        if !full_transcription.is_empty() {
                            full_transcription.push_str("\n\n");
                        }
                        let spk_tag = format!("[Спикер {}]: ", spk_id);
                        full_transcription.push_str(&spk_tag);
                        full_transcription.push_str(seg_text);
                        app.emit("transcription-event", format!("{}{}", spk_tag, seg_text)).ok();
                        last_speaker = Some(spk_id);
                    } else {
                        if !full_transcription.is_empty() {
                            full_transcription.push(' ');
                        }
                        full_transcription.push_str(seg_text);
                        app.emit("transcription-event", seg_text.to_string()).ok();
                    }
                }
            } else if let Some(text) = json.get("text").and_then(|t| t.as_str()) {
                let clean_text = text.trim();
                if !is_hallucination(clean_text) && !clean_text.is_empty() {
                    chunk_text_len += clean_text.len();
                    chunk_collected.push_str(clean_text);
                    if !full_transcription.is_empty() {
                        full_transcription.push_str("\n\n");
                    }
                    full_transcription.push_str(&format!("[Спикер 1]: {}", clean_text));
                    app.emit("transcription-event", format!("[Спикер 1]: {}", clean_text)).ok();
                }
            }

            let tail_source = chunk_collected.trim();
            if tail_source.len() > 180 {
                let tail_chars: Vec<char> = tail_source.chars().collect();
                let start_idx = tail_chars.len().saturating_sub(180);
                previous_tail = tail_chars[start_idx..].iter().collect();
            } else if !tail_source.is_empty() {
                previous_tail = tail_source.to_string();
            }

            app.emit("transcription-log", format!("[Часть {}/{}] Готово (получено {} символов с разметкой)", i + 1, total_chunks, chunk_text_len)).ok();
        } else {
            if let Some(text) = json.get("text").and_then(|t| t.as_str()) {
                let clean_text = text.trim();
                if is_hallucination(clean_text) {
                    app.emit("transcription-log", format!("[Фильтр галлюцинаций] Отфильтрована фраза тишины: \"{}\"", clean_text)).ok();
                } else if !clean_text.is_empty() {
                    if !full_transcription.is_empty() {
                        full_transcription.push(' ');
                    }
                    full_transcription.push_str(clean_text);
                    app.emit("transcription-event", clean_text).ok();

                    if clean_text.len() > 180 {
                        let tail_chars: Vec<char> = clean_text.chars().collect();
                        let start_idx = tail_chars.len().saturating_sub(180);
                        previous_tail = tail_chars[start_idx..].iter().collect();
                    } else {
                        previous_tail = clean_text.to_string();
                    }
                }

                app.emit("transcription-log", format!("[Часть {}/{}] Готово (получено {} символов)", i + 1, total_chunks, clean_text.len())).ok();
            }
        }

        let progress = ((i + 1) as f32 / total_chunks as f32) * 100.0;
        app.emit("transcription-progress", progress as i32).ok();
    }

    if full_transcription.trim().is_empty() {
        app.emit("transcription-log", "[Внимание] Человеческая речь не распознана. Проверьте, выбран ли правильный микрофон.").ok();
    } else {
        if enable_diarization {
            app.emit("transcription-diarized", full_transcription.clone()).ok();
            app.emit("transcription-log", "[Диаризация] Акустическая разметка спикеров успешно применена!").ok();
        }
        app.emit("transcription-log", "[Успешно] Облачная расшифровка завершена!").ok();
    }
    Ok(full_transcription)
}

fn diarize_chunk(
    text: &str,
    api_key: &str,
    _chunk_idx: usize,
    _total_chunks: usize,
    _app: &tauri::AppHandle,
) -> anyhow::Result<String> {
    let client = Client::new();
    let system_prompt = "Ты — специализированная нейросеть для диаризации и разметки диалогов.\n\
Твоя задача — проанализировать расшифрованный текст аудиозаписи (лекции, семинара, защиты или интервью) и разделить его на реплики разных спикеров.\n\n\
Определяй смену говорящих по речевым признакам: обращения лектора к студентам, вопросы из аудитории, ответы, вводные фразы, перебивания, диалоги.\n\n\
ФОРМАТ ВЫВОДА:\n\
Каждая реплика ОБЯЗАТЕЛЬНО начинается с новой строки с тегом говорящего в квадратных скобках и двоеточия, например:\n\
[Спикер 1]: Реплика первого человека...\n\n\
[Спикер 2]: Вопрос или комментарий второго человека...\n\n\
СТРОГИЕ ПРАВИЛА:\n\
1. НЕ СОКРАЩАЙ и НЕ ПЕРЕСКАЗЫВАЙ текст. Сохраняй исходные слова и фразы полностью.\n\
2. Если говорит один человек на протяжении всего фрагмента, начни с [Спикер 1]: и не создавай фиктивных спикеров.\n\
3. Разделяй реплики разных спикеров пустыми строками.\n\
4. Не добавляй никаких пояснений, заголовков или примечаний от себя, выводи ТОЛЬКО размеченный текст.";

    let preferred_models = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
        "groq/compound",
        "groq/compound-mini",
        "allam-2-7b",
    ];

    for model in preferred_models {
        let payload = serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": format!("Разметь спикеров в следующем тексте:\n\n{}", text) }
            ],
            "temperature": 0.1,
            "max_tokens": 8192
        });

        let res = client.post("https://api.groq.com/openai/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&payload)
            .send();

        if let Ok(resp) = res {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<serde_json::Value>() {
                    if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
                        let clean = content.trim();
                        if !clean.is_empty() {
                            return Ok(clean.to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(text.to_string())
}

pub fn diarize_transcript(
    text: &str,
    api_key: &str,
    app: &tauri::AppHandle,
) -> anyhow::Result<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(String::new());
    }

    app.emit("transcription-log", "[Диаризация] Определение говорящих и разметка реплик...").ok();

    if trimmed.len() <= 14000 {
        let res = diarize_chunk(trimmed, api_key, 1, 1, app)?;
        app.emit("transcription-log", "[Диаризация] Разметка спикеров успешно завершена!").ok();
        return Ok(res);
    }

    let mut chunks = Vec::new();
    let mut current_chunk = String::new();

    for paragraph in trimmed.split("\n\n") {
        if current_chunk.len() + paragraph.len() > 10000 && !current_chunk.is_empty() {
            chunks.push(current_chunk);
            current_chunk = String::new();
        }
        if !current_chunk.is_empty() {
            current_chunk.push_str("\n\n");
        }
        current_chunk.push_str(paragraph);
    }
    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    let total = chunks.len();
    let mut result = String::new();
    for (i, chunk) in chunks.iter().enumerate() {
        app.emit("transcription-log", format!("[Диаризация] Обработка блока {}/{}...", i + 1, total)).ok();
        let diarized = diarize_chunk(chunk, api_key, i + 1, total, app).unwrap_or_else(|_| chunk.clone());
        if !result.is_empty() {
            result.push_str("\n\n");
        }
        result.push_str(&diarized);
    }

    app.emit("transcription-log", "[Диаризация] Разметка спикеров успешно завершена!").ok();
    Ok(result)
}

fn prepare_lecture_text(full_text: &str, max_chars: usize) -> String {
    let hallucination_phrases = [
        "Субтитры создавал DimaTorzok",
        "Субтитры создавал dimatorzok",
        "субтитры создавал dimatorzok",
        "субтитры создавал DimaTorzok",
        "Субтитры сделал DimaTorzok",
        "Субтитры делал DimaTorzok",
        "Редактор субтитров",
        "редактор субтитров",
        "Продолжение следует...",
        "Продолжение следует",
        "Спасибо за просмотр!",
        "Спасибо за просмотр.",
        "Спасибо за просмотр",
        "Спасибо за внимание!",
        "Спасибо за внимание.",
        "Подписывайтесь на канал",
        "подписывайтесь на канал",
        "Ставьте лайки",
        "ставьте лайки",
        "[Успешно] Облачная расшифровка завершена!",
        "Облачная расшифровка завершена!",
        "Успешно!",
    ];

    let mut text = full_text.to_string();
    for phrase in &hallucination_phrases {
        text = text.replace(phrase, "");
    }

    let mut cleaned_lines = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Only drop line if it is purely a short technical status message
        if trimmed.len() < 100 && (
            (trimmed.starts_with("[Часть ") && (trimmed.contains("Отправка") || trimmed.contains("Готово")))
            || (trimmed.starts_with('[') && trimmed.contains("расшифровка") && trimmed.ends_with(']'))
            || trimmed.starts_with("[Error]")
        ) {
            continue;
        }
        cleaned_lines.push(trimmed);
    }

    let cleaned = cleaned_lines.join("\n\n");
    let total_chars = cleaned.chars().count();
    if total_chars <= max_chars {
        return cleaned;
    }

    // Uniform sampling across lecture for very long recordings
    let num_sections = 4;
    let section_size = max_chars / num_sections;
    let chars_vec: Vec<char> = cleaned.chars().collect();
    let step = (chars_vec.len().saturating_sub(section_size)) / (num_sections - 1);

    let mut sections = Vec::new();
    for i in 0..num_sections {
        let start = i * step;
        let end = (start + section_size).min(chars_vec.len());
        if start < end {
            let part: String = chars_vec[start..end].iter().collect();
            sections.push(part);
        }
    }

    sections.join("\n\n--- [Смысловой фрагмент лекции] ---\n\n")
}



pub fn sanitize_summary(content: &str) -> String {
    let mut text = content.to_string();

    // 1. Remove closed <think>...</think> or <thought>...</thought> tags
    while let Some(start) = text.find("<think>") {
        if let Some(end) = text[start..].find("</think>") {
            text.replace_range(start..start + end + "</think>".len(), "");
        } else {
            // Unclosed <think> tag: if it starts before a markdown header, strip everything up to that header
            if let Some(header_pos) = text[start..].find("\n# ") {
                text.replace_range(start..start + header_pos, "");
            } else if let Some(header_pos) = text[start..].find("\n## ") {
                text.replace_range(start..start + header_pos, "");
            } else {
                text.replace_range(start.., "");
            }
            break;
        }
    }

    while let Some(start) = text.find("<thought>") {
        if let Some(end) = text[start..].find("</thought>") {
            text.replace_range(start..start + end + "</thought>".len(), "");
        } else {
            if let Some(header_pos) = text[start..].find("\n# ") {
                text.replace_range(start..start + header_pos, "");
            } else if let Some(header_pos) = text[start..].find("\n## ") {
                text.replace_range(start..start + header_pos, "");
            } else {
                text.replace_range(start.., "");
            }
            break;
        }
    }

    // 2. Remove any stray opening or closing tags
    text = text.replace("</think>", "").replace("</thought>", "")
               .replace("<think>", "").replace("<thought>", "");

    // 3. Remove raw reasoning lead-ins if model emitted them outside tags
    let reasoning_lead_ins = [
        "Here's a thinking process:",
        "Here is a thinking process:",
        "Thinking Process:",
    ];
    for lead in &reasoning_lead_ins {
        if let Some(pos) = text.find(lead) {
            if let Some(header_pos) = text[pos..].find("\n# ") {
                text.replace_range(pos..pos + header_pos, "");
            } else if let Some(header_pos) = text[pos..].find("\n## ") {
                text.replace_range(pos..pos + header_pos, "");
            }
        }
    }

    text.trim().to_string()
}

fn run_groq_session(
    client: &Client,
    api_key: &str,
    candidate_models: &[String],
    system_prompt: &str,
    lecture_text: &str,
    session_name: &str,
    app: Option<&tauri::AppHandle>,
) -> anyhow::Result<String> {
    if let Some(app_handle) = app {
        app_handle.emit("transcription-log", format!("[Конспект] {}...", session_name)).ok();
    }

    let mut last_error = String::new();

    for model in candidate_models {
        let max_tokens = if model.starts_with("openai/gpt-oss") { 3600 } else { 3200 };
        let mut payload_map = serde_json::Map::new();
        payload_map.insert("model".to_string(), serde_json::Value::String(model.to_string()));
        payload_map.insert("messages".to_string(), serde_json::json!([
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": format!("Вот расшифрованный текст лекции для составления конспекта:\n\n{}", lecture_text) }
        ]));
        payload_map.insert("temperature".to_string(), serde_json::json!(0.1));
        payload_map.insert("max_tokens".to_string(), serde_json::json!(max_tokens));

        if model.starts_with("openai/gpt-oss") {
            payload_map.insert("reasoning_format".to_string(), serde_json::json!("hidden"));
        }
        let payload = serde_json::Value::Object(payload_map);

        let res = client.post("https://api.groq.com/openai/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&payload)
            .send();

        match res {
            Ok(resp) => {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<serde_json::Value>() {
                        if let Some(choice) = json.get("choices").and_then(|c| c.get(0)) {
                            if let Some(content) = choice.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_str()) {
                                let mut clean = sanitize_summary(content);
                                let finish_reason = choice.get("finish_reason").and_then(|f| f.as_str()).unwrap_or("stop");

                                let is_incomplete = finish_reason == "length" || (!clean.contains("§ 5") && clean.len() > 800);

                                if is_incomplete && !clean.is_empty() {
                                    if let Some(app_handle) = app {
                                        app_handle.emit("transcription-log", "[Конспект] Дописывание заключительной части конспекта...").ok();
                                    }

                                    // Wait for token rate limit bucket to refill
                                    std::thread::sleep(std::time::Duration::from_millis(3000));

                                    // Trim trailing broken line if cut off mid-word or mid-sentence
                                    let trimmed_clean = if let Some(last_nl) = clean.rfind('\n') {
                                        let last_line = clean[last_nl..].trim();
                                        if !last_line.is_empty() && !last_line.ends_with('.') && !last_line.ends_with('!') && !last_line.ends_with('?') && !last_line.ends_with('*') && !last_line.ends_with('#') {
                                            &clean[..last_nl]
                                        } else {
                                            &clean[..]
                                        }
                                    } else {
                                        &clean[..]
                                    };

                                    let mut cont_map = serde_json::Map::new();
                                    cont_map.insert("model".to_string(), serde_json::Value::String(model.to_string()));
                                    cont_map.insert("messages".to_string(), serde_json::json!([
                                        { "role": "system", "content": system_prompt },
                                        { "role": "user", "content": format!("Вот расшифрованный текст лекции для составления конспекта:\n\n{}", lecture_text) },
                                        { "role": "assistant", "content": trimmed_clean },
                                        { "role": "user", "content": "Продолжай конспект строго с места обрыва до полного завершения § 5 и финальной подписи Норы. Не повторяй уже написанный текст, не выводи приветствий и вводных слов." }
                                    ]));
                                    cont_map.insert("temperature".to_string(), serde_json::json!(0.1));
                                    cont_map.insert("max_tokens".to_string(), serde_json::json!(1600));
                                    if model.starts_with("openai/gpt-oss") {
                                        cont_map.insert("reasoning_format".to_string(), serde_json::json!("hidden"));
                                    }
                                    let cont_payload = serde_json::Value::Object(cont_map);

                                    for attempt in 0..2 {
                                        if let Ok(cont_res) = client.post("https://api.groq.com/openai/v1/chat/completions")
                                            .bearer_auth(api_key)
                                            .json(&cont_payload)
                                            .send()
                                        {
                                            if cont_res.status().is_success() {
                                                if let Ok(cont_json) = cont_res.json::<serde_json::Value>() {
                                                    if let Some(cont_text) = cont_json["choices"][0]["message"]["content"].as_str() {
                                                        let clean_cont = sanitize_summary(cont_text);
                                                        if !clean_cont.is_empty() {
                                                            clean = format!("{}\n\n{}", trimmed_clean.trim_end(), clean_cont.trim_start());
                                                        }
                                                    }
                                                }
                                                break;
                                            } else if cont_res.status().as_u16() == 429 && attempt == 0 {
                                                std::thread::sleep(std::time::Duration::from_millis(3500));
                                                continue;
                                            }
                                        }
                                    }
                                }

                                if !clean.is_empty() {
                                    if !clean.contains("Конспект сформирован Норой") {
                                        clean.push_str("\n\n---\n*Конспект сформирован Норой. Успехов в подготовке к занятиям и экзаменам!*");
                                    }

                                    if let Some(app_handle) = app {
                                        app_handle.emit(
                                            "transcription-log",
                                            format!("[Конспект] Конспект успешно сформирован (объем: {} символов).", clean.chars().count())
                                        ).ok();
                                    }
                                    return Ok(clean);
                                }
                            }
                        }
                    }
                } else {
                    let status = resp.status();
                    let err_text = resp.text().unwrap_or_default();
                    last_error = format!("{} (HTTP {}): {}", model, status, err_text);
                    if status.as_u16() == 429 {
                        std::thread::sleep(std::time::Duration::from_millis(2500));
                    }
                    continue;
                }
            }
            Err(e) => {
                last_error = format!("{}: {}", model, e);
                continue;
            }
        }
    }

    anyhow::bail!("Не удалось выполнить генерацию конспекта: {}", last_error)
}

pub fn summarize_text(
    text: &str,
    api_key: &str,
    include_quotes: bool,
    app: Option<&tauri::AppHandle>,
) -> anyhow::Result<String> {
    let client = Client::new();

    let preferred_models = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "groq/compound-mini",
        "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b",
    ];

    let mut candidate_models = Vec::new();

    if let Ok(models_res) = client.get("https://api.groq.com/openai/v1/models")
        .bearer_auth(api_key)
        .send()
    {
        if models_res.status().is_success() {
            if let Ok(models_json) = models_res.json::<serde_json::Value>() {
                if let Some(data) = models_json.get("data").and_then(|d| d.as_array()) {
                    let available_ids: std::collections::HashSet<String> = data
                        .iter()
                        .filter_map(|m| m.get("id").and_then(|id| id.as_str()).map(|s| s.to_string()))
                        .collect();

                    for &pref in &preferred_models {
                        if available_ids.contains(pref) {
                            candidate_models.push(pref.to_string());
                        }
                    }

                    for id in available_ids {
                        if !candidate_models.contains(&id)
                            && (id.contains("llama") || id.contains("compound-mini") || id.contains("gemma") || id.contains("mistral") || id.contains("qwen") || id.contains("oss"))
                            && !id.contains("whisper") && !id.contains("guard") && !id.contains("vision")
                        {
                            candidate_models.push(id);
                        }
                    }
                }
            }
        }
    }

    if candidate_models.is_empty() {
        for &pref in &preferred_models {
            candidate_models.push(pref.to_string());
        }
    }

    let text_to_summarize = prepare_lecture_text(text, 9000);
    if text_to_summarize.trim().len() < 20 {
        anyhow::bail!("Текст лекции пуст или не содержит распознанной речи для составления конспекта. Пожалуйста, убедитесь, что в поле 'Полный транскрипт' присутствует текст лекции.");
    }

    let quotes_rule = if include_quotes {
        "\n6. ИЗБИРАТЕЛЬНОЕ И ТОЧЕЧНОЕ ВКЛЮЧЕНИЕ ЦИТАТ: Приводи аутентичные цитаты лектора ТОЛЬКО в самых ключевых, поворотных и фундаментальных моментах лекции (всего 2–4 самые яркие и важные цитаты на весь конспект, а не к каждому пункту!) в формате:\n> «[Прямая речь преподавателя]» — Преподаватель\n(С аккуратным грамматическим исправлением устных оговорок и запинок до норм литературного языка).\n7. СОХРАНЕНИЕ МАКСИМАЛЬНОГО ОБЪЕМА И ПОЛНОТЫ: Включение цитат ни в коем случае НЕ должно сокращать, сжимать или вытеснять сам теоретический материал! Все определения, доказательства, формулы в LaTeX, примеры и подробные разборы подразделов должны оставаться максимально глубокими, развернутыми и исчерпывающими. Конспект с цитатами обязан быть столь же или еще более объемным и детальным, чем без них."
    } else {
        ""
    };

    let unified_prompt = format!(
        "Ты — Нора, персональный академический ИИ-ассистент и внимательный конспектировщик лекций приложения «Nora Listener».\n\
Твоя цель — составить подробный, исчерпывающий и структурированный конспект лекции строго по тексту аудиозаписи в формате Markdown на русском языке.\n\n\
ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:\n\
1. Пиши максимально подробно, развернуто и обстоятельно. Ни в коем случае не сокращай изложение лекции, подробно раскрывай все пункты, понятия, примеры и подразделы 3.1–3.4. Обязательно раскрой все 5 разделов (§ 1 – § 5).\n\
2. СТРОГО ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ЭМОДЗИ И СМАЙЛИКИ! Для оформления используй исключительно строгие типографские символы (§, •, —, ◆, ✓).\n\
3. СТРОГО ЗАПРЕЩЕНО выводить теги <think>, <thought> или внутренние служебные рассуждения. Начинай ответ СРАЗУ с заголовка первого уровня (#).\n\
4. МАТЕМАТИЧЕСКАЯ РАЗМЕТКА: Все математические формулы, переменные, множества, отношения и кванторы оформляй СТРОГО в стандартном синтаксисе LaTeX ($...$ для строчных и $$...$$ для вынесенных формул). Категорически запрещено оставлять формулы простым текстом без знаков доллара.\n\
5. СТРОГАЯ ЗАВЕРШЕННОСТЬ ВСЕХ РАЗДЕЛОВ: Ответ обязан быть ПОЛНОСТЬЮ завершенным, целостным и законченным. Категорически запрещено обрывать текст или оставлять разделы недописанными! Обязательно раскрой все 5 разделов (§ 1 – § 5) и заверши конспект финальной строкой *Конспект сформирован Норой. Успехов в подготовке к занятиям и экзаменам!*.{}\n\n\
ОБЯЗАТЕЛЬНАЯ СТРУКТУРА КОНСПЕКТА:\n\
# [Название темы лекции (сформулируй по реальным словам лектора)]\n\
*Конспект составлен Норой (Nora Listener) строго по материалам лекции.*\n\n\
## § 1. Главные тезисы и фундаментальные идеи лекции\n\
(Подробно изложи 4–6 ключевых фундаментальных идей лектора. Каждый пункт — развернутый абзац с аргументацией и логикой):\n\
• **[Ключевая идея]**: подробное изложение сути, хода мысли лектора и теоретической основы.\n\n\
## § 2. Ключевые термины и понятийный аппарат лекции\n\
(Дай максимально полные и строгие академические определения ВСЕМ понятиям и терминам из лекции, формулы в LaTeX):\n\
• **[Термин]** — исчерпывающее строгое академическое определение, математический или логический смысл, обозначения, формулы в LaTeX, примеры и свойства.\n\n\
## § 3. Подробное аналитическое содержание лекции\n\
### 3.1. [Тематический блок 1]\n\
Максимально развернутый детальный разбор: предпосылки, определения, формулы в LaTeX, доказательства и примеры.\n\
### 3.2. [Тематический блок 2]\n\
Максимально развернутый детальный разбор с примерами и ходом рассуждений лектора.\n\
### 3.3. [Тематический блок 3]\n\
Максимально развернутый детальный разбор с формулами, классификациями и анализом.\n\
### 3.4. [Тематический блок 4]\n\
Максимально развернутый детальный разбор материала и взаимосвязей понятий.\n\n\
## § 4. Акценты лектора, нюансы и частые ошибки\n\
(Подробно разбери, на что лектор обращал особое внимание, типичные заблуждения студентов, подводные камни к экзамену):\n\
• **[Важный акцент / Типичная ошибка]**: в чем заключается, почему студенты ошибаются, как правильно отвечать на экзамене.\n\n\
## § 5. Вопросы для глубокой самопроверки к экзамену от Норы\n\
(Составь 5–7 сложных вопросов с краткими пояснениями того, какие аспекты лекции нужно вспомнить для ответа):\n\
1. [Глубокий вопрос по материалу лекции]\n\
2. [Глубокий вопрос по материалу лекции]\n\
3. [Глубокий вопрос по материалу лекции]\n\
4. [Глубокий вопрос по материалу лекции]\n\
5. [Глубокий вопрос по материалу лекции]\n\n\
---\n\
*Конспект сформирован Норой. Успехов в подготовке к занятиям и экзаменам!*",
        quotes_rule
    );

    let summary = run_groq_session(
        &client,
        api_key,
        &candidate_models,
        &unified_prompt,
        &text_to_summarize,
        "Генерация подробного академического конспекта (§§ 1–5)",
        app,
    )?;

    if let Some(app_handle) = app {
        app_handle.emit(
            "transcription-log",
            format!("[Конспект] Успешно завершено! Конспект готов (объем: {} символов).", summary.chars().count())
        ).ok();
    }

    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_summarize_large_lecture() {
        let key = std::env::var("GROQ_API_KEY").unwrap_or_else(|_| "gsk_test".to_string());
        let base_speech = "Лектор подробно рассматривает мантиссу и порядок чисел с плавающей точкой. \
            В представлении числа диапазон очень сильно расширяется. Из-за сохранения разрядности погрешность неизбежна. ";
        let mut large_transcript = String::new();
        for part in 1..=8 {
            large_transcript.push_str(&format!("[Часть {}/8] Отправка в облако...\nУспешно!\n", part));
            large_transcript.push_str(&base_speech.repeat(120));
            large_transcript.push_str("\n\n");
        }
        large_transcript.push_str("[Успешно] Облачная расшифровка завершена!");

        println!("Simulated 2-hour lecture length: {} characters", large_transcript.len());
        let prepared = prepare_lecture_text(&large_transcript, 36000);
        assert!(!prepared.is_empty(), "Prepared lecture text should not be empty");
        assert!(prepared.contains("мантиссу"), "Should contain lecture speech");

        if key.starts_with("gsk_") && key.len() > 20 {
            let result = summarize_text(&large_transcript, &key, true, None);
            if let Ok(summary) = result {
                println!("=== 2-HOUR LECTURE SUMMARY RESULT ===\n{}\n======================================", summary);
                assert!(summary.len() > 100, "Summary is too short!");
            }
        }
    }

    #[test]
    fn test_sanitize_summary() {
        let dirty = "<think>\nHere's a thinking process:\n1. Analyze input\n</think>\n# Название лекции\nТекст конспекта";
        let clean = sanitize_summary(dirty);
        assert_eq!(clean, "# Название лекции\nТекст конспекта");
        assert!(!clean.contains("<think>"));
        assert!(!clean.contains("thinking process"));

        let unclosed = "<think>\nThinking...\n# Заголовок\nКонспект";
        let clean_unclosed = sanitize_summary(unclosed);
        assert_eq!(clean_unclosed, "# Заголовок\nКонспект");

        let stray = "Here's a thinking process:\n1. Step\n\n# Реальный заголовок\nСодержание";
        let clean_stray = sanitize_summary(stray);
        assert_eq!(clean_stray, "# Реальный заголовок\nСодержание");
    }
}
