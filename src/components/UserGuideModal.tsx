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

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const styles = useStyles();
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chapters = useMemo(() => [
    {
      id: 0,
      title: '1. Обзор и быстрый старт',
      icon: <Sparkle24Regular />,
      description: 'Архитектура Nora Listener, ключевые принципы работы и мгновенный запуск.',
    },
    {
      id: 1,
      title: '2. Загрузка и DSP-очистка',
      icon: <Mic24Regular />,
      description: 'Поддерживаемые форматы, Drag & Drop, фильтр 80 Гц и нормализация громкости.',
    },
    {
      id: 2,
      title: '3. Модели распознавания',
      icon: <BrainCircuit24Regular />,
      description: 'Повышенная точность (Large v3) vs Повышенная скорость (Turbo), склейка сегментов.',
    },
    {
      id: 3,
      title: '4. Разделение спикеров',
      icon: <People24Regular />,
      description: 'Диаризация, спектральный анализ F0 и переименование преподавателя и студентов.',
    },
    {
      id: 4,
      title: '5. Умный конспект и KaTeX',
      icon: <DocumentText24Regular />,
      description: '5 академических разделов (§ 1 – § 5), математические формулы, цитаты лектора.',
    },
    {
      id: 5,
      title: '6. Экспорт и организация',
      icon: <ArrowDownload24Regular />,
      description: 'Выгрузка в Word (.docx), PDF и Markdown (.md), дерево папок и поиск по записям.',
    },
    {
      id: 6,
      title: '7. Частые вопросы и советы',
      icon: <QuestionCircle24Regular />,
      description: 'Рекомендации по записи лекций на диктофон, устранение ошибок и полезные советы.',
    },
  ], []);

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
      <text x="65" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">Аудиозапись</text>
      <text x="65" y="150" fill="#9CA3AF" fontSize="10" textAnchor="middle">MP3, WAV, MP4</text>

      {/* Block 2: DSP Filter */}
      <rect x="170" y="55" width="120" height="110" rx="12" fill="url(#gBlue)" stroke="#106EBE" strokeWidth="1.5" />
      <path d="M 185 105 Q 210 75 230 105 T 275 105" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      <text x="230" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">DSP-фильтр</text>
      <text x="230" y="150" fill="#E0F2FE" fontSize="10" textAnchor="middle">80 Гц + 0.92 Gain</text>

      {/* Block 3: Whisper AI */}
      <rect x="340" y="55" width="120" height="110" rx="12" fill="url(#gTeal)" stroke="#005A4E" strokeWidth="1.5" />
      <circle cx="400" cy="95" r="18" fill="#FFFFFF" opacity="0.25" />
      <text x="400" y="100" fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="middle">Whisper</text>
      <text x="400" y="135" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">Распознавание</text>
      <text x="400" y="150" fill="#CCFBF1" fontSize="10" textAnchor="middle">Точность / Турбо</text>

      {/* Block 4: Diarization & Smart Notes */}
      <rect x="510" y="55" width="120" height="110" rx="12" fill="url(#gPurple)" stroke="#553480" strokeWidth="1.5" />
      <text x="570" y="90" fill="#E9D5FF" fontSize="11" fontWeight="600" textAnchor="middle">Диаризация</text>
      <line x1="530" y1="100" x2="610" y2="100" stroke="#A855F7" strokeWidth="1" />
      <text x="570" y="120" fill="#FFFFFF" fontSize="11" fontWeight="600" textAnchor="middle">Умный конспект</text>
      <text x="570" y="137" fill="#E9D5FF" fontSize="10" textAnchor="middle">5 разделов LaTeX</text>
      <text x="570" y="152" fill="#D8B4FE" fontSize="9" textAnchor="middle">Цитаты лектора</text>

      {/* Block 5: Export */}
      <rect x="670" y="55" width="80" height="110" rx="12" fill="url(#gDark)" stroke="#444" strokeWidth="1.5" />
      <rect x="685" y="70" width="50" height="16" rx="4" fill="#2563EB" />
      <text x="710" y="82" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">DOCX</text>
      <rect x="685" y="93" width="50" height="16" rx="4" fill="#DC2626" />
      <text x="710" y="105" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">PDF</text>
      <rect x="685" y="116" width="50" height="16" rx="4" fill="#059669" />
      <text x="710" y="128" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">MD</text>
      <text x="710" y="152" fill="#9CA3AF" fontSize="10" textAnchor="middle">Экспорт</text>
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
      <text x="110" y="45" fill="#F87171" fontSize="11" fontWeight="bold" textAnchor="middle">Срез шумов</text>
      <text x="110" y="60" fill="#FCA5A5" fontSize="9" textAnchor="middle">Гул, вибрации, вентиляторы</text>
      <text x="180" y="160" fill="#EF4444" fontSize="10" fontWeight="bold" textAnchor="middle">80 Гц</text>

      {/* Clean Human Voice Curve */}
      <path d="M 40 135 C 120 135 160 130 190 70 C 220 30 260 55 300 45 C 360 30 420 80 490 60 C 560 40 620 90 675 120" 
            fill="none" stroke="#38BDF8" strokeWidth="3.5" />
      
      {/* Peak Normalization Line (0.92 gain) */}
      <line x1="40" y1="35" x2="675" y2="35" stroke="#10B981" strokeWidth="1.5" />
      <text x="610" y="28" fill="#34D399" fontSize="10" fontWeight="bold">Пиковый лимит (0.92 Gain)</text>

      {/* Axis Labels */}
      <text x="40" y="160" fill="#71717A" fontSize="10">20 Гц</text>
      <text x="350" y="160" fill="#38BDF8" fontSize="10" fontWeight="bold" textAnchor="middle">Диапазон разборчивой речи лектора (200 Гц – 4 кГц)</text>
      <text x="675" y="160" fill="#71717A" fontSize="10" textAnchor="end">16 кГц</text>
    </svg>
  );

  const renderModelsSvg = () => (
    <svg viewBox="0 0 720 170" width="100%" height="170" style={{ maxWidth: '680px' }}>
      {/* Card 1: Accuracy Mode */}
      <rect x="20" y="15" width="325" height="140" rx="10" fill="#0F172A" stroke="#1E3A8A" strokeWidth="2" />
      <circle cx="50" cy="45" r="14" fill="#3B82F6" />
      <path d="M 44 45 L 48 49 L 57 40" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <text x="75" y="42" fill="#FFFFFF" fontSize="14" fontWeight="bold">Повышенная точность</text>
      <text x="75" y="58" fill="#93C5FD" fontSize="10">Whisper Large v3 (1.55 млрд параметров)</text>
      
      <text x="40" y="90" fill="#E2E8F0" fontSize="11">• Высшая точность распознавания терминов и формул</text>
      <text x="40" y="110" fill="#E2E8F0" fontSize="11">• Идеально для математики, физики и программирования</text>
      <text x="40" y="130" fill="#94A3B8" fontSize="10">Скорость: 1.5x–2x от реального времени лекции</text>

      {/* Card 2: Speed Mode */}
      <rect x="375" y="15" width="325" height="140" rx="10" fill="#064E3B" stroke="#047857" strokeWidth="2" />
      <circle cx="405" cy="45" r="14" fill="#10B981" />
      <path d="M 400 45 L 408 40 L 404 46 L 410 46 L 401 53 L 403 47 Z" fill="#FFFFFF" />
      <text x="430" y="42" fill="#FFFFFF" fontSize="14" fontWeight="bold">Повышенная скорость</text>
      <text x="430" y="58" fill="#A7F3D0" fontSize="10">Whisper Large v3 Turbo (809 млн параметров)</text>
      
      <text x="395" y="90" fill="#ECFDF5" fontSize="11">• В 4–8 раз быстрее стандартной обработки</text>
      <text x="395" y="110" fill="#ECFDF5" fontSize="11">• Отличная расшифровка гуманитарных и обзорных пар</text>
      <text x="395" y="130" fill="#A7F3D0" fontSize="10">Минимальное потребление ОЗУ на ноутбуке</text>
    </svg>
  );

  const renderDiarizationSvg = () => (
    <svg viewBox="0 0 720 170" width="100%" height="170" style={{ maxWidth: '680px' }}>
      <rect x="15" y="10" width="690" height="150" rx="10" fill="#18181B" stroke="#27272A" strokeWidth="1.5" />
      
      {/* Speaker 1 (Lecturer) Track */}
      <rect x="35" y="25" width="130" height="24" rx="6" fill="#1D4ED8" />
      <text x="100" y="41" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">[Спикер 1] Преподаватель</text>
      <path d="M 180 37 Q 240 15 300 37 T 420 37" fill="none" stroke="#60A5FA" strokeWidth="3" />
      <rect x="430" y="25" width="250" height="24" rx="4" fill="#1E293B" />
      <text x="440" y="41" fill="#94A3B8" fontSize="10">«Рассмотрим фундаментальное свойство...»</text>

      {/* Speaker 2 (Student) Track */}
      <rect x="35" y="70" width="130" height="24" rx="6" fill="#B45309" />
      <text x="100" y="86" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">[Спикер 2] Студент</text>
      <path d="M 280 82 Q 330 65 380 82" fill="none" stroke="#FBBF24" strokeWidth="3" />
      <rect x="390" y="70" width="290" height="24" rx="4" fill="#1E293B" />
      <text x="400" y="86" fill="#FDE68A" fontSize="10">«А входит ли ноль в натуральные числа?»</text>

      {/* Rename Action Flow */}
      <line x1="35" y1="112" x2="685" y2="112" stroke="#333" strokeDasharray="3,3" />
      <rect x="35" y="122" width="170" height="26" rx="6" fill="#0284C7" />
      <text x="120" y="139" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">Переименовать спикеров</text>
      <text x="220" y="139" fill="#A1A1AA" fontSize="11">Заменяет все метки [Спикер X] на настоящие имена во всей лекции в один клик</text>
    </svg>
  );

  const renderSmartNotesSvg = () => (
    <svg viewBox="0 0 720 180" width="100%" height="180" style={{ maxWidth: '680px' }}>
      <rect x="15" y="10" width="690" height="160" rx="10" fill="#1E1E24" stroke="#33333E" strokeWidth="1.5" />

      {/* Section 1 */}
      <rect x="30" y="25" width="200" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="40" y="42" fill="#60A5FA" fontSize="11" fontWeight="bold">§ 1. Главные тезисы</text>
      <text x="40" y="56" fill="#A1A1AA" fontSize="9">4–6 фундаментальных идей</text>

      {/* Section 2 */}
      <rect x="245" y="25" width="215" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="255" y="42" fill="#34D399" fontSize="11" fontWeight="bold">§ 2. Понятийный аппарат</text>
      <text x="255" y="56" fill="#A1A1AA" fontSize="9">Строгие академические термины</text>

      {/* Section 3 */}
      <rect x="475" y="25" width="215" height="40" rx="6" fill="#252530" stroke="#3F3F4E" />
      <text x="485" y="42" fill="#F472B6" fontSize="11" fontWeight="bold">§ 3. Анализ лекции</text>
      <text x="485" y="56" fill="#A1A1AA" fontSize="9">Блоки 3.1–3.4 с доказательствами</text>

      {/* KaTeX Box Preview */}
      <rect x="30" y="75" width="310" height="80" rx="6" fill="#0F172A" stroke="#2563EB" />
      <text x="42" y="95" fill="#38BDF8" fontSize="11" fontWeight="bold">Математический рендеринг KaTeX</text>
      <rect x="42" y="105" width="286" height="38" rx="4" fill="#1E293B" />
      <text x="185" y="129" fill="#E2E8F0" fontSize="13" fontWeight="bold" textAnchor="middle">$$\forall x\;(x \in \varnothing \implies x \in A)$$</text>

      {/* Quotes Feature Box */}
      <rect x="360" y="75" width="330" height="80" rx="6" fill="#1C1917" stroke="#D97706" />
      <text x="372" y="95" fill="#FBBF24" fontSize="11" fontWeight="bold">Цитаты преподавателя (2–4 ключевые)</text>
      <rect x="372" y="105" width="306" height="38" rx="4" fill="#292524" />
      <text x="382" y="122" fill="#FDE68A" fontSize="10">» «Множество — это совокупность элементов...»</text>
      <text x="382" y="136" fill="#A8A29E" fontSize="9">— Преподаватель (литературная вычитка речи)</text>
    </svg>
  );

  const renderChapterContent = () => {
    switch (activeChapter) {
      case 0:
        return (
          <>
            <div className={styles.chapterHeader}>
              <Title3 as="h2" block className={styles.chapterTitle}>
                Обзор и быстрый старт с Nora Listener
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Персональный академический ИИ-ассистент для студентов и преподавателей
              </Caption1>
            </div>

            <div className={styles.calloutNote}>
              <Info20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>Скоростное распознавание Groq и локальная DSP-очистка</Body1Strong>
                <Body1 style={{ display: 'block' }}>
                  Аудиозапись проходит локальную цифровую предобработку (фильтр 80 Гц, нормализация) и диаризацию спикеров на вашем ПК, а распознавание речи (Whisper Large v3 / Turbo) и составление конспектов выполняются через высокоскоростной API Groq.
                </Body1>
              </div>
            </div>

            <div className={styles.diagramContainer}>
              {renderArchitectureSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Пошаговый порядок работы:</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span className={styles.stepNumber}>1</span>
                  <Body1Strong>Перетащите файл</Body1Strong> с лекцией в центральную зону или нажмите для выбора из проводника.
                </div>
                <div>
                  <span className={styles.stepNumber}>2</span>
                  <Body1Strong>Выберите режим распознавания:</Body1Strong> «Повышенная точность» (Whisper Large v3) для точных наук или «Повышенная скорость» (Whisper Large v3 Turbo) для быстрой расшифровки.
                </div>
                <div>
                  <span className={styles.stepNumber}>3</span>
                  <Body1Strong>Нажмите кнопку «Расшифровать»</Body1Strong> и наблюдайте за ходом в интерактивном визуализаторе звука.
                </div>
                <div>
                  <span className={styles.stepNumber}>4</span>
                  <Body1Strong>Сформируйте конспект:</Body1Strong> нажмите кнопку «Сделать умный конспект» для получения готового конспекта с формулами LaTeX и разделами к экзамену (ключ Groq API задается в окне «Настройки»).
                </div>
                <div>
                  <span className={styles.stepNumber}>5</span>
                  <Body1Strong>Экспортируйте результат</Body1Strong> в формат Word (.docx), PDF или Markdown (.md) одной кнопкой.
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
                Загрузка аудио и цифровая предобработка (DSP)
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Устранение фоновых шумов аудитории и нормализация громкости тихих реплик
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderDspSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Поддерживаемые медиаформаты</Subtitle2>
              <Body1>
                Nora Listener автоматически извлекает аудиодорожку из любых распространенных форматов:
              </Body1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Badge appearance="filled" color="brand">MP3</Badge>
                <Badge appearance="filled" color="brand">WAV</Badge>
                <Badge appearance="filled" color="brand">M4A</Badge>
                <Badge appearance="filled" color="brand">AAC</Badge>
                <Badge appearance="filled" color="brand">FLAC</Badge>
                <Badge appearance="filled" color="brand">OGG</Badge>
                <Badge appearance="filled" color="informative">MP4 (Видео)</Badge>
                <Badge appearance="filled" color="informative">MKV (Видео)</Badge>
                <Badge appearance="filled" color="informative">WebM</Badge>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Встроенный алгоритм очистки звука (DSP Pipeline):</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  <Body1Strong>Высокочастотный фильтр Баттерворта 80 Гц (80 Hz Butterworth High-Pass):</Body1Strong> отсекает низкочастотные гулы аудитории, шум вентиляции, вибрации стола от диктофона и дыхание в микрофон, сохраняя весь спектр человеческого голоса.
                </li>
                <li>
                  <Body1Strong>Пиковая нормализация громкости (0.92 Gain):</Body1Strong> автоматически выравнивает уровень сигнала тихих записей, сделанных с задних рядов аудитории, гарантируя четкую слышимость для нейросети Whisper.
                </li>
                <li>
                  <Body1Strong>Потоковая конвертация в моно 16 кГц:</Body1Strong> нативная оптимизация для минимального расхода оперативной памяти.
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
                Режимы нейросетевого распознавания речи
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Баланс между предельной детализацией и сверхбыстрой обработкой
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderModelsSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Два режима работы:</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Кнопка «Повышенная точность» (Whisper Large v3):</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Задействует флагманскую архитектуру Whisper с 1.55 миллиарда параметров. Рекомендуется для сложных математических, физических, медицинских и инженерных лекций с обилием латинских и греческих терминов, фамилий ученых и формул.
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Кнопка «Повышенная скорость» (Whisper Large v3 Turbo):</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Специально оптимизированная компактная модель (809 млн параметров), работающая в 4–8 раз быстрее стандартной. Идеальна для гуманитарных дисциплин, истории, обществознания, быстрого ознакомления с материалом и мгновенной расшифровки.
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Облачная обработка Groq LPU:</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Оба режима распознавания выполняются через высокоскоростной API Groq, расшифровывая полуторачасовую лекцию всего за 15–30 секунд при наличии интернет-подключения и ключа Groq API.
                  </Body1>
                </div>
              </div>
            </div>

            <div className={styles.calloutNote}>
              <Lightbulb20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>Акустический мостик (Chunk Bridging с 3-секундным перекрытием)</Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  При обработке длинных аудиозаписей алгоритм делает 3-секундный нахлест между сегментами, исключая потерю или обрыв слов на стыках аудиофрагментов.
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
                Разделение говорящих (Диаризация)
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Автоматическое определение смены спикеров и разметка диалогов
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderDiarizationSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Как работает диаризация спикеров:</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  <Body1Strong>Тумблер «Разделение спикеров»:</Body1Strong> активируется в верхней панели окна.
                </li>
                <li>
                  <Body1Strong>Спектральный анализ F0:</Body1Strong> алгоритм вычисляет фундаментальную частоту тона и спектральный центроид каждого высказывания через нормализованную автокорреляцию, отделяя голос преподавателя от голосов студентов из аудитории.
                </li>
                <li>
                  <Body1Strong>Метки реплик:</Body1Strong> в тексте транскрипта автоматически проставляются обозначения вида `[Спикер 1]` и `[Спикер 2]`.
                </li>
                <li>
                  <Body1Strong>Кнопка «Переименовать спикеров»:</Body1Strong> позволяет в один клик заменить обезличенные метки на настоящие имена (например, «Преподаватель» и «Студент») сразу по всей длине лекции.
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
                Интеллектуальный академический конспект
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Глубокий анализ лекции по 5 обязательным разделам с математической разметкой KaTeX
              </Caption1>
            </div>

            <div className={styles.diagramContainer}>
              {renderSmartNotesSvg()}
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>5 обязательных разделов конспекта (§§ 1–5):</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>§ 1. Главные тезисы и фундаментальные идеи лекции:</Body1Strong>
                  <Body1 style={{ display: 'block' }}>4–6 узловых концепций лектора, раскрытых развернутыми абзацами с аргументацией и логикой первоисточника.</Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>§ 2. Ключевые термины и понятийный аппарат:</Body1Strong>
                  <Body1 style={{ display: 'block' }}>Строгие академические определения всех понятий дисциплины с формулами и свойствами.</Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>§ 3. Подробное аналитическое содержание (3.1–3.4):</Body1Strong>
                  <Body1 style={{ display: 'block' }}>Исчерпывающий детальный разбор предпосылок, теорем, классификаций, формул и примеров.</Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>§ 4. Акценты лектора, нюансы и частые ошибки:</Body1Strong>
                  <Body1 style={{ display: 'block' }}>Подводные камни, типичные заблуждения студентов на экзаменах и важные замечания преподавателя.</Body1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>§ 5. Вопросы для глубокой самопроверки к экзамену от Норы:</Body1Strong>
                  <Body1 style={{ display: 'block' }}>5–7 проверочных экзаменационных вопросов с подсказками, какие темы нужно повторить.</Body1>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Специальные возможности конспектирования:</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  <Body1Strong>Математика KaTeX:</Body1Strong> формулы оформляются в строгом синтаксисе LaTeX ($...$ для строчных и $$...$$ для вынесенных формул) с моментальным красивым рендерингом в интерфейсе. Подробнее о поддерживаемых формулах и синтаксисе см. в документации <ExternalLink href="https://katex.org">KaTeX.org</ExternalLink>.
                </li>
                <li>
                  <Body1Strong>Опция «Показывать цитаты преподавателя»:</Body1Strong> точечное включение 2–4 самых поворотных и концептуальных авторских высказываний лектора (&gt; «...» — Преподаватель) с аккуратным литературным исправлением устных оговорок без ущерба для объема теории.
                </li>
                <li>
                  <Body1Strong>Гарантия завершенности конспекта:</Body1Strong> встроенный механизм дописывания (Continuation) автоматически доводит конспект до финальной подписи Норы, исключая обрывы текста.
                </li>
                <li>
                  <Body1Strong>Ключ Groq API:</Body1Strong> для анализа лекции и создания конспекта используется модель LLM. Укажите бесплатный ключ API в окне «Настройки» (кнопка в левом верхнем углу окна). Бесплатный ключ создается за минуту в <ExternalLink href="https://console.groq.com/keys">Groq Console</ExternalLink>.
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
                Экспорт файлов и организация базы знаний
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Сохранение конспектов для печати и ведение личного архива дисциплин
              </Caption1>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Форматы выгрузки:</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <Body1Strong>Кнопка «Word (.docx)»:</Body1Strong> создает полноценный документ Microsoft Word со стилями заголовков, списками, цитатами и академическим шрифтом.
                </div>
                <div>
                  <Body1Strong>Кнопка «PDF (.pdf)»:</Body1Strong> генерирует готовый к печати PDF-файл для отправки одногруппникам или чтения на планшете.
                </div>
                <div>
                  <Body1Strong>Кнопка «Save .md»:</Body1Strong> сохраняет чистый файл Markdown с формулами LaTeX, совместимый с популярными инструментами: <ExternalLink href="https://obsidian.md">Obsidian</ExternalLink>, <ExternalLink href="https://notion.so">Notion</ExternalLink>, Logseq и <ExternalLink href="https://github.com">GitHub</ExternalLink>.
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Дерево каталогов и история лекций в сайдбаре:</Subtitle2>
              <ul className={styles.bulletList}>
                <li>
                  <Body1Strong>Создание папок предметов:</Body1Strong> группируйте записи по предметам («Дискретная математика», «Высшая математика», «Программирование»).
                </li>
                <li>
                  <Body1Strong>Перетаскивание файлов мышью (Drag & Drop):</Body1Strong> файлы лекций можно свободно перетаскивать левой кнопкой мыши внутрь любых папок, переносить из одной папки в другую, а также выносить из папок обратно в корень дерева — для этого просто перетащите файл на блок «Перетащите сюда для выноса из папки» внизу сайдбара или на любой файл в корне.
                </li>
                <li>
                  <Body1Strong>Сортировка лекций:</Body1Strong> выпадающий список над деревом каталогов позволяет мгновенно упорядочивать лекции по дате создания (сначала новые или сначала старые) и по названию / алфавиту (от А до Я или от Я до А). Сортировка применяется как к корневым файлам, так и внутри каждой папки.
                </li>
                <li>
                  <Body1Strong>Сквозной поиск по лекциям:</Body1Strong> строка поиска вверху сайдбара ищет совпадения по тексту всех сохраненных ранее занятий с подсветкой найденных фрагментов (горячая клавиша Ctrl+F).
                </li>
                <li>
                  <Body1Strong>Кнопка «Новая сессия»:</Body1Strong> мгновенный сброс текущей рабочей области для загрузки следующего аудиофайла.
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
                Частые вопросы (FAQ) и полезные советы
              </Title3>
              <Caption1 block className={styles.chapterSubtitle}>
                Рекомендации для достижения наилучшего качества конспектов
              </Caption1>
            </div>

            <div className={styles.calloutNote}>
              <Lightbulb20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>Как лучше записывать лекцию на телефон или диктофон?</Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  Кладите телефон микрофоном в сторону преподавателя. Если лектор ходит по аудитории или говорит тихо, встроенный DSP-фильтр и нормализация громкости автоматически усилят речь и срежут эхо аудитории.
                </Body1>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <Subtitle2>Популярные вопросы:</Subtitle2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Нужен ли интернет для расшифровки аудио?</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Да, для скоростного распознавания речи (модели Whisper Large v3 и Turbo) и генерации умного конспекта используется облачный API Groq, поэтому требуется активное подключение к интернету и ключ Groq API. Вся первичная очистка звука (DSP-фильтр 80 Гц, пиковая нормализация) и диаризация спикеров (F0) выполняются локально на вашем компьютере.
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Где взять бесплатный ключ Groq API?</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Зарегистрируйтесь на сайте <ExternalLink href="https://console.groq.com/keys">console.groq.com/keys</ExternalLink> и в разделе «API Keys» создайте бесплатный ключ вида `gsk_...`. Затем нажмите кнопку «Настройки» в левом верхнем углу окна и вставьте ключ в соответствующее поле — он необходим для расшифровки лекций и создания конспектов.
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Как изменить язык интерфейса?</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Нажмите кнопку «Настройки» в левом верхнем углу окна (рядом с кнопкой «Инструкция») и выберите Русский или Английский язык. Интерфейс переключится мгновенно.
                  </Body1>
                </div>
                <Divider />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <Body1Strong style={{ display: 'block' }}>Как переключаться между транскриптом и конспектом?</Body1Strong>
                  <Body1 style={{ display: 'block' }}>
                    Используйте вкладки «Полный транскрипт» и «Умный конспект (.md)» над текстовым полем. Во вкладке конспекта доступны кнопки «Предпросмотр» (рендеринг LaTeX) и «Редактировать» (правка разметки).
                  </Body1>
                </div>
              </div>
            </div>

            <div className={styles.calloutWarning}>
              <Warning20Regular style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Body1Strong style={{ display: 'block' }}>Защита от сбоев и автосохранение</Body1Strong>
                <Body1 style={{ display: 'block', marginTop: '2px' }}>
                  Все расшифрованные лекции и созданные конспекты автоматически сохраняются в вашей локальной истории. Вы можете безопасно закрывать приложение — данные останутся в дереве лекций.
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
                  Руководство пользователя Nora Listener
                </DialogTitle>
                <Caption1 block style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                  Исчерпывающая иллюстрированная инструкция по всем возможностям программы
                </Caption1>
              </div>
            </div>
            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} aria-label="Закрыть" />
          </div>

          {/* Body with Sidebar & Content */}
          <div className={styles.bodyLayout}>
            {/* Left Navigation Sidebar */}
            <div className={styles.navSidebar}>
              <Input
                contentBefore={<Search20Regular />}
                placeholder="Поиск по разделам..."
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
              Назад
            </Button>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              Раздел {activeChapter + 1} из {chapters.length}
            </Caption1>
            <Button
              appearance="primary"
              icon={<ArrowRight16Regular />}
              iconPosition="after"
              disabled={activeChapter === chapters.length - 1}
              onClick={() => setActiveChapter(prev => Math.min(chapters.length - 1, prev + 1))}
            >
              Далее
            </Button>
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
