# Nora Listener v1.1.0 — Release Notes

[RU]

## Что нового в версии 1.1.0

### 1. Настраиваемая транскрибация в реальном времени (Live Streaming STT)
- **Распознавание речи на лету**: Во время записи лекции с микрофона слова и фразы преподавателя непрерывно транскрибируются и плавно заполняют окно редактора в реальном времени.
- **Мгновенная готовность конспекта**: Сразу после нажатия кнопки «Остановить запись» лекция уже полностью расшифрована. Больше не нужно ждать завершения повторного распознавания — можно сразу нажать «Сделать умный конспект»!
- **Параллельное сохранение WAV**: Одновременно с потоковым распознаванием полный, неповрежденный 16 кГц 16-бит моно аудиофайл лекции сохраняется на диск в каталог `recordings/` для последующего офлайн-анализа или акустической диаризации.

### 2. 4-уровневая система сохранения непрерывного контекста фраз
- **Уровень 1: Адаптивный VAD-срез (Dynamic Acoustic Boundary)**: Срез аудиопотока происходит исключительно в естественных паузах дыхания лектора (когда уровень громкости падает ниже порога). Слова и фразы никогда не разрезаются на полуслове.
- **Уровень 2: Акустический буфер нахлеста (500 мс Overlap)**: Начало каждого нового чанка захватывает последние 500 мс звука предыдущего чанка, предотвращая проглатывание начальных согласных звуков.
- **Уровень 3: Кондиционирование декодера Whisper через prompt**: В каждый сетевой запрос к модели передаются последние 25 слов уже распознанной лекции. Модель Whisper «видит» предыдущую мысль и продолжает предложение с правильным падежом, родом, пунктуацией и без ложных заглавных букв.
- **Уровень 4: Нативный текстовый дедупликатор (`stitch_transcription_tail`)**: Специализированный алгоритм в Rust находит граничные совпадения слов на стыке чанков, схлопывает дубликаты и выравнивает регистр первой буквы.

### 3. Гибкие параметры в настройках («Настройки приложения»)
- **Тумблер включения/выключения**: Быстрое переключение между живой транскрибацией и классической записью.
- **Выбор модели распознавания**:
  - *Whisper Large v3 Turbo* (Рекомендуется, задержка отклика ~150–250 мс на чанк);
  - *Whisper Large v3* (Повышенная точность для специализированных терминов и формул).
- **Размер окна накопления аудио**: Быстрое (4–5 сек), Сбалансированное (7–8 сек), Большие фразы (10–12 сек).
- **Чувствительность детектора пауз (VAD)**: Чувствительное (400 мс), Стандартное (700 мс), Длинная пауза (1200 мс).

### 4. Документация и руководство пользователя
- Обновлено интерактивное руководство пользователя (`UserGuideModal.tsx`) с подробным описанием конвейера живой записи и подсказками по настройке.
- В архитектурную документацию (`ARCHITECTURE.md` и `ARCHITECTURE_EN.md`) добавлен раздел 5.6 с описанием потокового движка WASAPI cpal, MPSC-каналов и 4-уровневого контекстного сшивания.

---

[EN]

## What's New in Version 1.1.0

### 1. Configurable Real-Time Live Transcription (Streaming STT)
- **Live Speech-to-Text**: Speech is continuously recognized during microphone recording and streams seamlessly into the editor in real time.
- **Instant Note Generation**: The moment recording stops, the lecture is already completely transcribed on screen. No waiting for re-transcription — click "Smart Notes" immediately!
- **Lossless Full Audio Preservation**: Alongside live streaming, the complete uncompressed 16 kHz 16-bit mono WAV audio is saved to `recordings/` for offline review or acoustic speaker diarization.

### 2. 4-Tier Sentence Context Preservation Pipeline
- **Tier 1: Dynamic Acoustic VAD Boundary**: Chunks are sliced strictly during natural speaker breath pauses. Words are never cut in half.
- **Tier 2: 500 ms Audio Overlap Buffer**: Each chunk prepends 500 ms from the preceding chunk tail, safeguarding transient initial phonemes and consonants.
- **Tier 3: Whisper Decoder Prompt Conditioning**: Requests to Whisper incorporate the trailing 25 words of recognized speech, ensuring grammatical continuity, proper cases, and punctuation flow.
- **Tier 4: Native Boundary Deduplication (`stitch_transcription_tail`)**: A dedicated Rust algorithm detects cross-chunk word overlaps, deduplicating repetitive prefixes and normalizing letter casing.

### 3. Customizable Settings in "Application Settings"
- **Toggle switch**: Instantly enable or disable live streaming recognition.
- **Model selection**:
  - *Whisper Large v3 Turbo* (Recommended, ultra-low latency ~150-250 ms);
  - *Whisper Large v3* (Maximum academic accuracy for formulas and nomenclature).
- **Audio window duration**: Fast (4-5s), Balanced (7-8s), Large phrases (10-12s).
- **VAD pause sensitivity**: Short pause (400ms), Standard pause (700ms), Long pause (1200ms).

### 4. Documentation & User Guide
- In-app interactive guide (`UserGuideModal.tsx`) updated with a live microphone recording walkthrough.
- Architecture specifications (`ARCHITECTURE.md` and `ARCHITECTURE_EN.md`) expanded with Section 5.6 detailing WASAPI cpal capture, MPSC worker channels, and multi-tier context stitching.
