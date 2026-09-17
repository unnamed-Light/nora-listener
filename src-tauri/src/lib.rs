pub mod whisper_candle;
pub mod cloud_api;
pub mod native_audio;
pub mod diarization;



#[tauri::command]
fn list_native_audio_devices() -> Vec<native_audio::NativeAudioDevice> {
    native_audio::list_input_devices()
}

#[tauri::command]
fn start_native_recording(
    app: tauri::AppHandle,
    device_id: Option<String>,
    realtime_config: Option<native_audio::RealtimeConfig>,
) -> Result<(), String> {
    native_audio::start_recording(app, device_id, realtime_config)
}

#[tauri::command]
fn stop_native_recording(app: tauri::AppHandle) -> Result<String, String> {
    native_audio::stop_recording(app)
}

#[tauri::command]
async fn start_transcription(
    app: tauri::AppHandle,
    path: String,
    model: String,
    api_key: Option<String>,
    enable_diarization: Option<bool>,
) -> Result<(), String> {
    let diarize = enable_diarization.unwrap_or(false);
    // Run the heavy CPU bound task in a blocking thread
    let result = tauri::async_runtime::spawn_blocking(move || {
        if model == "cloud" || model == "accuracy" || model == "speed" || model.starts_with("cloud-") {
            let key = api_key.unwrap_or_default();
            if key.is_empty() {
                return Err(anyhow::anyhow!("Для облачной расшифровки требуется API ключ Groq"));
            }
            cloud_api::transcribe_cloud(&path, &key, &app, diarize, &model)
        } else {
            whisper_candle::transcribe_audio(&path, &model, &app, diarize)
        }
    }).await.map_err(|e| e.to_string())?;
    
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn generate_summary(
    app: tauri::AppHandle,
    text: String,
    api_key: String,
    include_quotes: Option<bool>,
    custom_prompt: Option<String>,
    context_text: Option<String>,
    clarifying_prompt: Option<String>,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("Для генерации умного конспекта укажите Groq API ключ (gsk_...)".to_string());
    }
    let quotes = include_quotes.unwrap_or(false);
    let result = tauri::async_runtime::spawn_blocking(move || {
        cloud_api::summarize_text(&text, &api_key, quotes, custom_prompt.as_deref(), context_text.as_deref(), clarifying_prompt.as_deref(), Some(&app))
    }).await.map_err(|e| e.to_string())?;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Не удалось сохранить файл: {}", e))
}

#[tauri::command]
fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, data).map_err(|e| format!("Не удалось сохранить файл: {}", e))
}

#[tauri::command]
fn save_recorded_audio(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<String, String> {
    use tauri::Manager;
    let mut dir = app.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir());
    dir.push("recordings");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Не удалось создать директорию для записей: {}", e))?;
    dir.push(&filename);
    std::fs::write(&dir, data).map_err(|e| format!("Не удалось записать аудиофайл: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      start_transcription,
      generate_summary,
      write_text_file,
      write_binary_file,
      save_recorded_audio,
      list_native_audio_devices,
      start_native_recording,
      stop_native_recording
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
