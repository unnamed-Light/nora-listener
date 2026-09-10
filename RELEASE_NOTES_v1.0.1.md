# Nora Listener v1.0.1

### Release Name: `v1.0.1: Context Ingestion, Prompt Editor, and UI Refinements`

---

## Что нового в версии 1.0.1 (Russian)

Версия **1.0.1** расширяет аналитические возможности Норы: теперь приложение умеет сопоставлять устную речь преподавателя с презентациями, студенческими конспектами и методичками, восстанавливать визуально опущенные формулы и обеспечивать максимальную точность академического конспекта.

### 1. Модуль «Контекст занятия» (Context Ingestion Engine)
- **Прикрепление учебных материалов**: Над панелью вкладок добавлен сворачиваемый блок для загрузки слайдов (`.pptx`, `.pdf`), заметок и конспектов (`.docx`, `.txt`, `.md`), а также учебной литературы.
- **Локальный разбор OpenXML и PDF**: Обработка документов выполняется прямо в памяти браузера с помощью `jszip` — без передачи файлов на внешние серверы и без установленного Microsoft Office.
- **Двухпоточный академический синтез (Dual-Source Academic Synthesis)**:
  - Аудиозапись лекции является хронологической основой конспекта.
  - Терминология, имена ученых и сложные понятия верифицируются по слайдам.
  - Формулы, на которые лектор ссылается устно (*«как видно из формулы на экране»*), извлекаются из слайда и включаются в конспект в синтаксисе LaTeX с пометкой `[Из материалов лекции / слайдов]`.

### 2. Редактор системного промпта Норы
- В окне настроек появилась вкладка **«Промпт Норы»**.
- Возможность кастомизировать базовые правила составления конспекта под специфику любого факультета (IT, физика, математика, гуманитарные науки).
- Индикатор объема символов и кнопка мгновенного отката к эталонному академическому промпту («Сбросить к базовому»).

### 3. Доработка интерфейса и удобства использования (UI/UX)
- **Переключатель точности рядом с кнопкой «Расшифровать»**: Выбор модели (`Whisper Large v3` / `Turbo`) перемещен в основной блок управления и доступен во всех режимах.
- **Селективный экспорт в сплит-окне**: В режиме двух окон кнопки экспорта (Word, PDF, Markdown) открывают выпадающее меню при наведении или клике:
  - *Только конспект*;
  - *Только транскрипт*;
  - *Объединенный файл (Конспект + Транскрипт)*.
- **Чистый сплит-интерфейс**: Кнопки переключения «Предпросмотр» и «Редактор» оставлены исключительно внутри шапки правого окна конспекта.
- **Полнострочный Drag-and-Drop в папках**: Удалены иконки со стрелками — перетаскивание лекций и папок работает захватом всей строки (`cursor: grab`).
- **Адаптивные настройки со скроллингом**: Окно настроек получило гибкую вертикальную прокрутку (`maxHeight: 82vh`, `overflowY: auto`), а кнопка «Готово» надежно зафиксирована внизу.

---

## What's Changed in v1.0.1 (English)

Version **1.0.1** introduces multi-source context verification, enabling Nora to align spoken audio lectures with lecture slides, student notes, and literature to synthesize complete academic lecture notes with LaTeX math support.

### 1. Lecture Context Ingestion Engine
- **Material Attachment**: Collapsible panel above workspace tabs for attaching slides (`.pptx`, `.pdf`), notes (`.docx`, `.txt`, `.md`), and course literature.
- **Client-Side OpenXML & PDF Parsing**: In-memory document text extraction via `jszip` without third-party services or Microsoft Office installation.
- **Dual-Source Academic Synthesis**:
  - Spoken audio transcript remains the chronological anchor.
  - Scientific terms and definitions are cross-verified against official slide text.
  - Visual formulas mentioned verbally without vocalization are retrieved from slides in LaTeX syntax with the marker `[From lecture slides / materials]`.

### 2. Nora System Prompt Editor
- Dedicated **Nora's Prompt** tab in Application Settings.
- Custom system prompt editing with real-time character count and one-click reset to the canonical academic prompt.

### 3. Interface & Workflow Refinements
- **Unified Recognition Controls**: Accuracy toggle relocated directly next to the "Transcribe" button across all views.
- **Selective Split-View Export Dropdowns**: Contextual hover menu for Word, PDF, and Markdown export (*Notes only*, *Transcript only*, or *Combined document*).
- **Clean Split View**: Preview/Editor toggles restricted to the right note pane header.
- **Full-Row Drag-and-Drop**: Eliminated redundant arrow icons in the folder tree in favor of full-row grab.
- **Adaptive Scrollable Settings Modal**: Responsive modal sizing (`maxHeight: 82vh`, `overflowY: auto`) with a pinned "Done" footer.

---

## Downloads & Checksums (Windows x64)

| File | Type | Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| `nora-listener_1.0.1_x64-setup.exe` | NSIS Installer | 72.78 MB | `5db77c028d50d0163c4cda1da0ef7787c80664948de8011997065ad0267ac578` |
| `nora-listener-1.0.1-standalone.exe` | Standalone Binary | 21.74 MB | `b823184d3573cfad7af8eeeb499eb13a1e156cd8acc7fdc07adf0ea06eff1a78` |
| `nora-listener-1.0.1-portable.zip` | Portable ZIP | 8.01 MB | `cf029386ae619a89d15825e2335a778800de3d617a63e738baa0545e9ea7c123` |
