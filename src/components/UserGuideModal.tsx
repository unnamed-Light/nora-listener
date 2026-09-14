import React, { useState, useMemo } from 'react';
import {
  makeStyles,
  shorthands,
  Button,
  tokens,
  Title3,
  Subtitle2,
  Body1,
  Body1Strong,
  Caption1,
  Badge,
  Input,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  Divider,
} from '@fluentui/react-components';
import {
  BookQuestionMark24Regular,
  DismissRegular,
  Search20Regular,
  ArrowRight16Regular,
  ArrowLeft16Regular,
  Mic24Regular,
  BrainCircuit24Regular,
  People24Regular,
  DocumentText24Regular,
  ArrowDownload24Regular,
  QuestionCircle24Regular,
  Sparkle24Regular,
  Info20Regular,
  Lightbulb20Regular,
  Warning20Regular,
  Open16Regular,
} from '@fluentui/react-icons';
import { openExternalUrl } from '../lib/openUrl';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ru' | 'en';
}

const useStyles = makeStyles({
  surface: {
    maxWidth: '960px',
    width: '92vw',
    height: '84vh',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding('20px', '24px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  modalTitleContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
  },
  bodyLayout: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    marginTop: '12px',
    ...shorthands.gap('20px'),
  },
  navSidebar: {
    width: '260px',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingRight: '14px',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    overflowY: 'auto',
    flexGrow: 1,
    paddingRight: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('10px'),
    ...shorthands.padding('8px', '12px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    border: 'none',
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground1,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
    ...shorthands.borderLeft('3px', 'solid', tokens.colorBrandStroke1),
  },
  contentArea: {
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '12px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  chapterHeader: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    marginBottom: '4px',
  },
  chapterTitle: {
    display: 'block',
    fontSize: '20px',
    lineHeight: '26px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  chapterSubtitle: {
    display: 'block',
    fontSize: '13px',
    lineHeight: '18px',
    color: tokens.colorNeutralForeground3,
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  calloutNote: {
    display: 'flex',
    ...shorthands.gap('10px'),
    ...shorthands.padding('10px', '14px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke2),
    color: tokens.colorBrandForeground1,
    alignItems: 'flex-start',
  },
  calloutWarning: {
    display: 'flex',
    ...shorthands.gap('10px'),
    ...shorthands.padding('10px', '14px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    color: tokens.colorNeutralForeground2,
    alignItems: 'flex-start',
  },
  diagramContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('14px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    boxSizing: 'border-box',
  },
  bulletList: {
    margin: '0',
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: 700,
    fontSize: '12px',
    marginRight: '8px',
  },
  footerNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

const ExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  return (
    <span
      role="link"
      tabIndex={0}
      style={{
        color: tokens.colorBrandForeground1,
        cursor: 'pointer',
        textDecoration: 'underline',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontWeight: 500,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openExternalUrl(href);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openExternalUrl(href);
        }
      }}
    >
      {children}
      <Open16Regular style={{ fontSize: '12px', flexShrink: 0 }} />
    </span>
  );
};

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, language = 'ru' }) => {
  const styles = useStyles();
  const isEn = language === 'en';
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chapters = useMemo(() => [
    {
      id: 0,
      title: isEn ? '1. Overview & Quick Start' : '1. Обзор и быстрый старт',
      icon: <Sparkle24Regular />,
      description: isEn
        ? 'Nora Listener architecture, key operating principles, and instant launch.'
        : 'Архитектура Nora Listener, ключевые принципы работы и мгновенный запуск.',
    },
    {
      id: 1,
      title: isEn ? '2. Audio Ingestion & DSP Cleanup' : '2. Загрузка и DSP-очистка',
      icon: <Mic24Regular />,
      description: isEn
        ? 'Supported formats, Drag & Drop, 80 Hz filter, and peak normalization.'
        : 'Поддерживаемые форматы, Drag & Drop, фильтр 80 Гц и нормализация громкости.',
    },
    {
      id: 2,
      title: isEn ? '3. Recognition Models' : '3. Модели распознавания',
      icon: <BrainCircuit24Regular />,
      description: isEn
        ? 'High Precision (Large v3) vs High Speed (Turbo), chunk bridging.'
        : 'Повышенная точность (Large v3) vs Повышенная скорость (Turbo), склейка сегментов.',
    },
    {
      id: 3,
      title: isEn ? '4. Speaker Diarization' : '4. Разделение спикеров',
      icon: <People24Regular />,
      description: isEn
        ? 'Diarization, F0 spectral pitch analysis, and renaming lecturer and students.'
        : 'Диаризация, спектральный анализ F0 и переименование преподавателя и студентов.',
    },
    {
      id: 4,
      title: isEn ? '5. Smart Notes & KaTeX' : '5. Умный конспект и KaTeX',
      icon: <DocumentText24Regular />,
      description: isEn
        ? '5 academic sections (§ 1 - § 5), mathematical formulas, lecturer quotes.'
        : '5 академических разделов (§ 1 – § 5), математические формулы, цитаты лектора.',
    },
    {
      id: 5,
      title: isEn ? '6. Export & Organization' : '6. Экспорт и организация',
      icon: <ArrowDownload24Regular />,
      description: isEn
        ? 'Export to Word (.docx), PDF, and Markdown (.md), folder tree, and search.'
        : 'Выгрузка в Word (.docx), PDF и Markdown (.md), дерево папок и поиск по записям.',
    },
    {
      id: 6,
      title: isEn ? '7. FAQ & Best Practices' : '7. Частые вопросы и советы',
      icon: <QuestionCircle24Regular />,
      description: isEn
        ? 'Lecture recording recommendations, troubleshooting, and pro tips.'
        : 'Рекомендации по записи лекций на диктофон, устранение ошибок и полезные советы.',
    },
  ], [isEn]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [chapters, searchQuery]);

  const renderArchitectureSvg = () => (
    <svg viewBox="0 0 760 220" width="100%" height="220" style={{ maxWidth: '720px' }}>
      <defs>
        <linearGradient id="gBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#106EBE" />
        </linearGradient>
        <linearGradient id="gTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#008272" />
          <stop offset="100%" stopColor="#005A4E" />
        </linearGradient>
        <linearGradient id="gPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#744DA9" />
          <stop offset="100%" stopColor="#553480" />
        </linearGradient>
        <linearGradient id="gDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2B2B2B" />
          <stop offset="100%" stopColor="#1F1F1F" />
        </linearGradient>
      </defs>

      <path d="M 120 110 L 160 110" stroke="#0078D4" strokeWidth="3" strokeDasharray="4,4" />
      <polygon points="160,105 170,110 160,115" fill="#0078D4" />

      <path d="M 290 110 L 330 110" stroke="#008272" strokeWidth="3" strokeDasharray="4,4" />
      <polygon points="330,105 340,110 330,115" fill="#008272" />

      <path d="M 460 110 L 500 110" stroke="#744DA9" strokeWidth="3" strokeDasharray="4,4" />
      <polygon points="500,105 510,110 500,115" fill="#744DA9" />

      <path d="M 630 110 L 660 110" stroke="#0078D4" strokeWidth="3" strokeDasharray="4,4" />
      <polygon points="660,105 670,110 660,115" fill="#0078D4" />

      {/* Block 1: Audio Input */}
      <rect x="10" y="55" width="110" height="110" rx="12" fill="url(#gDark)" stroke="#444" strokeWidth="1.5" />
      <circle cx="65" cy="95" r="22" fill="#0078D4" opacity="0.2" />
      <path d="M 55 95 L 75 95 M 65 85 L 65 105" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
      <text x="65" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
        {isEn ? 'Audio File' : 'Аудиозапись'}
      </text>
      <text x="65" y="150" fill="#9CA3AF" fontSize="10" textAnchor="middle">MP3, WAV, MP4</text>

      {/* Block 2: DSP Filter */}
      <rect x="170" y="55" width="120" height="110" rx="12" fill="url(#gBlue)" stroke="#106EBE" strokeWidth="1.5" />
      <path d="M 185 105 Q 210 75 230 105 T 275 105" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      <text x="230" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
        {isEn ? 'DSP Filter' : 'DSP-фильтр'}
      </text>
      <text x="230" y="150" fill="#E0F2FE" fontSize="10" textAnchor="middle">
        {isEn ? '80 Hz + 0.92 Gain' : '80 Гц + 0.92 Gain'}
      </text>

      {/* Block 3: Whisper AI */}
      <rect x="340" y="55" width="120" height="110" rx="12" fill="url(#gTeal)" stroke="#005A4E" strokeWidth="1.5" />
      <circle cx="400" cy="95" r="18" fill="#FFFFFF" opacity="0.25" />
      <text x="400" y="100" fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="middle">Whisper</text>
      <text x="400" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
        {isEn ? 'Recognition' : 'Распознавание'}
      </text>
      <text x="400" y="150" fill="#CCFBF1" fontSize="10" textAnchor="middle">
        {isEn ? 'Precision / Turbo' : 'Точность / Турбо'}
      </text>

      {/* Block 4: Diarization & Smart Notes */}
      <rect x="510" y="55" width="120" height="110" rx="12" fill="url(#gPurple)" stroke="#553480" strokeWidth="1.5" />
      <text x="570" y="90" fill="#E9D5FF" fontSize="11" fontWeight="600" textAnchor="middle">
        {isEn ? 'Diarization' : 'Диаризация'}
      </text>
      <line x1="530" y1="100" x2="610" y2="100" stroke="#A855F7" strokeWidth="1" />
      <text x="570" y="120" fill="#FFFFFF" fontSize="11" fontWeight="600" textAnchor="middle">
        {isEn ? 'Smart Notes' : 'Умный конспект'}
      </text>
      <text x="570" y="137" fill="#E9D5FF" fontSize="10" textAnchor="middle">
        {isEn ? '5 LaTeX sections' : '5 разделов LaTeX'}
      </text>
      <text x="570" y="152" fill="#D8B4FE" fontSize="9" textAnchor="middle">
        {isEn ? 'Lecturer quotes' : 'Цитаты лектора'}
      </text>

      {/* Block 5: Export */}
      <rect x="670" y="55" width="80" height="110" rx="12" fill="url(#gDark)" stroke="#444" strokeWidth="1.5" />
      <rect x="685" y="70" width="50" height="16" rx="4" fill="#2563EB" />
      <text x="710" y="82" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">DOCX</text>
      <rect x="685" y="93" width="50" height="16" rx="4" fill="#DC2626" />
      <text x="710" y="105" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">PDF</text>
      <rect x="685" y="116" width="50" height="16" rx="4" fill="#059669" />
      <text x="710" y="128" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">MD</text>
      <text x="710" y="152" fill="#9CA3AF" fontSize="10" textAnchor="middle">
        {isEn ? 'Export' : 'Экспорт'}
      </text>
    </svg>
  );

  const renderDspSvg = () => (
    <svg viewBox="0 0 720 180" width="100%" height="180" style={{ maxWidth: '680px' }}>
      <rect x="10" y="10" width="695" height="160" rx="10" fill="#18181B" stroke="#27272A" strokeWidth="1.5" />
      <line x1="40" y1="35" x2="675" y2="35" stroke="#2E2E33" strokeDasharray="3,3" />
      <line x1="40" y1="75" x2="675" y2="75" stroke="#2E2E33" strokeDasharray="3,3" />
      <line x1="40" y1="115" x2="675" y2="115" stroke="#2E2E33" strokeDasharray="3,3" />
      
      {/* Noise suppression zone (0-80 Hz) */}
      <rect x="40" y="25" width="140" height="120" fill="#EF4444" opacity="0.12" />
      <line x1="180" y1="25" x2="180" y2="145" stroke="#EF4444" strokeWidth="2" strokeDasharray="4,2" />
      <text x="110" y="45" fill="#F87171" fontSize="11" fontWeight="bold" textAnchor="middle">
        {isEn ? 'Low-cut Filter' : 'Срез шумов'}
      </text>
      <text x="110" y="60" fill="#FCA5A5" fontSize="9" textAnchor="middle">
        {isEn ? 'Hum, rumble, HVAC fans' : 'Гул, вибрации, вентиляторы'}
      </text>
      <text x="180" y="160" fill="#EF4444" fontSize="10" fontWeight="bold" textAnchor="middle">
        {isEn ? '80 Hz' : '80 Гц'}
      </text>

      {/* Clean Human Voice Curve */}
      <path d="M 40 135 C 120 135 160 130 190 70 C 220 30 260 55 300 45 C 360 30 420 80 490 60 C 560 40 620 90 675 120" 
            fill="none" stroke="#38BDF8" strokeWidth="3.5" />
      
      {/* Peak Normalization Line (0.92 gain) */}
      <line x1="40" y1="35" x2="675" y2="35" stroke="#10B981" strokeWidth="1.5" />
      <text x="610" y="28" fill="#34D399" fontSize="10" fontWeight="bold">
        {isEn ? 'Peak Limit (0.92 Gain)' : 'Пиковый лимит (0.92 Gain)'}
      </text>

      {/* Axis Labels */}
      <text x="40" y="160" fill="#71717A" fontSize="10">{isEn ? '20 Hz' : '20 Гц'}</text>
      <text x="350" y="160" fill="#38BDF8" fontSize="10" fontWeight="bold" textAnchor="middle">
        {isEn ? 'Intelligible lecturer speech band (200 Hz - 4 kHz)' : 'Диапазон разборчивой речи лектора (200 Гц – 4 кГц)'}
      </text>
      <text x="675" y="160" fill="#71717A" fontSize="10" textAnchor="end">{isEn ? '16 kHz' : '16 кГц'}</text>
    </svg>
  );

  const renderModelsSvg = () => (
    <svg viewBox="0 0 720 170" width="100%" height="170" style={{ maxWidth: '680px' }}>
      {/* Card 1: Accuracy Mode */}
      <rect x="20" y="15" width="325" height="140" rx="10" fill="#0F172A" stroke="#1E3A8A" strokeWidth="2" />
      <circle cx="50" cy="45" r="14" fill="#3B82F6" />
      <path d="M 44 45 L 48 49 L 57 40" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <text x="75" y="42" fill="#FFFFFF" fontSize="14" fontWeight="bold">
        {isEn ? 'High Precision' : 'Повышенная точность'}
      </text>
      <text x="75" y="58" fill="#93C5FD" fontSize="10">
        {isEn ? 'Whisper Large v3 (1.55B parameters)' : 'Whisper Large v3 (1.55 млрд параметров)'}
      </text>
      
      <text x="40" y="90" fill="#E2E8F0" fontSize="11">
        {isEn ? '• Highest accuracy for terms and formulas' : '• Высшая точность распознавания терминов и формул'}
      </text>
      <text x="40" y="110" fill="#E2E8F0" fontSize="11">
        {isEn ? '• Ideal for STEM, physics, and programming' : '• Идеально для математики, физики и программирования'}
      </text>
      <text x="40" y="130" fill="#94A3B8" fontSize="10">
        {isEn ? 'Speed: 1.5x-2x real-time lecture playback' : 'Скорость: 1.5x–2x от реального времени лекции'}
      </text>

      {/* Card 2: Speed Mode */}
      <rect x="375" y="15" width="325" height="140" rx="10" fill="#064E3B" stroke="#047857" strokeWidth="2" />
      <circle cx="405" cy="45" r="14" fill="#10B981" />
      <path d="M 400 45 L 408 40 L 404 46 L 410 46 L 401 53 L 403 47 Z" fill="#FFFFFF" />
      <text x="430" y="42" fill="#FFFFFF" fontSize="14" fontWeight="bold">
        {isEn ? 'High Speed' : 'Повышенная скорость'}
      </text>
      <text x="430" y="58" fill="#A7F3D0" fontSize="10">
        {isEn ? 'Whisper Large v3 Turbo (809M parameters)' : 'Whisper Large v3 Turbo (809 млн параметров)'}
      </text>
      
      <text x="395" y="90" fill="#ECFDF5" fontSize="11">
        {isEn ? '• 4-8x faster than standard processing' : '• В 4–8 раз быстрее стандартной обработки'}
      </text>
      <text x="395" y="110" fill="#ECFDF5" fontSize="11">
        {isEn ? '• Excellent for humanities and rapid review' : '• Отличная расшифровка гуманитарных и обзорных пар'}
      </text>
      <text x="395" y="130" fill="#A7F3D0" fontSize="10">
        {isEn ? 'Low memory footprint on student laptops' : 'Минимальное потребление ОЗУ на ноутбуке'}
      </text>
    </svg>
  );

  const renderDiarizationSvg = () => (
    <svg viewBox="0 0 720 170" width="100%" height="170" style={{ maxWidth: '680px' }}>
      <rect x="15" y="10" width="690" height="150" rx="10" fill="#18181B" stroke="#27272A" strokeWidth="1.5" />
      
      {/* Speaker 1 (Lecturer) Track */}
      <rect x="35" y="25" width="130" height="24" rx="6" fill="#1D4ED8" />
      <text x="100" y="41" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
        {isEn ? '[Speaker 1] Lecturer' : '[Спикер 1] Преподаватель'}
      </text>
      <path d="M 180 37 Q 240 15 300 37 T 420 37" fill="none" stroke="#60A5FA" strokeWidth="3" />
      <rect x="430" y="25" width="250" height="24" rx="4" fill="#1E293B" />
      <text x="440" y="41" fill="#94A3B8" fontSize="10">
        {isEn ? '"Consider the fundamental property..."' : '«Рассмотрим фундаментальное свойство...»'}
      </text>

      {/* Speaker 2 (Student) Track */}
      <rect x="35" y="70" width="130" height="24" rx="6" fill="#B45309" />
      <text x="100" y="86" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
        {isEn ? '[Speaker 2] Student' : '[Спикер 2] Студент'}
      </text>
      <path d="M 280 82 Q 330 65 380 82" fill="none" stroke="#FBBF24" strokeWidth="3" />
      <rect x="390" y="70" width="290" height="24" rx="4" fill="#1E293B" />
      <text x="400" y="86" fill="#FDE68A" fontSize="10">
        {isEn ? '"Is zero included in natural numbers?"' : '«А входит ли ноль в натуральные числа?»'}
      </text>

      {/* Rename Action Flow */}
      <line x1="35" y1="112" x2="685" y2="112" stroke="#333" strokeDasharray="3,3" />
      <rect x="35" y="122" width="170" height="26" rx="6" fill="#0284C7" />
      <text x="120" y="139" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
        {isEn ? 'Rename Speakers' : 'Переименовать спикеров'}
      </text>
      <text x="220" y="139" fill="#A1A1AA" fontSize="11">
        {isEn
          ? 'Replaces all [Speaker X] tags with real names across the entire lecture in one click'
          : 'Заменяет все метки [Спикер X] на настоящие имена во всей лекции в один клик'}
      </text>
    </svg>
  );

  const renderSmartNotesSvg = () => (
    <svg viewBox="0 0 720 180" width="100%" height="180" style={{ maxWidth: '680px' }}>
      <rect x="15" y="10" width="690" height="160" rx="10" fill="#1E1E24" stroke="#33333E" strokeWidth="1.5" />

      {/* Section 1 */}
      <rect x="30" y="25" width="200" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="40" y="42" fill="#60A5FA" fontSize="11" fontWeight="bold">
        {isEn ? '§ 1. Core Thesis Points' : '§ 1. Главные тезисы'}
      </text>
      <text x="40" y="56" fill="#A1A1AA" fontSize="9">
        {isEn ? '4-6 fundamental ideas' : '4–6 фундаментальных идей'}
      </text>

      {/* Section 2 */}
      <rect x="245" y="25" width="215" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="255" y="42" fill="#34D399" fontSize="11" fontWeight="bold">
        {isEn ? '§ 2. Conceptual Terms' : '§ 2. Понятийный аппарат'}
      </text>
      <text x="255" y="56" fill="#A1A1AA" fontSize="9">
        {isEn ? 'Strict academic definitions' : 'Строгие академические термины'}
      </text>

      {/* Section 3 */}
      <rect x="475" y="25" width="215" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="485" y="42" fill="#F472B6" fontSize="11" fontWeight="bold">
        {isEn ? '§ 3. Lecture Analysis' : '§ 3. Анализ лекции'}
      </text>
      <text x="485" y="56" fill="#A1A1AA" fontSize="9">
        {isEn ? 'Subsections 3.1-3.4 with proofs' : 'Блоки 3.1–3.4 с доказательствами'}
      </text>

      {/* KaTeX Box Preview */}
      <rect x="30" y="75" width="310" height="80" rx="6" fill="#0F172A" stroke="#2563EB" />
      <text x="42" y="95" fill="#38BDF8" fontSize="11" fontWeight="bold">
        {isEn ? 'KaTeX Mathematical Rendering' : 'Математический рендеринг KaTeX'}
      </text>
      <rect x="42" y="105" width="286" height="38" rx="4" fill="#1E293B" />
      <text x="185" y="129" fill="#E2E8F0" fontSize="13" fontWeight="bold" textAnchor="middle">$$\\forall x\\;(x \\in \\varnothing \\implies x \\in A)$$</text>

      {/* Quotes Feature Box */}
      <rect x="360" y="75" width="330" height="80" rx="6" fill="#1C1917" stroke="#D97706" />
      <text x="372" y="95" fill="#FBBF24" fontSize="11" fontWeight="bold">
        {isEn ? 'Lecturer Quotes (2-4 key quotes)' : 'Цитаты преподавателя (2–4 ключевые)'}
      </text>
      <rect x="372" y="105" width="306" height="38" rx="4" fill="#292524" />
      <text x="382" y="122" fill="#FDE68A" fontSize="10">
        {isEn ? '» "A set is a collection of elements..."' : '» «Множество — это совокупность элементов...»'}
      </text>
      <text x="382" y="136" fill="#A8A29E" fontSize="9">
        {isEn ? '- Lecturer (polished verbatim transcript)' : '— Преподаватель (литературная вычитка речи)'}
      </text>
    </svg>
  );

  const renderChapterContent = () => {
    switch (activeChapter) {
      case 0:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Overview & Quick Start with Nora Listener' : 'Обзор и быстрый старт с Nora Listener'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Personal academic AI assistant for students and lecturers'
                  : 'Персональный академический ИИ-ассистент для студентов и преподавателей'}
              </Caption1>
            </div>

            <div className={styles.calloutNote}>
              <Info20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>
                  {isEn ? 'High-Speed Groq Recognition and Local DSP Cleanup' : 'Скоростное распознавание Groq и локальная DSP-очистка'}
                </Body1Strong>
                <Body1 style={{ display: 'block' }}>
                  {isEn
                    ? 'Audio recordings undergo local digital preprocessing (80 Hz high-pass filter, peak normalization) and speaker diarization on your PC, while neural speech recognition (Whisper Large v3 / Turbo) and smart note generation are performed via the high-speed Groq API.'
                    : 'Аудиозапись проходит локальную цифровую предобработку (фильтр 80 Гц, нормализация) и диаризацию спикеров на вашем ПК, а распознавание речи (Whisper Large v3 / Turbo) и составление конспектов выполняются через высокоскоростной API Groq.'}
                </Body1>
              </div>
            </div>

            <div className={styles.diagramContainer}>
              {renderArchitectureSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Step-by-Step Workflow:' : 'Пошаговый порядок работы:'}</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span className={styles.stepNumber}>1</span>
                  {isEn ? (
                    <>
                      <Body1Strong>Drag and drop your lecture file</Body1Strong> into the center dropzone or click to select via file explorer.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Перетащите файл</Body1Strong> с лекцией в центральную зону или нажмите для выбора из проводника.
                    </>
                  )}
                </div>
                <div>
                  <span className={styles.stepNumber}>2</span>
                  {isEn ? (
                    <>
                      <Body1Strong>Select recognition mode:</Body1Strong> "High Precision" (кнопка «Повышенная точность» / Whisper Large v3) for STEM disciplines or "High Speed" (кнопка «Повышенная скорость» / Whisper Large v3 Turbo) for rapid transcription.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Выберите режим распознавания:</Body1Strong> «Повышенная точность» (Whisper Large v3) для точных наук или «Повышенная скорость» (Whisper Large v3 Turbo) для быстрой расшифровки.
                    </>
                  )}
                </div>
                <div>
                  <span className={styles.stepNumber}>3</span>
                  {isEn ? (
                    <>
                      <Body1Strong>Click «Расшифровать» (Transcribe)</Body1Strong> and track progress in the real-time audio visualizer.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Нажмите кнопку «Расшифровать»</Body1Strong> и наблюдайте за ходом в интерактивном визуализаторе звука.
                    </>
                  )}
                </div>
                <div>
                  <span className={styles.stepNumber}>4</span>
                  {isEn ? (
                    <>
                      <Body1Strong>Generate notes:</Body1Strong> optionally attach slides/notes or provide preferences in the clarifying input field, then click the «Сделать умный конспект» (Make Smart Notes) button to obtain structured study notes with LaTeX formulas and exam review sections (Groq API key is configured in «Настройки» / Settings).
                    </>
                  ) : (
                    <>
                      <Body1Strong>Сформируйте конспект:</Body1Strong> при необходимости прикрепите материалы к занятию или укажите пожелания в поле уточняющего контекста, затем нажмите «Сделать умный конспект» для получения готового академического конспекта с формулами LaTeX (ключ Groq API задается в окне «Настройки»).
                    </>
                  )}
                </div>
                <div>
                  <span className={styles.stepNumber}>5</span>
                  {isEn ? (
                    <>
                      <Body1Strong>Export results</Body1Strong> to Microsoft Word (.docx), PDF, or Markdown (.md) with a single click.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Экспортируйте результат</Body1Strong> в формат Word (.docx), PDF или Markdown (.md) одной кнопкой.
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case 1:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Audio Ingestion & Digital Signal Processing (DSP)' : 'Загрузка аудио и цифровая предобработка (DSP)'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Eliminating classroom background noise and normalizing quiet speech'
                  : 'Устранение фоновых шумов аудитории и нормализация громкости тихих реплик'}
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderDspSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Supported Media Formats' : 'Поддерживаемые медиаформаты'}</Subtitle2>
              <Body1>
                {isEn
                  ? 'Nora Listener automatically extracts audio tracks from all standard audio and video formats:'
                  : 'Nora Listener автоматически извлекает аудиодорожку из любых распространенных форматов:'}
              </Body1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Badge appearance="filled" color="brand">MP3</Badge>
                <Badge appearance="filled" color="brand">WAV</Badge>
                <Badge appearance="filled" color="brand">M4A</Badge>
                <Badge appearance="filled" color="brand">AAC</Badge>
                <Badge appearance="filled" color="brand">FLAC</Badge>
                <Badge appearance="filled" color="brand">OGG</Badge>
                <Badge appearance="filled" color="informative">{isEn ? 'MP4 (Video)' : 'MP4 (Видео)'}</Badge>
                <Badge appearance="filled" color="informative">{isEn ? 'MKV (Video)' : 'MKV (Видео)'}</Badge>
                <Badge appearance="filled" color="informative">WebM</Badge>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Built-in Audio Enhancement Pipeline (DSP):' : 'Встроенный алгоритм очистки звука (DSP Pipeline):'}</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>80 Hz Butterworth High-Pass Filter:</Body1Strong> cuts out low-frequency hall hum, ventilation noise, desk vibrations from recording devices, and microphone breath sounds, preserving the entire spectrum of intelligible human speech.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Высокочастотный фильтр Баттерворта 80 Гц (80 Hz Butterworth High-Pass):</Body1Strong> отсекает низкочастотные гулы аудитории, шум вентиляции, вибрации стола от диктофона и дыхание в микрофон, сохраняя весь спектр человеческого голоса.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Peak Normalization (0.92 Gain):</Body1Strong> automatically normalizes signal levels for quiet recordings captured from back rows, ensuring clear audibility for the Whisper neural network.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Пиковая нормализация громкости (0.92 Gain):</Body1Strong> автоматически выравнивает уровень сигнала тихих записей, сделанных с задних рядов аудитории, гарантируя четкую слышимость для нейросети Whisper.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Streaming 16 kHz Mono Conversion:</Body1Strong> native audio optimization for minimal RAM consumption and maximum processing speed.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Потоковая конвертация в моно 16 кГц:</Body1Strong> нативная оптимизация для минимального расхода оперативной памяти.
                    </>
                  )}
                </li>
              </ul>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Neural Speech Recognition Modes' : 'Режимы нейросетевого распознавания речи'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Balancing absolute precision and ultra-fast turnaround'
                  : 'Баланс между предельной детализацией и сверхбыстрой обработкой'}
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderModelsSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Two Recognition Modes:' : 'Два режима работы:'}</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '«Повышенная точность» (High Precision - Whisper Large v3):' : 'Кнопка «Повышенная точность» (Whisper Large v3):'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Employs the flagship Whisper architecture with 1.55 billion parameters. Recommended for complex mathematics, physics, medicine, and engineering lectures packed with Latin and Greek terminology, scientist names, and formulas.'
                      : 'Задействует флагманскую архитектуру Whisper с 1.55 миллиарда параметров. Рекомендуется для сложных математических, физических, медицинских и инженерных лекций с обилием латинских и греческих терминов, фамилий ученых и формул.'}
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '«Повышенная скорость» (High Speed - Whisper Large v3 Turbo):' : 'Кнопка «Повышенная скорость» (Whisper Large v3 Turbo):'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Specially optimized compact model (809M parameters) running 4-8x faster than standard models. Ideal for humanities, history, social sciences, quick review, and instantaneous transcription.'
                      : 'Специально оптимизированная компактная модель (809 млн параметров), работающая в 4–8 раз быстрее стандартной. Идеальна для гуманитарных дисциплин, истории, обществознания, быстрого ознакомления с материалом и мгновенной расшифровки.'}
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? 'Groq LPU Cloud Acceleration:' : 'Облачная обработка Groq LPU:'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Both recognition modes run via the high-speed Groq API, transcribing a 90-minute lecture in just 15-30 seconds with an active internet connection and a configured Groq API key.'
                      : 'Оба режима распознавания выполняются через высокоскоростной API Groq, расшифровывая полуторачасовую лекцию всего за 15–30 секунд при наличии интернет-подключения и ключа Groq API.'}
                  </Body1>
                </div>
              </div>
            </div>

            <div className={styles.calloutNote}>
              <Lightbulb20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>
                  {isEn ? 'Acoustic Chunk Bridging (3-Second Overlap)' : 'Акустический мостик (Chunk Bridging с 3-секундным перекрытием)'}
                </Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  {isEn
                    ? 'When processing long audio recordings, the algorithm maintains a 3-second overlap between chunks, preventing chopped or dropped words at segment boundaries.'
                    : 'При обработке длинных аудиозаписей алгоритм делает 3-секундный нахлест между сегментами, исключая потерю или обрыв слов на стыках аудиофрагментов.'}
                </Body1>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Speaker Diarization' : 'Разделение говорящих (Диаризация)'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Automatic speaker turn detection and dialogue structuring'
                  : 'Автоматическое определение смены спикеров и разметка диалогов'}
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderDiarizationSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'How Speaker Diarization Works:' : 'Как работает диаризация спикеров:'}</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>«Разделение спикеров» (Speaker Diarization) Toggle:</Body1Strong> activated in the top toolbar.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Тумблер «Разделение спикеров»:</Body1Strong> активируется в верхней панели окна.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>F0 Pitch Analysis:</Body1Strong> calculates the fundamental tone frequency and spectral centroid of every utterance via normalized autocorrelation, separating the lecturer's speech from student questions in the hall.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Спектральный анализ F0:</Body1Strong> алгоритм вычисляет фундаментальную частоту тона и спектральный центроид каждого высказывания через нормализованную автокорреляцию, отделяя голос преподавателя от голосов студентов из аудитории.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Speaker Labels:</Body1Strong> speech turns in the transcript are automatically labeled with tags such as `[Speaker 1]` and `[Speaker 2]`.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Метки реплик:</Body1Strong> в тексте транскрипта автоматически проставляются обозначения вида `[Спикер 1]` и `[Спикер 2]`.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>«Переименовать спикеров» (Rename Speakers) Button:</Body1Strong> allows replacing generic labels with actual participant names (for example, "Lecturer" and "Student") across the entire lecture in a single click.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Кнопка «Переименовать спикеров»:</Body1Strong> позволяет в один клик заменить обезличенные метки на настоящие имена (например, «Преподаватель» и «Студент») сразу по всей длине лекции.
                    </>
                  )}
                </li>
              </ul>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Intelligent Academic Notes' : 'Интеллектуальный академический конспект'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Deep lecture analysis across 5 required academic sections with KaTeX mathematical typesetting'
                  : 'Глубокий анализ лекции по 5 обязательным разделам с математической разметкой KaTeX'}
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderSmartNotesSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? '5 Required Note Sections (§§ 1–5):' : '5 обязательных разделов конспекта (§§ 1–5):'}</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '§ 1. Core Theses & Fundamental Concepts:' : '§ 1. Главные тезисы и фундаментальные идеи лекции:'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? '4-6 pivotal concepts elaborated in full paragraphs preserving original reasoning and academic rigor.'
                      : '4–6 узловых концепций лектора, раскрытых развернутыми абзацами с аргументацией и логикой первоисточника.'}
                  </Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '§ 2. Key Terms & Conceptual Framework:' : '§ 2. Ключевые термины и понятийный аппарат:'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Rigorous academic definitions for all discipline concepts, formulas, and properties.'
                      : 'Строгие академические определения всех понятий дисциплины с формулами и свойствами.'}
                  </Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '§ 3. Detailed Analytical Content (3.1–3.4):' : '§ 3. Подробное аналитическое содержание (3.1–3.4):'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Exhaustive breakdown of premises, theorems, classifications, formulas, and applied examples.'
                      : 'Исчерпывающий детальный разбор предпосылок, теорем, классификаций, формул и примеров.'}
                  </Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? '§ 4. Lecturer Accents, Nuances, and Common Traps:' : '§ 4. Акценты лектора, нюансы и частые ошибки:'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Critical exam subtleties, frequent student misunderstandings, and teacher remarks.'
                      : 'Подводные камни, типичные заблуждения студентов на экзаменах и важные замечания преподавателя.'}
                  </Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? "§ 5. In-Depth Self-Test Questions for Exam Prep from Nora:" : '§ 5. Вопросы для глубокой самопроверки к экзамену от Норы:'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? '5-7 exam-style review questions with pointers to specific topics for revision.'
                      : '5–7 проверочных экзаменационных вопросов с подсказками, какие темы нужно повторить.'}
                  </Body1>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Special Note-Taking Capabilities:' : 'Специальные возможности конспектирования:'}</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>KaTeX Mathematics:</Body1Strong> formulas are formatted in strict LaTeX syntax ($...$ for inline and $$...$$ for display equations) with instantaneous live rendering. For full syntax and supported symbols, see <ExternalLink href="https://katex.org">KaTeX.org</ExternalLink>.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Математика KaTeX:</Body1Strong> формулы оформляются в строгом синтаксисе LaTeX ($...$ для строчных и $$...$$ для вынесенных формул) с моментальным красивым рендерингом в интерфейсе. Подробнее о поддерживаемых формулах и синтаксисе см. в документации <ExternalLink href="https://katex.org">KaTeX.org</ExternalLink>.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>«Показывать цитаты преподавателя» (Show Lecturer Quotes):</Body1Strong> selectively includes 2-4 key conceptual quotes (&gt; "..." - Lecturer) with careful editorial cleanup of spoken slips without compromising theoretical depth.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Опция «Показывать цитаты преподавателя»:</Body1Strong> точечное включение 2–4 самых поворотных и концептуальных авторских высказываний лектора (&gt; «...» — Преподаватель) с аккуратным литературным исправлением устных оговорок без ущерба для объема теории.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Note Completion Guarantee:</Body1Strong> built-in continuation mechanism automatically finishes notes until Nora's signature line, preventing cut-offs.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Гарантия завершенности конспекта:</Body1Strong> встроенный механизм дописывания (Continuation) автоматически доводит конспект до финальной подписи Норы, исключая обрывы текста.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Groq API Key:</Body1Strong> note generation uses state-of-the-art LLMs. Specify your free API key in «Настройки» (Settings) via the top-left button. A free key takes less than a minute at <ExternalLink href="https://console.groq.com/keys">Groq Console</ExternalLink>.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Ключ Groq API:</Body1Strong> для анализа лекции и создания конспекта используется модель LLM. Укажите бесплатный ключ API в окне «Настройки» (кнопка в левом верхнем углу окна). Бесплатный ключ создается за минуту в <ExternalLink href="https://console.groq.com/keys">Groq Console</ExternalLink>.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Lecture Context Materials:</Body1Strong> attach slides (.pptx), Word documents (.docx), PDFs, or text notes directly above tabs. Nora extracts text in-memory to cross-reference spoken terminology with lecture slides and supplement formulas tagged as [From lecture materials / slides].
                    </>
                  ) : (
                    <>
                      <Body1Strong>Контекст занятия (материалы к лекции):</Body1Strong> прикрепляйте презентации (.pptx), документы (.docx), методички (.pdf) и заметки. Нора локально в памяти извлекает структуру и формулы, сверяет термины и дополняет конспект сведениями со слайдов с пометкой [Из материалов лекции / слайдов].
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Notes Preferences (Clarifying Context):</Body1Strong> a dedicated input field directly below lecture context allows you to provide custom instructions for Nora (e.g. explain a specific theorem in more depth, emphasize midterm topics, or adopt a particular format). Instructions are preserved within the active session.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Пожелания к конспекту (уточняющий контекст):</Body1Strong> поле ввода под контекстом занятия позволяет передать персональные пожелания Норе (например, детальнее разобрать конкретную теорему с доказательством, сделать акцент на вопросах к коллоквиуму или привести код на определенном языке). Текст пожеланий сохраняется в рамках текущей сессии.
                    </>
                  )}
                </li>
              </ul>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'File Export & Knowledge Base Organization' : 'Экспорт файлов и организация базы знаний'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Saving print-ready notes and managing your personal course archive'
                  : 'Сохранение конспектов для печати и ведение личного архива дисциплин'}
              </Caption1>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Export Formats:' : 'Форматы выгрузки:'}</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <Body1Strong>{isEn ? '«Word (.docx)» Button:' : 'Кнопка «Word (.docx)»:'}</Body1Strong>{' '}
                  {isEn
                    ? 'Creates a complete Microsoft Word document with headings, bullet lists, blockquotes, and academic formatting.'
                    : 'создает полноценный документ Microsoft Word со стилями заголовков, списками, цитатами и академическим шрифтом.'}
                </div>
                <div>
                  <Body1Strong>{isEn ? '«PDF (.pdf)» Button:' : 'Кнопка «PDF (.pdf)»:'}</Body1Strong>{' '}
                  {isEn
                    ? 'Generates a clean, print-ready PDF file ready for study or sharing with classmates.'
                    : 'генерирует готовый к печати PDF-файл для отправки одногруппникам или чтения на планшете.'}
                </div>
                <div>
                  <Body1Strong>{isEn ? '«Save .md» Button:' : 'Кнопка «Save .md»:'}</Body1Strong>{' '}
                  {isEn
                    ? 'Saves a pure Markdown file with LaTeX equations compatible with '
                    : 'сохраняет чистый файл Markdown с формулами LaTeX, совместимый с популярными инструментами: '}
                  <ExternalLink href="https://obsidian.md">Obsidian</ExternalLink>,{' '}
                  <ExternalLink href="https://notion.so">Notion</ExternalLink>, Logseq{' '}
                  {isEn ? 'and ' : 'и '}
                  <ExternalLink href="https://github.com">GitHub</ExternalLink>.
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Folder Tree and Sidebar Lecture History:' : 'Дерево каталогов и история лекций в сайдбаре:'}</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Course Folders:</Body1Strong> group recordings by subject ("Discrete Mathematics", "Calculus", "Computer Science").
                    </>
                  ) : (
                    <>
                      <Body1Strong>Создание папок предметов:</Body1Strong> группируйте записи по предметам («Дискретная математика», «Высшая математика», «Программирование»).
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Drag & Drop Lecture Organization:</Body1Strong> lecture files can be dragged with your mouse into any folder, moved between folders, or moved back to the root level by dropping them onto the "Drop here to move out of folder" area at the bottom of the sidebar or onto any root file.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Перетаскивание файлов мышью (Drag & Drop):</Body1Strong> файлы лекций можно свободно перетаскивать левой кнопкой мыши внутрь любых папок, переносить из одной папки в другую, а также выносить из папок обратно в корень дерева — для этого просто перетащите файл на блок «Перетащите сюда для выноса из папки» внизу сайдбара или на любой файл в корне.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Lecture Sorting:</Body1Strong> the dropdown above the folder tree enables instant sorting by creation date (newest first / oldest first) and alphabetically (A to Z / Z to A) across root files and inside every folder.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Сортировка лекций:</Body1Strong> выпадающий список над деревом каталогов позволяет мгновенно упорядочивать лекции по дате создания (сначала новые или сначала старые) и по названию / алфавиту (от А до Я или от Я до А). Сортировка применяется как к корневым файлам, так и внутри каждой папки.
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>Global Full-Text Search:</Body1Strong> the search bar at the top of the sidebar searches across all previously saved transcripts and notes with keyword highlighting (hotkey: Ctrl+F).
                    </>
                  ) : (
                    <>
                      <Body1Strong>Сквозной поиск по лекциям:</Body1Strong> строка поиска вверху сайдбара ищет совпадения по тексту всех сохраненных ранее занятий с подсветкой найденных фрагментов (горячая клавиша Ctrl+F).
                    </>
                  )}
                </li>
                <li>
                  {isEn ? (
                    <>
                      <Body1Strong>«Новая сессия» (New Session) Button:</Body1Strong> instantly resets the current workspace for uploading your next audio file.
                    </>
                  ) : (
                    <>
                      <Body1Strong>Кнопка «Новая сессия»:</Body1Strong> мгновенный сброс текущей рабочей области для загрузки следующего аудиофайла.
                    </>
                  )}
                </li>
              </ul>
            </div>
          </>
        );

      case 6:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                {isEn ? 'Frequently Asked Questions (FAQ) & Pro Tips' : 'Частые вопросы (FAQ) и полезные советы'}
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                {isEn
                  ? 'Recommendations for achieving the best transcription and note quality'
                  : 'Рекомендации для достижения наилучшего качества конспектов'}
              </Caption1>
            </div>

            <div className={styles.calloutNote}>
              <Lightbulb20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>
                  {isEn
                    ? 'How to get the best recording quality on a smartphone or voice recorder?'
                    : 'Как лучше записывать лекцию на телефон или диктофон?'}
                </Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  {isEn
                    ? 'Place your device with the microphone oriented toward the lecturer. If the lecturer moves around or speaks softly, the built-in DSP filter and peak normalization will automatically boost speech clarity and reduce room echo.'
                    : 'Кладите телефон микрофоном в сторону преподавателя. Если лектор ходит по аудитории или говорит тихо, встроенный DSP-фильтр и нормализация громкости автоматически усилят речь и срежут эхо аудитории.'}
                </Body1>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>{isEn ? 'Frequently Asked Questions:' : 'Популярные вопросы:'}</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? 'Is an internet connection required to transcribe audio?' : 'Нужен ли интернет для расшифровки аудио?'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Yes. High-speed speech recognition (Whisper Large v3 and Turbo) and smart note generation rely on the Groq cloud API, requiring an active internet connection and a Groq API key. All preliminary audio cleanup (80 Hz DSP filter, peak normalization) and speaker diarization (F0) run completely locally on your computer.'
                      : 'Да, для скоростного распознавания речи (модели Whisper Large v3 и Turbo) и генерации умного конспекта используется облачный API Groq, поэтому требуется активное подключение к интернету и ключ Groq API. Вся первичная очистка звука (DSP-фильтр 80 Гц, пиковая нормализация) и диаризация спикеров (F0) выполняются локально на вашем компьютере.'}
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? 'Where can I get a free Groq API key?' : 'Где взять бесплатный ключ Groq API?'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn ? (
                      <>
                        Sign up at <ExternalLink href="https://console.groq.com/keys">console.groq.com/keys</ExternalLink> and in the "API Keys" section create a free key starting with <code style={{ fontSize: '12px' }}>gsk_...</code>. Then click the «Настройки» (Settings) button in the top-left corner of the window and paste the key into the API key field.
                      </>
                    ) : (
                      <>
                        Зарегистрируйтесь на сайте <ExternalLink href="https://console.groq.com/keys">console.groq.com/keys</ExternalLink> и в разделе «API Keys» создайте бесплатный ключ вида <code>gsk_...</code>. Затем нажмите кнопку «Настройки» в левом верхнем углу окна и вставьте ключ в соответствующее поле — он необходим для расшифровки лекций и создания конспектов.
                      </>
                    )}
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? 'How do I change the interface language?' : 'Как изменить язык интерфейса?'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Click «Настройки» (Settings) in the top-left corner (next to the «Инструкция» / Guide button) and choose Russian or English. The interface switches instantaneously.'
                      : 'Нажмите кнопку «Настройки» в левом верхнем углу окна (рядом с кнопкой «Инструкция») и выберите Русский или Английский язык. Интерфейс переключится мгновенно.'}
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>
                    {isEn ? 'How do I switch between the transcript and smart notes?' : 'Как переключаться между транскриптом и конспектом?'}
                  </Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    {isEn
                      ? 'Use the «Полный транскрипт» (Full Transcript) and «Умный конспект (.md)» (Smart Notes .md) tabs above the text editor. In the notes tab, you can toggle between «Предпросмотр» (LaTeX Preview) and «Редактировать» (Markdown Edit) modes.'
                      : 'Используйте вкладки «Полный транскрипт» и «Умный конспект (.md)» над текстовым полем. Во вкладке конспекта доступны кнопки «Предпросмотр» (рендеринг LaTeX) и «Редактировать» (правка разметки).'}
                  </Body1>
                </div>
              </div>
            </div>

            <div className={styles.calloutWarning}>
              <Warning20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>
                  {isEn ? 'Crash Protection & Auto-Saving' : 'Защита от сбоев и автосохранение'}
                </Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  {isEn
                    ? 'All transcribed lectures and generated notes are saved automatically to your local history. You can safely close the application anytime without losing your study data.'
                    : 'Все расшифрованные лекции и созданные конспекты автоматически сохраняются в вашей локальной истории. Вы можете безопасно закрывать приложение — данные останутся в дереве лекций.'}
                </Body1>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleGroup}>
              <BookQuestionMark24Regular style={{ color: tokens.colorBrandForeground1 }} />
              <div className={styles.modalTitleContainer}>
                <DialogTitle style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'block' }}>
                  {isEn ? 'Nora Listener User Guide' : 'Руководство пользователя Nora Listener'}
                </DialogTitle>
                <Caption1 block style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                  {isEn
                    ? 'Comprehensive illustrated guide to all features and capabilities'
                    : 'Исчерпывающая иллюстрированная инструкция по всем возможностям программы'}
                </Caption1>
              </div>
            </div>
            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} aria-label={isEn ? 'Close' : 'Закрыть'} />
          </div>

          {/* Body with Sidebar & Content */}
          <div className={styles.bodyLayout}>
            {/* Left Navigation Sidebar */}
            <div className={styles.navSidebar}>
              <Input
                contentBefore={<Search20Regular />}
                placeholder={isEn ? 'Search guide sections...' : 'Поиск по разделам...'}
                value={searchQuery}
                onChange={(_, data) => setSearchQuery(data.value)}
                size="small"
              />
              <div className={styles.navList}>
                {filteredChapters.map((chapter) => {
                  const isActive = activeChapter === chapter.id;
                  return (
                    <button
                      key={chapter.id}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      onClick={() => setActiveChapter(chapter.id)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {chapter.icon}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Body1Strong style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chapter.title}
                        </Body1Strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Scrollable Content */}
            <div className={styles.contentArea}>
              {renderChapterContent()}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className={styles.footerNav}>
            <Button
              appearance="secondary"
              icon={<ArrowLeft16Regular />}
              disabled={activeChapter === 0}
              onClick={() => setActiveChapter(prev => Math.max(0, prev - 1))}
            >
              {isEn ? 'Back' : 'Назад'}
            </Button>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              {isEn ? `Section ${activeChapter + 1} of ${chapters.length}` : `Раздел ${activeChapter + 1} из ${chapters.length}`}
            </Caption1>
            <Button
              appearance="primary"
              icon={<ArrowRight16Regular />}
              iconPosition="after"
              disabled={activeChapter === chapters.length - 1}
              onClick={() => setActiveChapter(prev => Math.min(chapters.length - 1, prev + 1))}
            >
              {isEn ? 'Next' : 'Далее'}
            </Button>
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
