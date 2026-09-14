# Релиз Nora Listener v1.0.2: Персональные указания к конспекту и управление фокусом Норы

[English](#nora-listener-v102-release-notes-english) | [Русский](#nora-listener-v102-release-notes-russian)

---

<a name="nora-listener-v102-release-notes-russian"></a>
## Nora Listener v1.0.2 — Описание релиза (Русский)

Версия 1.0.2 представляет ключевое расширение аналитических возможностей Nora Listener — блок **«Пожелания к конспекту (уточняющий контекст для Норы)»**. Теперь студенты и исследователи могут напрямую направлять внимание искусственного интеллекта, задавая точные приоритеты, желаемую глубину раскрытия разделов и акценты для подготовки к коллоквиумам и экзаменам.

---

### Главные нововведения версии 1.0.2

#### 1. Поле ввода уточняющего контекста и пожеланий к конспекту
- **Интуитивное расположение**: Карточка ввода размещена непосредственно под блоком «Контекст занятия» и над панелью рабочих вкладок, органично вписываясь в единый конвейер подготовки материалов.
- **Персональное направление фокуса**: В поле можно указать любые специфические требования к конспекту:
  - подробнее раскрыть конкретную теорему с полным математическим доказательством;
  - сделать особый упор на вопросах к коллоквиуму или экзамену;
  - сопроводить алгоритмы практическими примерами кода на нужном языке программирования (Python, C++, Rust);
  - адаптировать стиль изложения под индивидуальное восприятие.
- **Индикация и эргономика**: Компонент отображает количество введенных символов (с ограничением до 2000 знаков), содержит подсказки с готовыми примерами формулировок и кнопку быстрой очистки поля в один клик.

#### 2. Сессионная изоляция и привязка к лекциям
- **Сохранение в рамках сессии**: Введенные пожелания сохраняются на протяжении всей текущей сессии работы с лекцией.
- **Привязка к истории**: Пожелания надежно сохраняются в локальном хранилище `historyStore` вместе с транскриптом и конспектом. При переключении между различными лекциями в боковом дереве папок пожелания для каждой записи автоматически восстанавливаются.
- **Сброс по кнопке «Новая сессия»**: При нажатии кнопки «Новая сессия» поле пожеланий очищается вместе с остальными временными параметрами, подготавливая чистую рабочую среду для следующего занятия.

#### 3. Сквозной конвейер инъекции в системный промпт
- Текст пожеланий передается через типизированную цепочку вызовов: React UI -> `summarizer.ts` -> нативная команда Tauri `generate_summary` (Rust) -> модуль `cloud_api::summarize_text`.
- В промпт языковой модели Groq внедряется строгий директивный блок:
  ```text
  ОСОБЫЕ ПОЖЕЛАНИЯ И УТОЧНЯЮЩИЕ УКАЗАНИЯ ПОЛЬЗОВАТЕЛЯ К ЭТОМУ КОНСПЕКТУ:
  [текст пожеланий пользователя]
  Обязательно учти эти пожелания при раскрытии тем, расстановке акцентов и глубине изложения материала.
  ```
- Модель расставляет акценты в строгом соответствии с запросом пользователя, гарантируя сохранение эталонной 5-секционной академической структуры (§§ 1–5), математических формул в KaTeX и запрета на эмодзи.

#### 4. Обновление встроенного руководства и архитектурной документации
- **Руководство пользователя (`UserGuideModal.tsx`)**:
  - В шагах быстрого старта (Глава 1) добавлено упоминание прикрепления контекста и ввода персональных пожеланий.
  - В Главе 5 («Умный конспект и KaTeX») подробно расписаны правила использования контекстных материалов и сценарии составления эффективных уточняющих указаний.
- **Архитектурная документация (`ARCHITECTURE.md` и `ARCHITECTURE_EN.md`)**:
  - Добавлен раздел **5.5. Пользовательский направляющий контекст (Clarifying Prompt Engine)** с детальным описанием сессионной изоляции, IPC-конвейера и шаблона сборки промпта.

---

### Варианты загрузки и контрольные суммы (SHA-256)

| Файл | Описание | Размер | SHA-256 |
|---|---|---|---|
| Файл | Описание | Размер | SHA-256 |
|---|---|---|---|
| `nora-listener_1.0.2_x64-setup.exe` | Установщик Windows (NSIS, 64-bit) | 72.87 МБ | `db1384c1ed2fb0452030408486ebfb83d2449497ab335fdab6fc4a0157b1a738` |
| `nora-listener-1.0.2-standalone.exe` | Автономный исполняемый файл (не требует установки) | 22.18 МБ | `ffb13aca1b1cbf6d7094f4222964f172ad4dcfc43913136e244f11e30115fac4` |
| `nora-listener-1.0.2-portable.zip` | Портативная версия (распакуй и запусти) | 8.12 МБ | `62f7c70c9fd94bbb68ab7398ff8446849a6f02dd6c3f931fed4d915f8fb21f82` |

---

<a name="nora-listener-v102-release-notes-english"></a>
## Nora Listener v1.0.2 — Release Notes (English)

Version 1.0.2 introduces a major enhancement to Nora Listener's analytical pipeline: the **«Notes Preferences (Clarifying Context for Nora)»** panel. Students, professors, and researchers can now actively direct the AI's pedagogical focus, dictating specific points of emphasis, theoretical depth, and exam preparation priorities.

---

### Highlights in Version 1.0.2

#### 1. Clarifying Context and Preferences Input Panel
- **Seamless Placement**: Positioned directly beneath the «Lecture Context» panel and above the workspace tabs, integrating cleanly into the study material preparation flow.
- **Targeted AI Steering**: Direct Nora to tailor the summary to your exact study goals:
  - Deepen theoretical explanations and include full proofs for chosen theorems;
  - Focus intensively on anticipated midterm or exam questions;
  - Supplement algorithmic concepts with clean code examples in your preferred language (Python, C++, Rust);
  - Fine-tune pedagogical style and depth.
- **Ergonomics & Character Counter**: Displays dynamic character counts (up to 2,000 characters), clear example placeholders, and an instant one-click clear button.

#### 2. Session-Scoped Isolation and History Binding
- **Session Persistence**: Entered preferences remain active throughout your ongoing work with a lecture.
- **Bound to History Records**: Preferences are stored in the local `historyStore` database alongside raw transcripts and smart notes. Switching between lectures in the sidebar restores corresponding preferences per item.
- **Reset on New Session**: Clicking «New Session» clears the clarifying prompt field alongside active audio and transcript states.

#### 3. End-to-End System Prompt Assembly
- Preferences pass across typed architectural layers: React UI -> `summarizer.ts` -> Tauri native Rust command `generate_summary` -> `cloud_api::summarize_text` -> Groq Cloud LPU.
- A high-priority steering directive is injected directly into Nora's prompt:
  ```text
  ОСОБЫЕ ПОЖЕЛАНИЯ И УТОЧНЯЮЩИЕ УКАЗАНИЯ ПОЛЬЗОВАТЕЛЯ К ЭТОМУ КОНСПЕКТУ:
  [user instructions]
  Обязательно учти эти пожелания при раскрытии тем, расстановке акцентов и глубине изложения материала.
  ```
- The LLM honors user steering while strictly upholding the canonical 5-section academic layout (§§ 1–5), rigorous KaTeX mathematics, and zero-emoji styling.

#### 4. In-App User Guide and Architecture Documentation
- **User Guide (`UserGuideModal.tsx`)**:
  - Quick Start (Chapter 1) updated with context attachment and steering workflows.
  - Smart Notes (Chapter 5) expanded with dedicated guidance on using lecture materials and custom prompts.
- **Architecture Documentation (`ARCHITECTURE.md` & `ARCHITECTURE_EN.md`)**:
  - Added Section **5.5. User Steering Preferences (Clarifying Prompt Engine)** detailing session isolation, IPC flows, and prompt construction.

---

### Downloads and SHA-256 Checksums

| File | Type | Approx Size | SHA-256 |
|---|---|---|---|
| File | Type | Approx Size | SHA-256 |
|---|---|---|---|
| `nora-listener_1.0.2_x64-setup.exe` | Windows Installer (NSIS, 64-bit) | 72.87 MB | `db1384c1ed2fb0452030408486ebfb83d2449497ab335fdab6fc4a0157b1a738` |
| `nora-listener-1.0.2-standalone.exe` | Standalone Portable Executable | 22.18 MB | `ffb13aca1b1cbf6d7094f4222964f172ad4dcfc43913136e244f11e30115fac4` |
| `nora-listener-1.0.2-portable.zip` | Portable Archive (Extract & Run) | 8.12 MB | `62f7c70c9fd94bbb68ab7398ff8446849a6f02dd6c3f931fed4d915f8fb21f82` |
