# Nora Listener v1.2.1 - Release Notes / Заметки о релизе

[English](#english) | [Русский](#russian)

---

<a name="russian"></a>
## Русский (RU)

### Nora Listener v1.2.1: Адаптивная геометрия рабочей области и вертикальный скроллинг главного окна

Релиз **v1.2.1** устраняет проблему сжатия области текста и конспекта при открытии нескольких функциональных панелей на экранах с невысоким разрешением или масштабным коэффициентом Windows. Теперь главное окно приложения поддерживает полноценную вертикальную прокрутку, а текстовая область гарантированно сохраняет комфортный размер для чтения и редактирования.

---

### Ключевые изменения и улучшения

#### 1. Устранение сжатия рабочей области (Viewport Clamping)
- **Проблема**: В предыдущих версиях при одновременном открытии карточек аудиозаписи, панели контекстных файлов (`ContextPanel`), уточняющего промпта (`ClarifyingPromptPanel`), тулбара поиска и панели обнаруженных спикеров суммарная высота элементов управления достигала ~500 px. Из-за отсутствия вертикального скроллинга страницы flexbox сжимал текстовое поле транскрипта и конспекта до узкой полоски в 50-100 px.
- **Решение**: Для контейнера рабочей области (`textareaContainer`) зафиксировано адаптивное ограничение `minHeight: clamp(420px, 52vh, 850px)` и `flexShrink: 0`. Вложенные компоненты (`textareaWrapper`, `markdownPreview`, сплит-панели) получили жесткие минимальные высоты от 380 до 440 px. Поле редактирования и чтения текста больше никогда не сжимается до нечитаемого состояния.

#### 2. Полноценный вертикальный скроллинг главного окна
- Для центральной рабочей области (`mainContent`) включен непрерывный вертикальный скроллинг (`overflowY: 'auto'`).
- Если суммарная высота открытых панелей и области текста превышает высоту окна приложения, плавно прокручивается вся страница.
- Добавлены кастомные скроллбары в стиле Fluent UI (`colorNeutralStroke2`), гармонично сочетающиеся со светлой и темной темами оформления.

#### 3. Фиксация панели действий и вкладок (Sticky Action Bar)
- Блок переключения вкладок («Полный транскрипт», «Умный конспект», «Два окна») и быстрых действий («Сделать умный конспект», меню «Экспорт») переведен в режим `position: sticky; top: 0; zIndex: 10`.
- При прокрутке длинного списка параметров и панелей вниз панель действий остается зафиксированной в верхней части экрана, обеспечивая мгновенный доступ к переключению вкладок и экспорту без лишних движений колесиком мыши.

#### 4. Обновление версионирования
- Версия приложения повышена до **1.2.1** во всех системных манифестах (`package.json`, `Cargo.toml`, `tauri.conf.json`), модуле проверки обновлений и окне «Настройки».

---

### Файлы релиза

1. `Nora_Listener_Setup_1.2.1.exe` - официальный установщик Windows NSIS (автоматическая установка, ярлыки, деинсталлятор).
2. `Nora_Listener_1.2.1_x64.exe` - автономный портативный исполняемый файл без необходимости установки.
3. `Nora_Listener_1.2.1_Portable.zip` - портативный архив с бинарником и сопутствующими библиотеками.
4. `SHA256SUMS.txt` - контрольные суммы файлов для верификации целостности.

---

<a name="english"></a>
## English (EN)

### Nora Listener v1.2.1: Adaptive Workspace Geometry and Scrollable Main Window

Release **v1.2.1** resolves the workspace layout compression issue that occurred when multiple functional panels were opened simultaneously on displays with standard resolutions or Windows display scaling enabled. The main canvas now features uninhibited vertical scrolling, and the document workspace is strictly guaranteed to maintain comfortable height and readability.

---

### Key Changes and Improvements

#### 1. Resolution of Workspace Compression (Viewport Clamping)
- **Problem**: In earlier versions, opening audio cards, the context document panel (`ContextPanel`), the clarifying prompt drawer (`ClarifyingPromptPanel`), the search toolbar, and speaker diarization badges simultaneously caused top controls to occupy ~500 px. Because the main window lacked full vertical scrolling, flexbox compressed the transcript and smart notes editor down to a 50-100 px slit.
- **Resolution**: The editor canvas (`textareaContainer`) now enforces a responsive constraint: `minHeight: clamp(420px, 52vh, 850px)` with `flexShrink: 0`. Subcomponents (`textareaWrapper`, `markdownPreview`, and split panes) enforce strict minimum heights of 380 px to 440 px. The text area is permanently protected from shrinking below comfortable readability.

#### 2. Seamless Main Window Vertical Scrolling
- The primary content canvas (`mainContent`) now incorporates full vertical scrolling (`overflowY: 'auto'`).
- Whenever the combined vertical footprint of active feature panels and the text editor exceeds the available viewport height, the entire page scrolls smoothly.
- Custom Fluent UI scrollbar styling (`colorNeutralStroke2`) provides a polished look in both Light and Dark themes.

#### 3. Sticky Action and Navigation Bar
- The tab bar (Full Transcript, Smart Notes, Split View) and core actions (Make Smart Notes, Export menus) now utilize `position: sticky; top: 0; zIndex: 10`.
- As the user scrolls down through feature panels, the action bar stays securely pinned at the top of the canvas, ensuring instant access to note generation and document export without having to scroll back to the top.

#### 4. Versioning and Diagnostics
- Bumped application version to **1.2.1** across all project configurations (`package.json`, `Cargo.toml`, `tauri.conf.json`), the startup update checker, and the Settings modal.

---

### Release Assets

1. `Nora_Listener_Setup_1.2.1.exe` - Official Windows NSIS installer (automated installation, desktop and start menu shortcuts, uninstaller).
2. `Nora_Listener_1.2.1_x64.exe` - Standalone portable binary requiring no installation.
3. `Nora_Listener_1.2.1_Portable.zip` - Complete portable archive.
4. `SHA256SUMS.txt` - SHA-256 checksums for cryptographic asset verification.
