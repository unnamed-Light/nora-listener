# Nora Listener v1.2.0 — Release Notes / Заметки о релизе

[English](#english) | [Русский](#russian)

---

<a name="russian"></a>
## Русский (RU)

### Nora Listener v1.2.0: Профессиональный звуковой конвейер DSP 2.0 и встроенная система обновлений

Релиз **v1.2.0** решает ключевую проблему записи и распознавания в реальных академических условиях: неразборчивость тихой речи преподавателя на большом расстоянии (5–15 метров) и низкое качество записи со встроенных микрофонов ноутбуков. Также в релиз включена полноценная подсистема автоматического отслеживания новых версий с GitHub.

---

### Ключевые нововведения

#### 1. Звуковой конвейер DSP 2.0 (`dsp_chain.rs`)
- **Полосовой фильтр Баттерворта человеческой речи (100–7500 Гц)**:
  - Фильтр высоких частот (High-Pass, 100 Гц, 2-й порядок) полностью подавляет низкочастотный гул кулеров охлаждения ноутбука, вибрации стола при наборе текста и сетевой фон 50/60 Гц.
  - Фильтр низких частот (Low-Pass, 7500 Гц, 2-й порядок) отсекает высокочастотный электрический свист, шип и помехи дискретизации, концентрируя энергию в голосовом диапазоне.
- **Адаптивный компрессор тихой речи (Multi-Stage AGC & Makeup Gain)**:
  - Непрерывный мониторинг RMS-огибающей с быстрым временем атаки (40 мс) и сглаженным спадом (400 мс) без эффекта «дыхания» фонового шума.
  - Плавное динамическое усиление тихого голоса издалека на величину до **+18 дБ** (стандартный), **+23.5 дБ** (высокий, рекомендуется для лекций) или **+28 дБ** (ультра, до 25 раз по амплитуде).
- **Soft-Knee компрессор и Brickwall Limiter**:
  - Внезапные громкие звуки рядом с микрофоном (кашель, хлопок двери, стук по столу, щелчки ручки) мягко компрессируются выше порога 0.85 FS и жестко ограничиваются на уровне 0.98 FS без цифрового клиппинга и хрипа.
- **Динамический VAD (Dynamic Speech Detector)**:
  - Устранена проблема отсечки тихих фраз. Вместо жесткого порога тишины (0.012) внедрен адаптивный анализатор шумовой полки с порогом срабатывания до **0.0025 RMS**. Тихая речь лектора больше не теряется.

#### 2. Встроенная система отслеживания обновлений (`UpdateModal.tsx` + `update_checker.rs`)
- **Автоматическая фоновая проверка**:
  - Через 3.5 секунды после старта приложения нативный поток Rust выполняет запрос к GitHub Releases API.
  - При обнаружении более новой версии открывается аккуратное окно Fluent UI с детальным описанием изменений и датой публикации.
- **Управление обновлениями**:
  - Кнопка прямого перехода к релизу на GitHub для скачивания установщика или автономной версии.
  - Возможность пропустить текущую версию («Пропустить эту версию»), чтобы окно не появлялось повторно.
  - Кнопка ручной проверки обновлений в окне «Настройки» с анимацией статуса и информационным бейджем.

#### 3. Настройки звука в интерфейсе (`SettingsModal.tsx`)
- В окне настроек добавлен блок **«Улучшение звука и микрофона (DSP 2.0 & AGC)»**:
  - Тумблер включения/выключения спектральной фильтрации и компрессора.
  - Выбор режима усиления далекого голоса:
    - *Стандартный (+18 дБ)* — тихие комнаты, микрофон близко к спикеру;
    - *Высокий (+23.5 дБ, рекомендуется)* — университетские аудитории, лектор у доски;
    - *Максимальный (+28 дБ)* — большие поточные аудитории, слабый встроенный микрофон.

---

### Файлы релиза

1. `Nora_Listener_Setup_1.2.0.exe` — официальный установщик Windows NSIS (автоматическая установка, создание ярлыков на рабочем столе и в меню «Пуск», чистый деинсталлятор).
2. `Nora_Listener_1.2.0_x64.exe` — автономный портативный исполняемый файл без необходимости установки.
3. `SHA256SUMS.txt` — контрольные суммы файлов для верификации целостности.

---

<a name="english"></a>
## English (EN)

### Nora Listener v1.2.0: Professional DSP 2.0 Speech Processing Pipeline & Built-in Update Tracker

Release **v1.2.0** solves the most critical challenge in real-world academic environments: poor recognition of distant lecturers (5–15 meters away) and low-grade laptop microphone hardware. It also delivers an automated update checking and notification system integrated with GitHub Releases.

---

### Key Highlights

#### 1. DSP 2.0 Speech Processing Pipeline (`dsp_chain.rs`)
- **Speech Bandpass Butterworth Filters (100–7500 Hz)**:
  - 2nd-order High-Pass Filter (100 Hz) eliminates laptop cooling fan rumble, desk typing vibrations, and 50/60 Hz power grid hum.
  - 2nd-order Low-Pass Filter (7500 Hz) cuts electrical coil whine and high-frequency hiss, focusing acoustic energy purely within human vocal formants.
- **Adaptive Speech Compressor (Multi-Stage AGC & Makeup Gain)**:
  - Continuous RMS envelope tracking with fast attack (40 ms) and smooth release (400 ms) without background noise pumping.
  - Smooth dynamic makeup gain lifting distant, quiet lecturer speech by up to **+18 dB** (Standard), **+23.5 dB** (High, recommended for halls), or **+28 dB** (Ultra, up to 25x amplitude boost).
- **Soft-Knee Compressor & Brickwall Limiter**:
  - Sudden loud events near the laptop (coughs, door slams, table bumps) are gently compressed above 0.85 FS and brickwalled at 0.98 FS without clipping or distortion.
- **Dynamic VAD (Adaptive Speech Activity Detection)**:
  - Replaces rigid static cutoffs (0.012) with an adaptive room noise floor tracker sensitive down to **0.0025 RMS**. Quiet phrases are fully captured.

#### 2. Integrated Release Tracker & Notifications (`UpdateModal.tsx` + `update_checker.rs`)
- **Automatic Background Verification**:
  - Queries GitHub Releases API 3.5 seconds after launch via native Rust worker with web fallback.
  - Displays a clean Fluent UI modal showcasing release notes and publication date whenever an update is available.
- **Update Controls**:
  - Direct download action opening the release on GitHub.
  - "Skip this version" option to suppress repetitive alerts.
  - Manual update check button in the Settings dialog with live status spinner and version badge.

#### 3. Frontend UI Controls (`SettingsModal.tsx`)
- New section: **"Audio Enhancement & AGC (DSP 2.0)"**:
  - Toggle switch for speech bandpass and adaptive compression.
  - Distant voice boost selector (Standard +18 dB / High +23.5 dB / Ultra +28 dB).

---

### Distribution Artifacts

1. `Nora_Listener_Setup_1.2.0.exe` — Windows NSIS setup installer (desktop shortcut, start menu entry, uninstaller).
2. `Nora_Listener_1.2.0_x64.exe` — Standalone portable executable.
3. `SHA256SUMS.txt` — Cryptographic SHA-256 verification checksums.
