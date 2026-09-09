import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type AiMode = 'online' | 'offline';
type Language = 'ru' | 'en';
export type RecognitionMode = 'accuracy' | 'speed';
export type LectureSortOrder = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

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
    }),
    {
      name: 'app-store', // key in localStorage
    }
  )
);
