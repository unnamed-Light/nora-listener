import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type AiMode = 'online' | 'offline';
type Language = 'ru' | 'en';
export type RecognitionMode = 'accuracy' | 'speed';
export type LectureSortOrder = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

export const DEFAULT_NORA_PROMPT = "Ты — Нора, персональный академический ИИ-ассистент и внимательный конспектировщик лекций приложения «Nora Listener».\nТвоя цель — составить подробный, исчерпывающий и структурированный конспект лекции строго по тексту аудиозаписи в формате Markdown на русском языке.\n\nОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:\n1. Пиши максимально подробно, развернуто и обстоятельно. Ни в коем случае не сокращай изложение лекции, подробно раскрывай все пункты, понятия, примеры и подразделы 3.1–3.4. Обязательно раскрой все 5 разделов (§ 1 – § 5).\n2. СТРОГО ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ЭМОДЗИ И СМАЙЛИКИ! Для оформления используй исключительно строгие типографские символы (§, •, —, ◆, -).\n3. СТРОГО ЗАПРЕЩЕНО выводить теги <think>, <thought> или внутренние служебные рассуждения. Начинай ответ СРАЗУ с заголовка первого уровня (#).\n4. МАТЕМАТИЧЕСКАЯ РАЗМЕТКА: Все математические формулы, переменные, множества, отношения и кванторы оформляй СТРОГО в стандартном синтаксисе LaTeX ($...$ для строчных и $$...$$ для вынесенных формул). Категорически запрещено оставлять формулы простым текстом без знаков доллара.\n5. СТРОГАЯ ЗАВЕРШЕННОСТЬ ВСЕХ РАЗДЕЛОВ: Ответ обязан быть ПОЛНОСТЬЮ завершенным, целостным и законченным. Категорически запрещено обрывать текст или оставлять разделы недописанными! Обязательно раскрой все 5 разделов (§ 1 – § 5) и заверши конспект финальной строкой *Конспект сформирован Норой. Успехов в подготовке к занятиям и экзаменам!*.\n\nОБЯЗАТЕЛЬНАЯ СТРУКТУРА КОНСПЕКТА:\n# [Название темы лекции (сформулируй по реальным словам лектора)]\n\n## § 1. Главные тезисы и фундаментальные идеи лекции\n(Выдели 4–6 ключевых концепций лектора. Каждый тезис оформи развернутым абзацем с объяснением сути, логики и аргументации преподавателя, а не просто короткой фразой.)\n\n## § 2. Ключевые термины и понятийный аппарат\n(Приведи строгие академические определения ВСЕХ упомянутых в лекции терминов, понятий, теорем и законов с математическими обозначениями и свойствами.)\n\n## § 3. Подробное аналитическое содержание\n(Разбей материал лекции на 2–4 логических подраздела 3.1, 3.2, ... и максимально обстоятельно, абзац за абзацем, изложи предпосылки, выкладки, примеры, свойства, доказательства и классификации, которые озвучил лектор.)\n\n## § 4. Акценты лектора, нюансы и частые ошибки\n(Отрази важные замечания лектора, практические советы, типичные ошибки студентов на экзаменах, тонкости определений и нюансы, на которые преподаватель обращал особое внимание аудитории.)\n\n## § 5. Вопросы для глубокой самопроверки к экзамену от Норы\n(Сформулируй 5–7 содержательных вопросов для подготовки к коллоквиуму или экзамену, проверяющих понимание сути темы, с краткими подсказками, на что обратить внимание при ответе.)";

interface AppState {
  theme: Theme;
  aiMode: AiMode;
  language: Language;
  apiKey: string;
  lastSaveDirectory: string;
  selectedMicrophoneId: string;
  enableDiarization: boolean;
  recognitionMode: RecognitionMode;
  lectureSortOrder: LectureSortOrder;
  sidebarWidth: number;
  splitViewRatio: number;
  isSplitView: boolean;
  customPrompt: string;
  toggleTheme: () => void;
  setAiMode: (mode: AiMode) => void;
  setLanguage: (lang: Language) => void;
  setApiKey: (key: string) => void;
  setLastSaveDirectory: (dir: string) => void;
  setSelectedMicrophoneId: (id: string) => void;
  setEnableDiarization: (enabled: boolean) => void;
  setRecognitionMode: (mode: RecognitionMode) => void;
  setLectureSortOrder: (order: LectureSortOrder) => void;
  setSidebarWidth: (width: number) => void;
  setSplitViewRatio: (ratio: number) => void;
  setIsSplitView: (isSplit: boolean) => void;
  setCustomPrompt: (prompt: string) => void;
  resetPromptToDefault: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      aiMode: 'online',
      language: 'ru',
      apiKey: '',
      lastSaveDirectory: '',
      selectedMicrophoneId: '',
      enableDiarization: false,
      recognitionMode: 'accuracy',
      lectureSortOrder: 'date-desc',
      sidebarWidth: 280,
      splitViewRatio: 50,
      isSplitView: false,
      customPrompt: DEFAULT_NORA_PROMPT,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setAiMode: (mode) => set({ aiMode: mode }),
      setLanguage: (lang) => set({ language: lang }),
      setApiKey: (key) => set({ apiKey: key }),
      setLastSaveDirectory: (dir: string) => set({ lastSaveDirectory: dir }),
      setSelectedMicrophoneId: (id: string) => set({ selectedMicrophoneId: id }),
      setEnableDiarization: (enabled) => set({ enableDiarization: enabled }),
      setRecognitionMode: (mode) => set({ recognitionMode: mode }),
      setLectureSortOrder: (order) => set({ lectureSortOrder: order }),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(550, width)) }),
      setSplitViewRatio: (ratio) => set({ splitViewRatio: Math.max(20, Math.min(80, ratio)) }),
      setIsSplitView: (isSplit) => set({ isSplitView: isSplit }),
      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
      resetPromptToDefault: () => set({ customPrompt: DEFAULT_NORA_PROMPT }),
    }),
    {
      name: 'app-store',
    }
  )
);
