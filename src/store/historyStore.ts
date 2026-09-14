import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TranscriptionStatus = 'pending' | 'completed' | 'failed';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root
  createdAt: string;
}

export interface Transcription {
  id: string;
  title: string;
  date: string;
  text: string;
  status: TranscriptionStatus;
  path?: string;
  summary?: string;
  clarifyingPrompt?: string;
  folderId?: string | null; // null = root
  createdAt?: string;
}

interface HistoryState {
  folders: Folder[];
  history: Transcription[];
  expandedFolderIds: string[];

  // Folder actions
  createFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, targetParentId: string | null) => boolean;
  toggleFolderExpanded: (id: string) => void;

  // Transcription actions
  addTranscription: (transcription: Transcription) => void;
  renameTranscription: (id: string, newTitle: string) => void;
  updateTranscription: (id: string, data: Partial<Transcription>) => void;
  moveTranscription: (id: string, targetFolderId: string | null) => void;
  removeTranscription: (id: string) => void;
  clearHistory: () => void;
}

// Helper: prevent cycle when moving folder into itself or its descendant
function isDescendant(folders: Folder[], ancestorId: string, potentialChildId: string | null): boolean {
  if (!potentialChildId) return false;
  if (ancestorId === potentialChildId) return true;
  const current = folders.find((f) => f.id === potentialChildId);
  if (!current || !current.parentId) return false;
  return isDescendant(folders, ancestorId, current.parentId);
}

// Helper: collect all descendant IDs of a folder (for recursive deletion)
function getDescendantFolderIds(folders: Folder[], folderId: string): string[] {
  const children = folders.filter((f) => f.parentId === folderId);
  let ids = children.map((c) => c.id);
  for (const child of children) {
    ids = ids.concat(getDescendantFolderIds(folders, child.id));
  }
  return ids;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      folders: [],
      history: [],
      expandedFolderIds: [],

      createFolder: (name, parentId = null) => {
        const id = 'folder_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
        const newFolder: Folder = {
          id,
          name: name.trim() || 'Новая папка',
          parentId: parentId || null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          folders: [...(state.folders || []), newFolder],
          expandedFolderIds: parentId
            ? Array.from(new Set([...(state.expandedFolderIds || []), parentId, id]))
            : [...(state.expandedFolderIds || []), id],
        }));
        return id;
      },

      renameFolder: (id, newName) => {
        const cleanName = newName.trim();
        if (!cleanName) return;
        set((state) => ({
          folders: (state.folders || []).map((f) => (f.id === id ? { ...f, name: cleanName } : f)),
        }));
      },

      deleteFolder: (id) => {
        const state = get();
        const allFolderIdsToDelete = [id, ...getDescendantFolderIds(state.folders || [], id)];
        const deleteSet = new Set(allFolderIdsToDelete);

        set((state) => ({
          folders: (state.folders || []).filter((f) => !deleteSet.has(f.id)),
          history: (state.history || []).filter((t) => !t.folderId || !deleteSet.has(t.folderId)),
          expandedFolderIds: (state.expandedFolderIds || []).filter((fId) => !deleteSet.has(fId)),
        }));
      },

      moveFolder: (id, targetParentId) => {
        const state = get();
        if (id === targetParentId || isDescendant(state.folders || [], id, targetParentId)) {
          return false;
        }
        set((state) => ({
          folders: (state.folders || []).map((f) => (f.id === id ? { ...f, parentId: targetParentId } : f)),
          expandedFolderIds: targetParentId
            ? Array.from(new Set([...(state.expandedFolderIds || []), targetParentId]))
            : state.expandedFolderIds,
        }));
        return true;
      },

      toggleFolderExpanded: (id) => {
        set((state) => {
          const current = state.expandedFolderIds || [];
          return {
            expandedFolderIds: current.includes(id)
              ? current.filter((fId) => fId !== id)
              : [...current, id],
          };
        });
      },

      addTranscription: (transcription) =>
        set((state) => ({
          history: [
            {
              ...transcription,
              folderId: transcription.folderId ?? null,
              createdAt: transcription.createdAt || new Date().toISOString(),
            },
            ...(state.history || []),
          ],
        })),

      renameTranscription: (id, newTitle) => {
        const cleanTitle = newTitle.trim();
        if (!cleanTitle) return;
        set((state) => ({
          history: (state.history || []).map((t) => (t.id === id ? { ...t, title: cleanTitle } : t)),
        }));
      },

      updateTranscription: (id, data) =>
        set((state) => ({
          history: (state.history || []).map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      moveTranscription: (id, targetFolderId) =>
        set((state) => ({
          history: (state.history || []).map((t) => (t.id === id ? { ...t, folderId: targetFolderId } : t)),
          expandedFolderIds: targetFolderId
            ? Array.from(new Set([...(state.expandedFolderIds || []), targetFolderId]))
            : state.expandedFolderIds,
        })),

      removeTranscription: (id) =>
        set((state) => ({
          history: (state.history || []).filter((t) => t.id !== id),
        })),

      clearHistory: () => set({ history: [], folders: [], expandedFolderIds: [] }),
    }),
    {
      name: 'transcription-history-storage',
    }
  )
);

