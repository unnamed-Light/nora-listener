# Release Notes / Заметки к релизу v1.2.2

## Русский текст релиза (для копирования)

Nora Listener v1.2.2: Обновление DSP 2.1 — чистое распознавание без искажений и перегруза

В этом обновлении мы полностью переработали тракт цифровой обработки звука (DSP 2.1), чтобы устранить искажение и "кашу" в словах преподавателя, когда вы сидите на первых партах аудитории или записываете лекцию на встроенные микрофоны ноутбука.

Ключевые изменения:

1. Профили дистанции до преподавателя:
- Прямо на главной панели управления (справа от выбора режима точности) добавлен селектор расстояния: «Близко (1-3 м)», «Средне (3-7 м)» и «Далеко (7+ м)».
- Режим «Близко (1-3 м)»: создан специально для первых парт перед преподавателем. Агрессивный компрессор и искусственный гейн полностью отключаются. Применяется бережная пиковая нормализация до -3 dBFS (0.707 max) с фильтром среза гула 100 Гц. Речь преподавателя остается естественной, разборчивой и без клиппинга.
- Режим «Средне (3-7 м)»: сбалансированная динамическая компрессия для стандартных учебных аудиторий (+15.5 дБ).
- Режим «Далеко (7+ м)»: мощный подъем тихого голоса (+23 дБ) для больших залов и амфитеатров при записи с дальних рядов.

2. Устранение повторной обработки (Single-Pass):
- Исправлена критическая проблема двойного сжатия аудиопотока: ранее звук компрессировался при сохранении записи, а затем повторно сжимался перед отправкой в декодер Whisper, превращая громкие слоги в искаженный меандр. В версии 1.2.2 нормализация выполняется строго один раз.

3. Защита от противофазы микрофонов ноутбука (Anti-Phase Protection):
- Вместо слепого суммирования стереоканалов (L + R) / 2, вызывавшего фазовую гребенчатую нейтрализацию речевых частот (1.5 - 4 кГц), алгоритм извлекает первичный физический капсюль микрофона (Channel 0). Тембр голоса восстанавливает кристальную четкость без эффекта «бочки» и «трубы».

4. Антиалиасинговая фильтрация при ресэмплинге:
- Реализован каскадный фильтр Баттерворта 4-го порядка на 7200 Гц со спадом -24 дБ/октава в сочетании с 4-точечной кубической интерполяцией Эрмита. Это исключает зеркальные наложения ультразвуковых частот при конвертации 48/44.1 кГц в целевые 16 кГц Whisper.

5. Нейтральный академический промпт:
- Системный промпт декодера Whisper обновлен до универсального академического контекста, что предотвращает искажения терминов при распознавании лекций по информатике, ИИ, биологии, праву и другим дисциплинам.

---

## English Release Notes (Copy-Pasteable)

Nora Listener v1.2.2: DSP 2.1 Audio Architecture — Distortion-Free Speech Recognition

This release brings a complete overhaul of the digital signal processing pipeline (DSP 2.1), solving word distortion, speech garbling, and saturation issues when sitting close to the lecturer or recording with built-in laptop microphone arrays.

Key Improvements:

1. Distance to Lecturer Profiles:
- A new dedicated distance selector is now available on the main toolbar directly next to the accuracy/speed buttons: "Close (1-3 m)", "Medium (3-7 m)", and "Far (7+ m)".
- "Close (1-3 m)" mode: Engineered for front-row students sitting right before the instructor. Disables aggressive compressor makeup gain and applies gentle peak normalization to -3 dBFS (0.707 max) with a 100 Hz low-cut filter. The lecturer's voice retains natural dynamics, pristine clarity, and zero clipping distortion.
- "Medium (3-7 m)" mode: Balanced adaptive dynamic compression (+15.5 dB) targeted at standard classroom environments.
- "Far (7+ m)" mode: High speech gain boost (+23 dB) for large amphitheaters and auditoriums when capturing speech from back rows.

2. Elimination of Double-Processing Bug:
- Resolved a critical audio pipeline issue where recordings were processed by the AGC compressor twice (once upon saving, and again during cloud/local Whisper ingestion), which previously flattened speech into a distorted clipped waveform. Audio is now normalized exactly once.

3. Laptop Microphone Anti-Phase Protection:
- Rather than naive destructive averaging of stereo channels (L + R) / 2, which caused severe comb-filter phase cancellation across the 1.5 - 4 kHz speech formant band on dual-capsule laptop arrays, Nora Listener now isolates the discrete primary physical microphone capsule (Channel 0). Voice timbre immediately regains full clarity.

4. Steep Anti-Aliasing Resampling:
- Integrated a 4th-order cascaded Butterworth low-pass filter at 7200 Hz with -24 dB/octave attenuation paired with 4-point cubic Hermite spline interpolation ($C^1$ continuity). This eliminates mirror frequency foldover when downsampling 48 kHz or 44.1 kHz input streams to 16 kHz.

5. Neutral Academic Seeding Prompt:
- Replaced the subject-specific mathematical prompt with a neutral academic lecture prompt, ensuring pristine term recognition across computer science, AI, natural sciences, humanities, and engineering.
