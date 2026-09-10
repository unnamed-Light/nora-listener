import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import DOMPurify from 'dompurify';
import {
  makeStyles, shorthands, Button, ToggleButton, ProgressBar, tokens,
  Title2, Subtitle2, Body1, Body1Strong, Divider, Select,
  TabList, Tab, Switch, Input, Spinner, Badge,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItem
} from '@fluentui/react-components';
import {
  DocumentArrowUp24Regular, Play24Regular, Sparkle24Regular, Sparkle20Regular,
  ArrowDownload24Regular, DismissRegular,
  Eye20Regular, Edit20Regular, DocumentBulletList20Regular, Save24Regular, CheckmarkRegular,
  Mic24Regular, Stop24Regular, Mic20Regular, People20Regular, PeopleSettings20Regular,
  Search20Regular, ChevronUp16Regular, ChevronDown16Regular, Dismiss16Regular,
  TextQuote20Regular, TextQuote20Filled, BookQuestionMark24Regular, Settings24Regular,
  WeatherSunny24Regular, WeatherMoon24Regular, LockClosed16Regular, DocumentMultiple20Regular,
  ChevronUp20Regular, ChevronDown20Regular
} from '@fluentui/react-icons';
import { useHistory } from './store/historyStore';
import { useAppStore } from './store/appStore';
import { exportToDocx, exportToPdf, exportToMarkdown } from './lib/exporter';
import { selectAudioFile } from './lib/fileDialog';
import { generateSummary } from './lib/summarizer';
import { FolderTree } from './components/FolderTree';
import { AudioVisualizer } from './components/AudioVisualizer';
import { FastTextarea } from './components/FastTextarea';
import { sanitizeEmojis } from './lib/cleanEmoji';
import { highlightHtmlMatches, countMatches, escapeRegex } from './lib/searchUtils';
import { renderMarkdownWithMath } from './lib/mathRenderer';
import { UserGuideModal } from './components/UserGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { ContextPanel } from './components/ContextPanel';
import { formatContextForPrompt } from './lib/contextExtractor';
import type { ContextItem } from './lib/contextExtractor';

interface NativeAudioDevice {
  id: string;
  name: string;
  is_default: boolean;
}

const useStyles = makeStyles({
  pageWrapper: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    width: '100%', 
    maxWidth: '100%', 
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex', 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    ...shorthands.padding('10px', '20px'), 
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, 
    ...shorthands.gap('16px'),
    flexShrink: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },
  container: { 
    display: 'flex', 
    flexGrow: 1, 
    flexShrink: 1,
    minHeight: 0, 
    minWidth: 0,
    height: 'calc(100vh - 53px)', 
    width: '100%',
    maxWidth: '100%',
    backgroundColor: tokens.colorNeutralBackground2, 
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  sidebar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`, 
    ...shorthands.padding('12px'),
    display: 'flex', 
    flexDirection: 'column', 
    ...shorthands.gap('12px'),
    height: '100%', 
    boxSizing: 'border-box', 
    flexShrink: 0, 
    overflow: 'hidden',
  },
  sidebarResizer: {
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
    zIndex: 10,
    position: 'relative',
    '&:hover': {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  splitPaneResizer: {
    width: '8px',
    cursor: 'col-resize',
    backgroundColor: tokens.colorNeutralStroke2,
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
    borderRadius: '4px',
    margin: '0 4px',
    zIndex: 10,
    position: 'relative',
    '&:hover': {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  resizerActive: {
    backgroundColor: tokens.colorBrandBackgroundStatic,
  },
  splitContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    height: '100%',
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  splitPane: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    minWidth: '160px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px 8px 8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: '6px',
    flexShrink: 0,
  },
  historyList: { display: 'flex', flexDirection: 'column', ...shorthands.gap('10px'), overflowY: 'auto', flexGrow: 1, paddingRight: '4px' },
  historyItem: { cursor: 'pointer', '&:hover': { backgroundColor: tokens.colorNeutralBackground1Hover } },
  mainContent: {
    flexGrow: 1, 
    flexShrink: 1,
    height: '100%', 
    minHeight: 0, 
    minWidth: 0,
    maxWidth: '100%',
    ...shorthands.padding('14px', '20px'), 
    display: 'flex', 
    flexDirection: 'column',
    ...shorthands.gap('12px'), 
    backgroundColor: tokens.colorNeutralBackground3,
    boxSizing: 'border-box', 
    overflowY: 'auto', 
    overflowX: 'hidden',
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    ...shorthands.gap('12px'),
    flexShrink: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  dropzone: {
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...shorthands.padding('16px', '14px'), 
    ...shorthands.border('2px', 'dashed', tokens.colorBrandStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge), 
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer', 
    transition: 'all 0.2s ease', 
    flexShrink: 1, 
    minHeight: '100px', 
    boxSizing: 'border-box',
    textAlign: 'center',
    overflow: 'hidden',
    '&:hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  recordCard: {
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...shorthands.padding('16px', '14px'), 
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge), 
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer', 
    transition: 'all 0.2s ease', 
    flexShrink: 1, 
    minHeight: '100px', 
    boxSizing: 'border-box',
    textAlign: 'center',
    overflow: 'hidden',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.borderColor(tokens.colorPaletteRedBorderActive),
    },
  },
  recordCardActive: {
    ...shorthands.border('2px', 'solid', tokens.colorPaletteRedBorderActive),
    backgroundColor: tokens.colorPaletteRedBackground1,
    boxShadow: `0 0 12px ${tokens.colorPaletteRedBackground2}`,
  },
  dropzoneCompact: {
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '14px'), 
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium), 
    flexShrink: 1,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  recordCompact: {
    display: 'flex', 
    alignItems: 'center', 
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '12px'), 
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium), 
    flexShrink: 1,
    minWidth: 0, 
    maxWidth: '100%',
    flexWrap: 'wrap',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  dropzoneActive: { backgroundColor: tokens.colorBrandBackground2 },
  dropzoneIcon: { color: tokens.colorBrandForeground1, marginBottom: '4px' },
  controls: { 
    display: 'flex', 
    alignItems: 'center', 
    ...shorthands.gap('10px'), 
    flexWrap: 'wrap', 
    flexShrink: 0,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  apiKeyInput: { flex: '1 1 160px', minWidth: '120px', maxWidth: '300px' },
  progressContainer: { flexGrow: 1, display: 'flex', flexDirection: 'column', ...shorthands.gap('4px'), minWidth: '120px' },
  tabRow: {
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    flexShrink: 0, 
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ...shorthands.padding('0', '0', '6px', '0'),
    flexWrap: 'wrap',
    rowGap: '8px',
    columnGap: '8px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  tabActions: { 
    display: 'flex', 
    alignItems: 'center', 
    ...shorthands.gap('6px'), 
    flexWrap: 'wrap',
    minWidth: 0,
    maxWidth: '100%',
  },
  textareaContainer: {
    display: 'flex', 
    flexDirection: 'column', 
    flexGrow: 1, 
    height: '100%', 
    minHeight: 0,
    minWidth: 0,
    maxWidth: '100%',
    ...shorthands.gap('8px'), 
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  textareaWrapper: {
    flexGrow: 1, 
    height: '100%', 
    minHeight: 0, 
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex', 
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflow: 'hidden',
    '& .fui-Textarea': {
      flexGrow: 1, height: '100%', minHeight: 0, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    },
    '& textarea': {
      flexGrow: 1, height: '100% !important', minHeight: '100% !important', maxHeight: 'none !important',
      resize: 'none', boxSizing: 'border-box',
      fontFamily: 'Consolas, "Cascadia Code", "Segoe UI", sans-serif',
      fontSize: '14px', lineHeight: '1.6', padding: '12px 14px',
    },
  },
  markdownPreview: {
    flexGrow: 1, height: '100%', minHeight: 0, overflowY: 'auto',
    ...shorthands.padding('20px', '28px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.7',
    fontSize: '14px',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    boxSizing: 'border-box',
    '& h1': {
      fontSize: '22px',
      fontWeight: '600',
      marginTop: '0',
      marginBottom: '14px',
      borderBottom: `2px solid ${tokens.colorBrandStroke1}`,
      paddingBottom: '8px',
      color: tokens.colorBrandForeground1,
    },
    '& h2': {
      fontSize: '17px',
      fontWeight: '600',
      marginTop: '20px',
      marginBottom: '10px',
      borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
      paddingBottom: '4px',
      color: tokens.colorNeutralForeground1,
    },
    '& h3': {
      fontSize: '15px',
      fontWeight: '600',
      marginTop: '16px',
      marginBottom: '8px',
      color: tokens.colorNeutralForeground1,
    },
    '& p': {
      marginTop: '0',
      marginBottom: '12px',
    },
    '& ul, & ol': {
      marginTop: '4px',
      marginBottom: '12px',
      paddingLeft: '24px',
    },
    '& li': {
      marginBottom: '6px',
    },
    '& blockquote': {
      margin: '12px 0',
      padding: '8px 16px',
      borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorNeutralBackground2,
      borderRadius: tokens.borderRadiusSmall,
      fontStyle: 'italic',
    },
    '& code': {
      fontFamily: 'Consolas, "Cascadia Code", monospace',
      fontSize: '13px',
      backgroundColor: tokens.colorNeutralBackground3,
      padding: '2px 6px',
      borderRadius: tokens.borderRadiusSmall,
    },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground3,
      padding: '12px',
      borderRadius: tokens.borderRadiusMedium,
      overflowX: 'auto',
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      margin: '12px 0',
    },
    '& th, & td': {
      border: `1px solid ${tokens.colorNeutralStroke1}`,
      padding: '8px 12px',
      textAlign: 'left',
    },
    '& th': {
      backgroundColor: tokens.colorNeutralBackground2,
      fontWeight: '600',
    },
    '& hr': {
      border: 'none',
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
      margin: '20px 0',
    },
    '& strong': {
      fontWeight: '600',
      color: tokens.colorBrandForeground1,
    },
  },
  settingsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
});

const translations = {
  ru: {
    title: 'Nora Listener', history: 'История лекций', dropHere: 'Перетащите аудио/видео файл сюда',
    orClick: 'или нажмите для выбора файла', transcribeBtn: 'Расшифровать', transcribing: 'Расшифровка...',
    emptyHistory: 'История пуста', placeholderTranscript: 'Здесь появится расшифрованный текст лекции...',
    placeholderSummary: 'Нажмите «Сделать умный конспект», чтобы составить структурированный Markdown-конспект лекции...',
    exportWord: 'Word (.docx)', exportPdf: 'PDF (.pdf)', exportMd: 'Сохранить .md', language: 'Язык интерфейса',
    newSession: 'Новая сессия', smartNotes: 'Сделать умный конспект', summarizing: 'Создание конспекта...',
    themeLight: 'Светлая тема', themeDark: 'Темная тема', aiOnline: 'ИИ: Онлайн', aiOffline: 'ИИ: Оффлайн',
    tabTranscript: 'Полный транскрипт', tabSummary: 'Умный конспект (.md)', changeFile: 'Сменить файл',
    fileSelected: 'Выбран файл:',
    viewPreview: 'Предпросмотр', viewEdit: 'Редактор',
    placeholderPreviewEmpty: 'Конспект ещё не сформирован. Нажмите «Сделать умный конспект» для создания.',
    recordMic: 'Запись с микрофона',
    recordClickToStart: 'Нажмите для живой записи лекции',
    recordInProgress: 'Идёт запись с микрофона...',
    recordStop: 'Остановить запись',
    recordNew: 'Записать с микрофона',
    defaultMic: 'Микрофон по умолчанию',
    micNoticeSilence: 'Внимание: На микрофон не поступил звук (тишина). Пожалуйста, выберите другой микрофон в списке или проверьте настройки звука Windows.',
    diarization: 'Разделение спикеров',
    diarizationTooltip: 'Определять смену говорящих и размечать реплики ([Спикер 1], [Спикер 2])',
    speakersDetected: 'Спикеры',
    renameSpeakers: 'Переименовать спикеров',
    renameSpeakersTitle: 'Переименование спикеров',
    renameSpeakersDesc: 'Замените автоматические обозначения спикеров на настоящие имена (например, «Преподаватель», «Студент»). Изменения применятся ко всему тексту.',
    apply: 'Применить',
    cancel: 'Отмена',
    showTeacherQuotes: 'Показывать цитаты преподавателя',
    showTeacherQuotesTooltip: 'Включать в конспект аутентичные грамматически исправленные цитаты лектора',
    exportSummaryOnly: 'Только конспект',
    exportTranscriptOnly: 'Только транскрипт',
    exportBoth: 'Объединенный файл (Конспект + Транскрипт)',
    accuracyMode: 'Повышенная точность',
    accuracyModeTooltip: 'Модель Whisper Large v3 (1.55 млрд параметров): максимальная академическая точность',
    speedMode: 'Повышенная скорость',
    speedModeTooltip: 'Модель Whisper Large v3 Turbo: молниеносная расшифровка',
    userGuide: 'Инструкция',
    userGuideTooltip: 'Открыть подробное иллюстрированное руководство пользователя',
    settings: 'Настройки',
    settingsTooltip: 'Настройки приложения (язык интерфейса, ключ Groq API)',
    tabSplit: 'Два окна (Сплит)',
    tabSplitTooltip: 'Показать транскрипт и умный конспект бок о бок с регулируемой границей',
    dragResizeSidebar: 'Потяните для изменения ширины боковой панели',
    dragResizeSplit: 'Потяните для изменения пропорций окон',
    collapseAudioPanel: 'Свернуть панель аудио',
    expandAudioPanel: 'Развернуть панель аудио',
    aiLockedTooltip: 'Режим «ИИ: Онлайн» зафиксирован: распознавание и конспектирование используют облачный процессор Groq LPU',
    aiLockedBadge: 'Зафиксировано',
  },
  en: {
    title: 'Nora Listener', history: 'Lecture History', dropHere: 'Drop audio/video file here',
    orClick: 'or click to browse file', transcribeBtn: 'Transcribe', transcribing: 'Transcribing...',
    emptyHistory: 'History is empty', placeholderTranscript: 'Transcription will appear here...',
    placeholderSummary: 'Click "Smart Notes" to generate structured markdown notes using AI...',
    exportWord: 'Word (.docx)', exportPdf: 'PDF (.pdf)', exportMd: 'Save .md', language: 'App Language',
    newSession: 'New Session', smartNotes: 'Smart Notes', summarizing: 'Generating notes...',
    themeLight: 'Light Theme', themeDark: 'Dark Theme', aiOnline: 'AI: Online', aiOffline: 'AI: Offline',
    tabTranscript: 'Full Transcript', tabSummary: 'Smart Notes (.md)', changeFile: 'Change file',
    fileSelected: 'Selected file:',
    viewPreview: 'Preview', viewEdit: 'Editor',
    placeholderPreviewEmpty: 'Summary not generated yet. Click "Smart Notes" to generate.',
    recordMic: 'Record from microphone',
    recordClickToStart: 'Click to record live lecture',
    recordInProgress: 'Recording from microphone...',
    recordStop: 'Stop recording',
    recordNew: 'Record from mic',
    defaultMic: 'Default Microphone',
    micNoticeSilence: 'Warning: No sound was detected by the microphone (silence). Please select another microphone from the list or check Windows sound settings.',
    diarization: 'Speaker Diarization',
    diarizationTooltip: 'Detect speaker turns and attribute speeches ([Speaker 1], [Speaker 2])',
    speakersDetected: 'Speakers',
    renameSpeakers: 'Rename Speakers',
    renameSpeakersTitle: 'Rename Speakers',
    renameSpeakersDesc: 'Replace automatic speaker labels with real names (e.g. "Professor", "Student"). Changes apply to all occurrences.',
    apply: 'Apply',
    cancel: 'Cancel',
    showTeacherQuotes: 'Show Lecturer Quotes',
    showTeacherQuotesTooltip: 'Include authentic, grammatically corrected quotes from the lecturer in notes',
    exportSummaryOnly: 'Notes only',
    exportTranscriptOnly: 'Transcript only',
    exportBoth: 'Combined file (Notes + Transcript)',
    accuracyMode: 'Higher Accuracy',
    accuracyModeTooltip: 'Whisper Large v3 (1.55B params): maximum academic accuracy',
    speedMode: 'Higher Speed',
    speedModeTooltip: 'Whisper Large v3 Turbo: accelerated transcription speed',
    userGuide: 'User Guide',
    userGuideTooltip: 'Open detailed illustrated user manual',
    settings: 'Settings',
    settingsTooltip: 'Application settings (interface language, Groq API key)',
    tabSplit: 'Split View',
    tabSplitTooltip: 'Show transcript and smart notes side-by-side with adjustable divider',
    dragResizeSidebar: 'Drag to resize sidebar width',
    dragResizeSplit: 'Drag to resize window panes',
    collapseAudioPanel: 'Collapse audio panel',
    expandAudioPanel: 'Expand audio panel',
    aiLockedTooltip: 'AI: Online mode is fixed: recognition and notes use cloud Groq LPU acceleration',
    aiLockedBadge: 'Locked',
  }
};

function App() {
  const styles = useStyles();
  const { addTranscription, updateTranscription } = useHistory();
  const {
    theme, language, apiKey, lastSaveDirectory, selectedMicrophoneId, enableDiarization, recognitionMode,
    sidebarWidth, splitViewRatio,
    toggleTheme, setLastSaveDirectory, setSelectedMicrophoneId, setEnableDiarization, setRecognitionMode,
    setSidebarWidth, setSplitViewRatio
  } = useAppStore();
  
  const t = translations[language];

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'split'>('transcript');
  const [summaryViewMode, setSummaryViewMode] = useState<'preview' | 'edit'>('preview');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showTeacherQuotes, setShowTeacherQuotes] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);

  // Layout resizing & collapse state
  const [isAudioPanelCollapsed, setIsAudioPanelCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSplitResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;
      setSplitViewRatio(percentage);
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Global search & in-document highlight state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speaker diarization & renaming state
  const [isRenameSpeakersOpen, setIsRenameSpeakersOpen] = useState(false);
  const [speakerNameMap, setSpeakerNameMap] = useState<Record<string, string>>({});

  // Non-blocking deferred values for heavy background computations
  const deferredTranscription = useDeferredValue(transcription);
  const deferredSummary = useDeferredValue(summary);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const detectedSpeakers = useMemo(() => {
    if (!deferredTranscription) return [];
    const matches = deferredTranscription.match(/\[([^\]]+)\](?=:?)/g);
    if (!matches) return [];
    const unique = Array.from(new Set(matches.map(m => m.slice(1, -1))));
    return unique.filter(name => !name.toLowerCase().includes('error') && !name.toLowerCase().includes('часть'));
  }, [deferredTranscription]);

  // Audio recording & microphone state (Native WASAPI)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [microphones, setMicrophones] = useState<NativeAudioDevice[]>([]);
  const recordTimerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadMics = async () => {
      try {
        const devices = await invoke<NativeAudioDevice[]>('list_native_audio_devices');
        if (!isMounted) return;
        setMicrophones(devices);
        if (devices.length > 0) {
          if (!selectedMicrophoneId || !devices.some(d => d.id === selectedMicrophoneId)) {
            const def = devices.find(d => d.is_default) || devices[0];
            setSelectedMicrophoneId(def.id);
          }
        }
      } catch (err) {
        console.error('Failed to list native audio devices:', err);
      }
    };
    loadMics();

    // Refresh mics on window focus and on gentle 20s interval
    window.addEventListener('focus', loadMics);
    const interval = setInterval(loadMics, 20000);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadMics);
      clearInterval(interval);
    };
  }, [selectedMicrophoneId, setSelectedMicrophoneId]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartRecording = async () => {
    try {
      await invoke('start_native_recording', { deviceId: selectedMicrophoneId || null });
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      const time = new Date().toLocaleTimeString();
      const currentMic = microphones.find(m => m.id === selectedMicrophoneId)?.name || 'По умолчанию';
      console.log(`[${time}] [Звукозапись] Запись началась (WASAPI). Микрофон: ${currentMic}`);
    } catch (e: any) {
      alert(`Не удалось запустить запись звука: ${e?.message || String(e)}`);
    }
  };

  const handleStopRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    const time = new Date().toLocaleTimeString();
    try {
      const savedPath = await invoke<string>('stop_native_recording');
      const filename = savedPath.split('\\').pop()?.split('/').pop() || 'Запись.wav';
      
      setSelectedFilePath(savedPath);
      setSelectedFileName(filename);
      console.log(`[${time}] [Звукозапись] Аудиозапись готова к расшифровке: ${filename}`);
    } catch (e: any) {
      console.error(`[${time}] [Ошибка записи] ${e?.message || String(e)}`);
      alert(`Ошибка остановки записи: ${e?.message || String(e)}`);
    }
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);


  // Active document matches count using deferred search
  const activeDocText = activeTab === 'summary' ? deferredSummary : activeTab === 'split' ? (deferredTranscription + '\n' + deferredSummary) : deferredTranscription;
  const totalDocMatches = useMemo(() => {
    if (!deferredSearchQuery.trim() || !activeDocText) return 0;
    return countMatches(activeDocText, deferredSearchQuery.trim());
  }, [activeDocText, deferredSearchQuery]);

  // Rendered Markdown preview cache: computed when actively viewing summary or split preview
  const renderedMarkdown = useMemo(() => {
    if ((activeTab !== 'summary' && activeTab !== 'split') || (activeTab === 'summary' && summaryViewMode !== 'preview') || !summary) return '';
    try {
      const cleanSummary = sanitizeEmojis(summary);
      let rawHtml = renderMarkdownWithMath(cleanSummary);
      if (deferredSearchQuery.trim()) {
        rawHtml = highlightHtmlMatches(rawHtml, deferredSearchQuery.trim());
      }
      return DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true, mathMl: true, svg: true },
        ADD_TAGS: ['mark'],
        ADD_ATTR: ['class', 'style', 'aria-hidden']
      });
    } catch {
      return sanitizeEmojis(summary);
    }
  }, [summary, deferredSearchQuery, activeTab, summaryViewMode]);

  const scrollToMatch = (targetIdx: number) => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    if (activeTab === 'transcript' || activeTab === 'split') {
      const textarea = textareaRef.current || (document.querySelector('textarea') as HTMLTextAreaElement | null);
      if (textarea && transcription) {
        const escaped = escapeRegex(q);
        const re = new RegExp(escaped, 'gi');
        let match;
        let current = 0;
        while ((match = re.exec(transcription)) !== null) {
          if (current === targetIdx) {
            textarea.focus();
            textarea.setSelectionRange(match.index, match.index + q.length);
            break;
          }
          current++;
        }
      }
    } else {
      const marks = document.querySelectorAll('mark.search-highlight');
      if (marks[targetIdx]) {
        marks[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleNextMatch = () => {
    if (totalDocMatches === 0) return;
    const nextIdx = (searchMatchIndex + 1) % totalDocMatches;
    setSearchMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (totalDocMatches === 0) return;
    const prevIdx = (searchMatchIndex - 1 + totalDocMatches) % totalDocMatches;
    setSearchMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  // Global listener for backend progress and status logs
  useEffect(() => {
    let unlistenLog: (() => void) | null = null;
    listen<string>('transcription-log', (event) => {
      console.log(`[transcription-log] ${event.payload}`);
    }).then(fn => { unlistenLog = fn; });

    return () => {
      if (unlistenLog) unlistenLog();
    };
  }, []);

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setSelectedFilePath(null);
    setSelectedFileName(null);
    setTranscription('');
    setSummary('');
    setContextItems([]);
    setProgress(0);
    setActiveTab('transcript');
    setSummaryViewMode('preview');
  };

  const triggerFileSelect = async () => {
    const path = await selectAudioFile();
    if (path) {
      setSelectedFilePath(path);
      const name = path.split('\\').pop()?.split('/').pop() || path;
      setSelectedFileName(name);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => { 
    e.preventDefault(); setIsDragging(false); 
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0] as any;
      if (file.path) setSelectedFilePath(file.path);
      setSelectedFileName(file.name);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFilePath) return;
    setIsTranscribing(true);
    setTranscription('');
    setSummary('');
    setProgress(0);
    setActiveTab('transcript');
    
    const startTime = new Date().toLocaleTimeString();
    console.log(`[${startTime}] [Старт] Расшифровка файла: ${selectedFileName || selectedFilePath}`);

    let fullText = '';

    // Only clean transcribed speech arrives here
    const unlistenText = await listen<string>('transcription-event', (event) => {
      setTranscription(prev => {
        const cleanChunk = event.payload.trim();
        if (!cleanChunk) return prev;
        const separator = prev ? (cleanChunk.startsWith('[') ? '\n\n' : ' ') : '';
        const newText = prev + separator + cleanChunk;
        fullText = newText;
        return newText;
      });
    });
    
    const unlistenProgress = await listen<number>('transcription-progress', (event) => {
      setProgress(event.payload / 100);
    });

    const unlistenDiarized = await listen<string>('transcription-diarized', (event) => {
      setTranscription(event.payload);
      fullText = event.payload;
    });

    try {
      await invoke('start_transcription', { path: selectedFilePath, model: recognitionMode, apiKey, enableDiarization });
      const sessionId = Date.now().toString();
      setCurrentSessionId(sessionId);
      addTranscription({
        id: sessionId,
        title: selectedFileName || 'Lecture',
        date: new Date().toLocaleDateString(),
        text: fullText,
        summary: '',
        status: 'completed',
        path: selectedFilePath
      });
    } catch (e) {
      console.error(e);
      const errTime = new Date().toLocaleTimeString();
      console.error(`[${errTime}] [Ошибка] ${String(e)}`);
      setTranscription(prev => prev ? prev + '\n\n[Error]: ' + String(e) : '[Error]: ' + String(e));
    } finally {
      setIsTranscribing(false);
      setProgress(1);
      unlistenText();
      unlistenProgress();
      unlistenDiarized();
    }
  };

  const handleGenerateSummary = async () => {
    const currentText = (transcription || summary).trim();
    if (!currentText) {
      alert('Сначала расшифруйте лекцию или вставьте текст лекции в редактор.');
      return;
    }
    if (!apiKey) {
      setIsSettingsOpen(true);
      alert(language === 'ru'
        ? 'Укажите ключ Groq API (gsk_...) в Настройках приложения.'
        : 'Please enter your Groq API key (gsk_...) in Application Settings.');
      return;
    }

    setIsSummarizing(true);
    const startSummaryTime = new Date().toLocaleTimeString();
    console.log(`[${startSummaryTime}] [Конспект] Запрос к Groq LLM для анализа лекции${showTeacherQuotes ? ' (с цитатами преподавателя)' : ''}...`);

    try {
      const { customPrompt } = useAppStore.getState();
      const contextString = formatContextForPrompt(contextItems);
      const generated = await generateSummary(currentText, apiKey, showTeacherQuotes, customPrompt, contextString);
      const cleanSummary = sanitizeEmojis(generated);
      setSummary(cleanSummary);
      setActiveTab('summary');
      setSummaryViewMode('preview');
      if (currentSessionId) {
        updateTranscription(currentSessionId, { summary: cleanSummary });
      }
      const finishSummaryTime = new Date().toLocaleTimeString();
      console.log(`[${finishSummaryTime}] [Готово] Умный конспект успешно создан!`);
    } catch (e: any) {
      const errTime = new Date().toLocaleTimeString();
      console.error(`[${errTime}] [Ошибка конспекта] ${e?.message || String(e)}`);
      alert(e?.message || String(e));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExportMd = async (scope?: 'summary' | 'transcript' | 'both') => {
    let textToExport = '';
    let suffix = '';
    if (scope === 'summary' || (!scope && activeTab === 'summary')) {
      textToExport = summary;
      suffix = '_Конспект';
    } else if (scope === 'transcript' || (!scope && activeTab === 'transcript')) {
      textToExport = transcription;
      suffix = '_Транскрипт';
    } else {
      textToExport = summary ? `${summary}\n\n---\n\n# Полный транскрипт\n\n${transcription}` : transcription;
      suffix = '_Конспект_и_Транскрипт';
    }
    if (!textToExport) return;
    const baseName = selectedFileName?.replace(/\.[^/.]+$/, '') || 'Lecture';
    const defaultDir = lastSaveDirectory || (selectedFilePath ? selectedFilePath.replace(/[\\/][^\\/]+$/, '') : undefined);

    try {
      const savedPath = await exportToMarkdown(textToExport, `${baseName}${suffix}`, defaultDir);
      if (savedPath) {
        const folder = savedPath.replace(/[\\/][^\\/]+$/, '');
        setLastSaveDirectory(folder);
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] [Сохранено] Markdown файл: ${savedPath}`);
      }
    } catch (e: any) {
      const time = new Date().toLocaleTimeString();
      console.error(`[${time}] [Ошибка сохранения] ${e?.message || String(e)}`);
      alert(`Ошибка при сохранении файла: ${e?.message || String(e)}`);
    }
  };

  const handleExportDocx = async (scope?: 'summary' | 'transcript' | 'both') => {
    let textToExport = '';
    let suffix = '';
    if (scope === 'summary' || (!scope && activeTab === 'summary')) {
      textToExport = summary;
      suffix = ' (Конспект)';
    } else if (scope === 'transcript' || (!scope && activeTab === 'transcript')) {
      textToExport = transcription;
      suffix = ' (Транскрипт)';
    } else {
      textToExport = summary ? `${summary}\n\n---\n\nПолный транскрипт:\n\n${transcription}` : transcription;
      suffix = ' (Конспект и Транскрипт)';
    }
    if (!textToExport) return;
    const baseName = selectedFileName?.replace(/\.[^/.]+$/, '') || 'Lecture';
    const defaultDir = lastSaveDirectory || (selectedFilePath ? selectedFilePath.replace(/[\\/][^\\/]+$/, '') : undefined);

    try {
      const savedPath = await exportToDocx(textToExport, `${baseName}${suffix}`, defaultDir);
      if (savedPath) {
        const folder = savedPath.replace(/[\\/][^\\/]+$/, '');
        setLastSaveDirectory(folder);
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] [Сохранено] Word документ: ${savedPath}`);
      }
    } catch (e: any) {
      const time = new Date().toLocaleTimeString();
      console.error(`[${time}] [Ошибка сохранения] ${e?.message || String(e)}`);
      alert(`Ошибка при сохранении файла: ${e?.message || String(e)}`);
    }
  };

  const handleExportPdf = async (scope?: 'summary' | 'transcript' | 'both') => {
    let textToExport = '';
    let suffix = '';
    if (scope === 'summary' || (!scope && activeTab === 'summary')) {
      textToExport = summary;
      suffix = ' (Конспект)';
    } else if (scope === 'transcript' || (!scope && activeTab === 'transcript')) {
      textToExport = transcription;
      suffix = ' (Транскрипт)';
    } else {
      textToExport = summary ? `${summary}\n\n---\n\nПолный транскрипт:\n\n${transcription}` : transcription;
      suffix = ' (Конспект и Транскрипт)';
    }
    if (!textToExport) return;
    const baseName = selectedFileName?.replace(/\.[^/.]+$/, '') || 'Lecture';
    const defaultDir = lastSaveDirectory || (selectedFilePath ? selectedFilePath.replace(/[\\/][^\\/]+$/, '') : undefined);

    try {
      const savedPath = await exportToPdf(textToExport, `${baseName}${suffix}`, defaultDir);
      if (savedPath) {
        const folder = savedPath.replace(/[\\/][^\\/]+$/, '');
        setLastSaveDirectory(folder);
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] [Сохранено] PDF документ: ${savedPath}`);
      }
    } catch (e: any) {
      const time = new Date().toLocaleTimeString();
      console.error(`[${time}] [Ошибка сохранения] ${e?.message || String(e)}`);
      alert(`Ошибка при сохранении файла: ${e?.message || String(e)}`);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <Button 
            appearance="primary" 
            icon={<BookQuestionMark24Regular />} 
            onClick={() => setIsGuideOpen(true)}
            title={t.userGuideTooltip}
            style={{ fontWeight: 600 }}
          >
            {t.userGuide}
          </Button>
          <Button 
            appearance="secondary" 
            icon={<Settings24Regular />} 
            onClick={() => setIsSettingsOpen(true)}
            title={t.settingsTooltip}
            style={{ fontWeight: 600 }}
          >
            {t.settings}
          </Button>
        </div>

        <Button 
          appearance="subtle"
          icon={theme === 'dark' ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
          onClick={toggleTheme}
          title={theme === 'dark' ? t.themeLight : t.themeDark}
          aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
        />
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '2px 8px', 
            borderRadius: '6px', 
            backgroundColor: tokens.colorNeutralBackground3, 
            border: `1px solid ${tokens.colorNeutralStroke2}`,
            cursor: 'not-allowed'
          }}
          title={t.aiLockedTooltip}
        >
          <Switch 
            checked={true} 
            disabled={true} 
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                {t.aiOnline}
                <LockClosed16Regular style={{ color: tokens.colorNeutralForeground4 }} />
              </span>
            }
          />
          <Badge appearance="tint" color="informative" size="small">
            {t.aiLockedBadge}
          </Badge>
        </div>
        <Switch 
          checked={enableDiarization} 
          onChange={(_, data) => setEnableDiarization(data.checked)} 
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <People20Regular />
              {t.diarization}
            </span>
          }
          title={t.diarizationTooltip}
        />
      </header>

      <div className={styles.container}>
        <div 
          className={styles.sidebar}
          style={{ width: `${sidebarWidth}px`, minWidth: '180px', maxWidth: '550px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Title2>{t.title}</Title2>
            <Button
              appearance="subtle"
              icon={<Settings24Regular />}
              size="small"
              onClick={() => setIsSettingsOpen(true)}
              title={t.settingsTooltip}
            />
          </div>
          <Button appearance="primary" onClick={handleNewSession}>{t.newSession}</Button>
          <div className={styles.settingsRow}>
            <Subtitle2>{t.history}</Subtitle2>
          </div>
          <Divider />
          <FolderTree 
            currentSessionId={currentSessionId}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setSearchMatchIndex(0);
            }}
            onSelectTranscription={(item, targetTab, query) => {
              setCurrentSessionId(item.id);
              setSelectedFileName(item.title);
              setSelectedFilePath(item.path || null);
              setTranscription(sanitizeEmojis(item.text));
              setSummary(sanitizeEmojis(item.summary || ''));
              if (targetTab === 'summary' || (item.summary && !item.text)) {
                setActiveTab('summary');
                setSummaryViewMode('preview');
              } else {
                setActiveTab('transcript');
              }
              if (query !== undefined) {
                setSearchQuery(query);
                setSearchMatchIndex(0);
              }
            }}
            onNewSession={handleNewSession}
            language={language}
          />
        </div>

        <div 
          className={`${styles.sidebarResizer} ${isResizingSidebar ? styles.resizerActive : ''}`}
          onMouseDown={handleSidebarResizeStart}
          title={t.dragResizeSidebar}
        />

        <div className={styles.mainContent}>
          {/* Top panel header with collapse/expand toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: isAudioPanelCollapsed ? '0px' : '-4px' }}>
            {isAudioPanelCollapsed && selectedFileName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <DocumentArrowUp24Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
                <Body1Strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFileName}</Body1Strong>
              </div>
            ) : <div />}
            <Button
              size="small"
              appearance="subtle"
              icon={isAudioPanelCollapsed ? <ChevronDown20Regular /> : <ChevronUp20Regular />}
              onClick={() => setIsAudioPanelCollapsed(prev => !prev)}
              title={isAudioPanelCollapsed ? t.expandAudioPanel : t.collapseAudioPanel}
              style={{ fontSize: '12px', height: '24px' }}
            >
              {isAudioPanelCollapsed ? t.expandAudioPanel : t.collapseAudioPanel}
            </Button>
          </div>

          {!isAudioPanelCollapsed && (
            !selectedFileName ? (
              <div className={styles.inputRow}>
              {/* Left: Drag & Drop / File Select */}
              <div 
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                onClick={triggerFileSelect}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              >
                <DocumentArrowUp24Regular className={styles.dropzoneIcon} style={{ fontSize: '32px' }} />
                <Body1Strong>{t.dropHere}</Body1Strong>
                <Body1 style={{ color: tokens.colorNeutralForeground3 }}>{t.orClick}</Body1>
              </div>

              {/* Right: Audio Recording Card */}
              <div 
                className={`${styles.recordCard} ${isRecording ? styles.recordCardActive : ''}`}
                onClick={!isRecording && !isTranscribing ? handleStartRecording : undefined}
              >
                {!isRecording ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
                    <Mic24Regular style={{ color: tokens.colorPaletteRedForeground1, fontSize: '30px', marginBottom: '2px', flexShrink: 0 }} />
                    <Body1Strong style={{ textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.recordMic}
                    </Body1Strong>
                    <Body1 style={{ color: tokens.colorNeutralForeground3, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.recordClickToStart}
                    </Body1>

                    {/* Microphone Device Selection */}
                    <div 
                      style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mic20Regular style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }} />
                      <Select 
                        size="small" 
                        value={selectedMicrophoneId} 
                        onChange={(_, data) => setSelectedMicrophoneId(data.value)}
                        style={{ width: '100%', minWidth: 0, maxWidth: '100%', flex: 1 }}
                        select={{
                          style: {
                            width: '100%',
                            minWidth: 0,
                            maxWidth: '100%',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }
                        }}
                        disabled={isRecording}
                        title={
                          microphones.find(m => m.id === selectedMicrophoneId)?.name ||
                          t.defaultMic
                        }
                      >
                        {microphones.length === 0 && (
                          <option value="">{t.defaultMic}</option>
                        )}
                        {microphones.map((mic) => (
                          <option key={mic.id} value={mic.id} title={mic.name}>
                            {mic.name} {mic.is_default ? '(По умолчанию)' : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Badge appearance="filled" color="danger" size="large">
                        {formatDuration(recordingSeconds)}
                      </Badge>
                      <Body1Strong style={{ color: tokens.colorPaletteRedForeground1 }}>{t.recordInProgress}</Body1Strong>
                    </div>

                    {/* Live Audio Tape (Waveform) & Equalizer */}
                    <div style={{ width: '100%', maxWidth: '340px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                      <AudioVisualizer 
                        isRecording={isRecording} 
                        width={300} 
                        height={52} 
                      />
                    </div>

                    <Button 
                      appearance="primary" 
                      color="danger"
                      icon={<Stop24Regular />} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopRecording();
                      }}
                    >
                      {t.recordStop}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.inputRow}>
              {/* Left: Compact selected file display */}
              <div className={styles.dropzoneCompact}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <DocumentArrowUp24Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
                  <Body1Strong style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {selectedFileName}
                  </Body1Strong>
                </div>
                <Button size="small" appearance="subtle" onClick={triggerFileSelect} disabled={isTranscribing} style={{ flexShrink: 0 }}>
                  {t.changeFile}
                </Button>
              </div>

              {/* Right: Compact recording action */}
              <div className={styles.recordCompact}>
                {!isRecording ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                    <Select 
                      size="small" 
                      value={selectedMicrophoneId} 
                      onChange={(_, data) => setSelectedMicrophoneId(data.value)}
                      style={{ flex: '1 1 140px', minWidth: 0, maxWidth: '100%' }}
                      select={{
                        style: {
                          width: '100%',
                          minWidth: 0,
                          maxWidth: '100%',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }
                      }}
                      title={
                        microphones.find(m => m.id === selectedMicrophoneId)?.name ||
                        t.defaultMic
                      }
                    >
                      {microphones.length === 0 && (
                        <option value="">{t.defaultMic}</option>
                      )}
                      {microphones.map((mic) => (
                        <option key={mic.id} value={mic.id} title={mic.name}>
                          {mic.name} {mic.is_default ? '(По умолчанию)' : ''}
                        </option>
                      ))}
                    </Select>
                    <Button 
                      appearance="subtle" 
                      icon={<Mic24Regular style={{ color: tokens.colorPaletteRedForeground1 }} />} 
                      onClick={handleStartRecording}
                      disabled={isTranscribing}
                      style={{ flexShrink: 0 }}
                    >
                      {t.recordNew}
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge appearance="filled" color="danger" size="medium">
                      {formatDuration(recordingSeconds)}
                    </Badge>
                    <AudioVisualizer 
                      isRecording={isRecording} 
                      width={120} 
                      height={26} 
                    />
                    <Button 
                      appearance="primary" 
                      color="danger"
                      size="small"
                      icon={<Stop24Regular />} 
                      onClick={handleStopRecording}
                    >
                      {t.recordStop}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className={styles.controls}>
            <Button appearance="primary" icon={<Play24Regular />} onClick={handleTranscribe} disabled={isTranscribing || !selectedFilePath} style={{ flexShrink: 0 }}>
              {isTranscribing ? t.transcribing : t.transcribeBtn}
            </Button>
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                backgroundColor: tokens.colorNeutralBackground3, 
                borderRadius: tokens.borderRadiusMedium, 
                padding: '2px', 
                gap: '2px',
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                flexShrink: 0
              }}
            >
              <Button 
                size="small" 
                appearance={recognitionMode === 'accuracy' ? 'primary' : 'subtle'}
                onClick={() => setRecognitionMode('accuracy')}
                title={t.accuracyModeTooltip}
              >
                {t.accuracyMode}
              </Button>
              <Button 
                size="small" 
                appearance={recognitionMode === 'speed' ? 'primary' : 'subtle'}
                onClick={() => setRecognitionMode('speed')}
                title={t.speedModeTooltip}
              >
                {t.speedMode}
              </Button>
            </div>
            {isTranscribing && <div className={styles.progressContainer}><ProgressBar value={progress} /></div>}
          </div>

          <ContextPanel 
            contextItems={contextItems}
            onAddItems={(newItems) => setContextItems(prev => [...prev, ...newItems])}
            onRemoveItem={(id) => setContextItems(prev => prev.filter(item => item.id !== id))}
            language={language}
          />

          <div className={styles.tabRow}>
            <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value as any)}>
              <Tab value="transcript" icon={<DocumentBulletList20Regular />}>
                {t.tabTranscript}
              </Tab>
              <Tab value="summary" icon={<Sparkle20Regular />}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t.tabSummary}</span>
                  {summary && (
                    <Badge appearance="filled" color="brand" size="small">
                      <CheckmarkRegular style={{ fontSize: '10px' }} />
                    </Badge>
                  )}
                </div>
              </Tab>
              <Tab value="split" icon={<DocumentMultiple20Regular />}>
                <span title={t.tabSplitTooltip}>{t.tabSplit}</span>
              </Tab>
            </TabList>

            <div className={styles.tabActions}>
              {activeTab === 'summary' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
                  <Button 
                    size="small" 
                    appearance={summaryViewMode === 'preview' ? 'primary' : 'subtle'} 
                    icon={<Eye20Regular />} 
                    onClick={() => setSummaryViewMode('preview')}
                  >
                    {t.viewPreview}
                  </Button>
                  <Button 
                    size="small" 
                    appearance={summaryViewMode === 'edit' ? 'primary' : 'subtle'} 
                    icon={<Edit20Regular />} 
                    onClick={() => setSummaryViewMode('edit')}
                  >
                    {t.viewEdit}
                  </Button>
                </div>
              )}
              <ToggleButton
                checked={showTeacherQuotes}
                onClick={() => setShowTeacherQuotes(prev => !prev)}
                icon={showTeacherQuotes ? <TextQuote20Filled /> : <TextQuote20Regular />}
                title={t.showTeacherQuotesTooltip}
              >
                {t.showTeacherQuotes}
              </ToggleButton>
              <Button 
                appearance="primary" 
                icon={isSummarizing ? <Spinner size="tiny" /> : <Sparkle24Regular />} 
                onClick={handleGenerateSummary} 
                disabled={isTranscribing || isSummarizing}
              >
                {isSummarizing ? t.summarizing : t.smartNotes}
              </Button>
              {activeTab === 'split' ? (
                <>
                  <Menu openOnHover positioning="below-end">
                    <MenuTrigger disableButtonEnhancement>
                      <Button 
                        icon={<Save24Regular />} 
                        disabled={!(summary || transcription)}
                      >
                        {t.exportMd}
                      </Button>
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem onClick={() => handleExportMd('summary')} disabled={!summary}>
                          {t.exportSummaryOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportMd('transcript')} disabled={!transcription}>
                          {t.exportTranscriptOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportMd('both')} disabled={!(summary || transcription)}>
                          {t.exportBoth}
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>

                  <Menu openOnHover positioning="below-end">
                    <MenuTrigger disableButtonEnhancement>
                      <Button 
                        icon={<ArrowDownload24Regular />}
                        disabled={!(summary || transcription)}
                      >
                        {t.exportWord}
                      </Button>
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem onClick={() => handleExportDocx('summary')} disabled={!summary}>
                          {t.exportSummaryOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportDocx('transcript')} disabled={!transcription}>
                          {t.exportTranscriptOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportDocx('both')} disabled={!(summary || transcription)}>
                          {t.exportBoth}
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>

                  <Menu openOnHover positioning="below-end">
                    <MenuTrigger disableButtonEnhancement>
                      <Button 
                        icon={<ArrowDownload24Regular />}
                        disabled={!(summary || transcription)}
                      >
                        {t.exportPdf}
                      </Button>
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem onClick={() => handleExportPdf('summary')} disabled={!summary}>
                          {t.exportSummaryOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportPdf('transcript')} disabled={!transcription}>
                          {t.exportTranscriptOnly}
                        </MenuItem>
                        <MenuItem onClick={() => handleExportPdf('both')} disabled={!(summary || transcription)}>
                          {t.exportBoth}
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </>
              ) : (
                <>
                  <Button 
                    icon={<Save24Regular />} 
                    onClick={() => handleExportMd()} 
                    disabled={!(summary || transcription)}
                  >
                    {t.exportMd}
                  </Button>
                  <Button 
                    icon={<ArrowDownload24Regular />}
                    onClick={() => handleExportDocx()} 
                    disabled={!(summary || transcription)}
                  >
                    {t.exportWord}
                  </Button>
                  <Button 
                    icon={<ArrowDownload24Regular />}
                    onClick={() => handleExportPdf()} 
                    disabled={!(summary || transcription)}
                  >
                    {t.exportPdf}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className={styles.textareaContainer}>
            {/* Active search toolbar in document */}
            {searchQuery.trim() && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                backgroundColor: tokens.colorBrandBackground2,
                borderRadius: tokens.borderRadiusMedium,
                border: `1px solid ${tokens.colorBrandStroke2}`,
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search20Regular style={{ color: tokens.colorBrandForeground1 }} />
                  <Body1Strong style={{ fontSize: '13px' }}>
                    {language === 'ru' ? 'Поиск в документе:' : 'Search in document:'} "{searchQuery}"
                  </Body1Strong>
                  <Badge appearance="filled" color={totalDocMatches > 0 ? 'brand' : 'informative'} size="small">
                    {totalDocMatches} {language === 'ru' ? 'совпадений' : 'matches'}
                  </Badge>
                  {totalDocMatches > 0 && (
                    <span style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                      ({searchMatchIndex + 1} / {totalDocMatches})
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ChevronUp16Regular />}
                    onClick={handlePrevMatch}
                    title={language === 'ru' ? 'Предыдущее совпадение' : 'Previous match'}
                    disabled={totalDocMatches === 0}
                  >
                    {language === 'ru' ? 'Назад' : 'Prev'}
                  </Button>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ChevronDown16Regular />}
                    onClick={handleNextMatch}
                    title={language === 'ru' ? 'Следующее совпадение' : 'Next match'}
                    disabled={totalDocMatches === 0}
                  >
                    {language === 'ru' ? 'Вперед' : 'Next'}
                  </Button>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Dismiss16Regular />}
                    onClick={() => setSearchQuery('')}
                    title={language === 'ru' ? 'Закрыть поиск' : 'Close search'}
                  />
                </div>
              </div>
            )}
            {(activeTab === 'transcript' || activeTab === 'split') && detectedSpeakers.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: tokens.colorNeutralBackground1,
                borderRadius: tokens.borderRadiusMedium,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                flexShrink: 0
              }}>
                <People20Regular style={{ color: tokens.colorBrandForeground1 }} />
                <Body1Strong style={{ fontSize: '13px' }}>{t.speakersDetected}:</Body1Strong>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexGrow: 1 }}>
                  {detectedSpeakers.map((spk) => (
                    <Badge key={spk} appearance="tint" color="brand" size="medium">
                      {spk}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<PeopleSettings20Regular />}
                  onClick={() => {
                    const initialMap: Record<string, string> = {};
                    detectedSpeakers.forEach(s => { initialMap[s] = s; });
                    setSpeakerNameMap(initialMap);
                    setIsRenameSpeakersOpen(true);
                  }}
                >
                  {t.renameSpeakers}
                </Button>
              </div>
            )}
            {activeTab === 'split' ? (
              <div className={styles.splitContainer} ref={splitContainerRef}>
                {/* Left Sub-window: Full Transcript */}
                <div className={styles.splitPane} style={{ width: `calc(${splitViewRatio}% - 6px)` }}>
                  <div className={styles.paneHeader}>
                    <Body1Strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <DocumentBulletList20Regular style={{ color: tokens.colorBrandForeground1 }} />
                      {t.tabTranscript}
                    </Body1Strong>
                  </div>
                  <div className={styles.textareaWrapper}>
                    <FastTextarea 
                      ref={textareaRef}
                      value={transcription}
                      onChange={setTranscription}
                      placeholder={t.placeholderTranscript}
                    />
                  </div>
                </div>

                {/* Draggable Sub-window Divider */}
                <div 
                  className={`${styles.splitPaneResizer} ${isResizingSplit ? styles.resizerActive : ''}`}
                  onMouseDown={handleSplitResizeStart}
                  title={t.dragResizeSplit}
                />

                {/* Right Sub-window: Smart Notes Preview/Edit */}
                <div className={styles.splitPane} style={{ width: `calc(${100 - splitViewRatio}% - 6px)` }}>
                  <div className={styles.paneHeader} style={{ justifyContent: 'space-between' }}>
                    <Body1Strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Sparkle20Regular style={{ color: tokens.colorBrandForeground1 }} />
                      {t.tabSummary}
                    </Body1Strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Button 
                        size="small" 
                        appearance={summaryViewMode === 'preview' ? 'primary' : 'subtle'} 
                        icon={<Eye20Regular />} 
                        onClick={() => setSummaryViewMode('preview')}
                      >
                        {t.viewPreview}
                      </Button>
                      <Button 
                        size="small" 
                        appearance={summaryViewMode === 'edit' ? 'primary' : 'subtle'} 
                        icon={<Edit20Regular />} 
                        onClick={() => setSummaryViewMode('edit')}
                      >
                        {t.viewEdit}
                      </Button>
                    </div>
                  </div>
                  {summaryViewMode === 'preview' ? (
                    <div className={styles.markdownPreview}>
                      {summary ? (
                        <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
                      ) : (
                        <div style={{ color: tokens.colorNeutralForeground4, fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
                          {t.placeholderPreviewEmpty}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.textareaWrapper}>
                      <FastTextarea 
                        value={summary}
                        onChange={setSummary}
                        placeholder={t.placeholderSummary}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'transcript' ? (
              <div className={styles.textareaWrapper}>
                <FastTextarea 
                  ref={textareaRef}
                  value={transcription}
                  onChange={setTranscription}
                  placeholder={t.placeholderTranscript}
                />
              </div>
            ) : summaryViewMode === 'preview' ? (
              <div className={styles.markdownPreview}>
                {summary ? (
                  <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
                ) : (
                  <div style={{ color: tokens.colorNeutralForeground4, fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
                    {t.placeholderPreviewEmpty}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.textareaWrapper}>
                <FastTextarea 
                  value={summary}
                  onChange={setSummary}
                  placeholder={t.placeholderSummary}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rename Speakers Dialog */}
      <Dialog open={isRenameSpeakersOpen} onOpenChange={(_, data) => setIsRenameSpeakersOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '460px', width: '90%' }}>
          <DialogBody>
            <DialogTitle action={
              <Button appearance="subtle" aria-label="close" icon={<DismissRegular />} onClick={() => setIsRenameSpeakersOpen(false)} />
            }>
              {t.renameSpeakersTitle}
            </DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <Body1 style={{ color: tokens.colorNeutralForeground3 }}>
                {t.renameSpeakersDesc}
              </Body1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                {detectedSpeakers.map((spk) => (
                  <div key={spk} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge appearance="filled" color="brand" style={{ minWidth: '95px', textAlign: 'center' }}>
                      {spk}
                    </Badge>
                    <Input
                      value={speakerNameMap[spk] ?? spk}
                      onChange={(_, data) => setSpeakerNameMap(prev => ({ ...prev, [spk]: data.value }))}
                      placeholder={spk}
                      style={{ flexGrow: 1 }}
                    />
                  </div>
                ))}
              </div>
            </DialogContent>
            <DialogActions style={{ marginTop: '16px' }}>
              <Button appearance="secondary" onClick={() => setIsRenameSpeakersOpen(false)}>
                {t.cancel}
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  let updated = transcription;
                  Object.entries(speakerNameMap).forEach(([oldName, newName]) => {
                    if (newName && newName.trim() && newName.trim() !== oldName) {
                      const regex = new RegExp(`\\[${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
                      updated = updated.replace(regex, `[${newName.trim()}]`);
                    }
                  });
                  setTranscription(updated);
                  if (currentSessionId) {
                    updateTranscription(currentSessionId, { text: updated });
                  }
                  setIsRenameSpeakersOpen(false);
                }}
              >
                {t.apply}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        language={language}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
      />
    </div>
  );
}

export default App;
