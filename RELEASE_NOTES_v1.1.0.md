# Nora Listener v1.1.0 — Заметки о релизе / Release Notes

[RU]

## Что нового в Nora Listener v1.1.0

### 1. Фирменная иконка приложения в стиле Fluent Design Windows 11
- **Новый визуальный стиль**: Разработана официальная брендовая иконка приложения. В центре композиции — академический блокнот с неоново-бирюзовой звуковой волной спектрограммы и цифровым пером на базе глубокого космического индиго.
- **Интеграция в систему**: Мульти-разрешенная иконка (.ico) встроена во все системные компоненты Windows (панель задач, рабочий стол, контекстное меню, меню «Пуск» и экран переключения Alt+Tab).
- **Интеграция в интерфейс**: Иконка внедрена в заголовок боковой панели главного окна, а также в раздел «О программе» окна настроек.

### 2. Настраиваемая транскрибация речи в реальном времени (Live Streaming STT)
- **Распознавание речи на лету**: Во время записи лекции слова и предложения непрерывно расшифровываются и плавно появляются на экране в реальном времени.
- **Мгновенная готовность конспекта**: После остановки записи лекция уже полностью расшифрована. Можно сразу нажимать кнопку «Сделать умный конспект» без ожидания повторной обработки.
- **Параллельное сохранение аудиозаписи**: Одновременно с живым распознаванием нативный аудиозахват WASAPI сохраняет несжатый 16 кГц 16-бит моно WAV файл в папку `recordings/`.

### 3. 4-уровневая система непрерывного контекста фраз
- **Уровень 1: Адаптивный VAD-срез (Dynamic Acoustic Boundary)**: Срез аудиопотока происходит исключительно в естественных паузах дыхания лектора (400–1200 мс). Слова никогда не обрываются на полуслове.
- **Уровень 2: Акустический буфер нахлеста (500 мс Overlap)**: Начало каждого нового чанка захватывает 500 мс звука предыдущего чанка для защиты начальных фонем и согласных.
- **Уровень 3: Кондиционирование декодера Whisper через prompt**: В каждый чанк передаются последние 25 слов уже распознанной лекции, сохраняя грамматическую связность, правильные падежи и пунктуацию.
- **Уровень 4: Нативный дедупликатор стыков (`stitch_transcription_tail`)**: Специальный алгоритм на Rust выявляет дублирование слов на стыке чанков, устраняя повторы и нормализуя регистр.

### 4. Поле ввода уточняющего контекста для Норы
- **Пользовательские указания**: Добавлена возможность передать Норе персональные инструкции к лекции (например: «подробнее разобрать теорему X», «акцентировать внимание на формулах»).
- **Сохранение в сессии**: Введенный контекст автоматически сохраняется на протяжении всей активной работы с лекцией.

### 5. Гибкие параметры в «Настройках приложения»
- Переключатель включения/отключения живой транскрибации.
- Выбор модели: Whisper Large v3 Turbo (быстрый отклик) или Whisper Large v3 (максимальная точность).
- Настройка размера окна накопления звука (4–12 сек).
- Настройка порога тишины VAD (400–1200 мс).

### 6. Официальные дистрибутивы для Windows (x64)
- **Nora_Listener_v1.1.0_x64_Setup.exe** (73.05 MB) — Полноценный мастер установки NSIS с ярлыками на рабочем столе и в меню «Пуск», ассоциациями и деинсталлятором.
- **Nora_Listener_v1.1.0_Standalone.exe** (22.11 MB) — Автономный портативный исполняемый файл без необходимости установки.
- **Nora_Listener_v1.1.0_Portable.zip** (8.32 MB) — Портативный архив для быстрого переноса на флеш-накопителях.

---

[EN]

## What's New in Nora Listener v1.1.0

### 1. Brand Application Icon in Fluent Design Windows 11 Style
- **New Visual Identity**: Official brand icon featuring a lecture notebook seamlessly intertwined with a luminous neon-cyan spectrogram soundwave and digital stylus pen over a deep cosmic indigo background.
- **Operating System Integration**: Multi-resolution Windows icon (.ico) embedded directly into the executable, taskbar, desktop shortcut, Start menu, and Alt+Tab task switcher.
- **Interface Integration**: Icon placed into the main sidebar header and the "About Application" section of the Settings modal.

### 2. Configurable Real-Time Live Speech Transcription (Streaming STT)
- **Live Recognition On the Fly**: Lecturer speech is transcribed continuously during microphone recording and streams directly into the editor.
- **Instant Summary Readiness**: Once recording is stopped, the full transcript is already complete on screen. Click "Smart Notes" immediately without secondary waiting.
- **Parallel Audio Preservation**: Uncompressed 16 kHz 16-bit mono WAV audio is simultaneously saved to `recordings/` for offline archival or acoustic speaker diarization.

### 3. 4-Tier Sentence Context Preservation Pipeline
- **Tier 1: Dynamic Acoustic VAD Boundary**: Audio slicing occurs strictly during natural pauses in speaker cadence (400–1200 ms). Words are never cut mid-speech.
- **Tier 2: 500 ms Audio Overlap Buffer**: Slices overlap preceding audio by 500 ms to safeguard initial phonemes and consonant attacks.
- **Tier 3: Whisper Decoder Prompt Conditioning**: Previous 25 transcribed words are supplied as context to Whisper, maintaining grammatical flow, inflection, and punctuation.
- **Tier 4: Native Boundary Stitching (`stitch_transcription_tail`)**: Rust-powered algorithm eliminates boundary phrase duplication and aligns capitalization.

### 4. Custom Clarifying Context Input for Nora
- **Specific Lecturer Instructions**: Input box allowing users to provide custom guidance (e.g., "focus on proofs", "explain section 2 in depth").
- **Session Persistence**: Prompt context remains stored within the active session.

### 5. Customizable Settings in "Application Settings"
- Toggle switch to enable or disable streaming speech recognition.
- Model selector: Whisper Large v3 Turbo (ultra-low latency) or Whisper Large v3 (maximum academic precision).
- Audio window buffer size adjustment (4 to 12 seconds).
- Voice Activity Detection (VAD) pause sensitivity adjustment (400 to 1200 ms).

### 6. Official Windows (x64) Release Binaries
- **Nora_Listener_v1.1.0_x64_Setup.exe** (73.05 MB) — Complete NSIS setup installer with Start Menu entries, desktop shortcut, and clean uninstaller.
- **Nora_Listener_v1.1.0_Standalone.exe** (22.11 MB) — Portable single-file binary requiring zero installation.
- **Nora_Listener_v1.1.0_Portable.zip** (8.32 MB) — Portable zip distribution for USB drives and shared folders.
