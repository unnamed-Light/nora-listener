import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  makeStyles, shorthands, Button, Input, tokens, Body1, Body1Strong,
  Badge, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent,
  DialogActions, Select
} from '@fluentui/react-components';
import {
  Folder20Regular, FolderOpen20Regular, FolderAdd16Regular,
  ChevronRight16Regular, ChevronDown16Regular, Edit16Regular,
  Delete16Regular, ArrowMove20Regular, DocumentBulletList20Regular,
  CheckmarkRegular, DismissRegular, Search20Regular, Dismiss16Regular,
  ArrowSort20Regular, ArrowUpload20Regular
} from '@fluentui/react-icons';
import { useHistory, type Folder, type Transcription } from '../store/historyStore';
import { useAppStore, type LectureSortOrder } from '../store/appStore';
import { HighlightText } from './HighlightText';
import { countMatches, getContextSnippet } from '../lib/searchUtils';

const useStyles = makeStyles({
  treeContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    overflowY: 'auto',
    flexGrow: 1,
    paddingRight: '4px',
  },
  searchCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('8px', '10px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
    marginBottom: '6px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.borderColor(tokens.colorBrandStroke1),
    },
  },
  searchCardActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    ...shorthands.borderLeft('3px', 'solid', tokens.colorBrandStroke1),
  },
  folderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('4px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      '& .node-actions': {
        opacity: 1,
        visibility: 'visible',
      },
    },
  },
  folderRowDragOver: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorBrandStroke1),
  },
  folderMain: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    flexGrow: 1,
    overflow: 'hidden',
  },
  folderTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
    fontWeight: '600',
  },
  nodeActions: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    opacity: 0,
    visibility: 'hidden',
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('4px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      '& .node-actions': {
        opacity: 1,
        visibility: 'visible',
      },
    },
    '&:active': {
      cursor: 'grabbing',
    },
  },
  itemRowActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderLeft('3px', 'solid', tokens.colorBrandStroke1),
  },
  itemRowDragOver: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorBrandStroke1),
  },
  dragHandle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    color: tokens.colorNeutralForeground4,
    '&:hover': {
      color: tokens.colorBrandForeground1,
    },
    marginRight: '2px',
    flexShrink: 0,
    touchAction: 'none',
  },
  floatingGhost: {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 99999,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `0 4px 16px rgba(0, 0, 0, 0.28)`,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('6px', '12px'),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    fontSize: '12px',
    fontWeight: '600',
    color: tokens.colorBrandForeground1,
    maxWidth: '260px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    transform: 'translate(14px, 14px)',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    flexGrow: 1,
    overflow: 'hidden',
  },
  itemTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  rootDropZone: {
    ...shorthands.padding('8px'),
    ...shorthands.border('1px', 'dashed', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    textAlign: 'center',
    fontSize: '11px',
    color: tokens.colorNeutralForeground4,
    marginTop: '8px',
    transition: 'all 0.15s ease',
  },
  rootDropZoneActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground1,
  },
});

// Helper to sort lectures
const sortLectures = (items: Transcription[], order: LectureSortOrder, lang: string): Transcription[] => {
  return [...items].sort((a, b) => {
    if (order === 'title-asc') {
      return a.title.localeCompare(b.title, lang, { numeric: true, sensitivity: 'base' });
    }
    if (order === 'title-desc') {
      return b.title.localeCompare(a.title, lang, { numeric: true, sensitivity: 'base' });
    }
    const getTime = (t: Transcription) => {
      if (t.createdAt) {
        const d = Date.parse(t.createdAt);
        if (!isNaN(d)) return d;
      }
      const numId = Number(t.id);
      if (!isNaN(numId) && numId > 1000000000000) return numId;
      const parsedDate = Date.parse(t.date);
      if (!isNaN(parsedDate)) return parsedDate;
      return 0;
    };
    const timeA = getTime(a);
    const timeB = getTime(b);
    if (order === 'date-asc') {
      return timeA - timeB;
    }
    return timeB - timeA; // 'date-desc' default
  });
};

// Helper to sort folders alphabetically
const sortFolders = (list: Folder[], lang: string): Folder[] => {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, lang, { numeric: true, sensitivity: 'base' }));
};

interface FolderTreeProps {
  currentSessionId: string | null;
  onSelectTranscription: (item: Transcription, targetTab?: 'transcript' | 'summary', query?: string) => void;
  onNewSession: () => void;
  language: 'ru' | 'en';
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Module-level fallback for drag-and-drop operations
let activeDragNode: { type: 'folder' | 'item'; id: string } | null = null;

export const FolderTree: React.FC<FolderTreeProps> = ({
  currentSessionId,
  onSelectTranscription,
  onNewSession,
  language,
  searchQuery,
  onSearchChange,
}) => {
  const styles = useStyles();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { lectureSortOrder, setLectureSortOrder } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    folders = [],
    history = [],
    expandedFolderIds = [],
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    toggleFolderExpanded,
    moveTranscription,
    renameTranscription,
    removeTranscription,
  } = useHistory();

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return history
      .map((item) => {
        const inTitle = item.title.toLowerCase().includes(q);
        const inText = item.text.toLowerCase().includes(q);
        const inSummary = (item.summary || '').toLowerCase().includes(q);

        if (!inTitle && !inText && !inSummary) return null;

        const titleMatches = countMatches(item.title, q);
        const textMatches = countMatches(item.text, q);
        const summaryMatches = countMatches(item.summary || '', q);
        const totalMatches = titleMatches + textMatches + summaryMatches;

        let snippet = '';
        let matchLocation: 'transcript' | 'summary' | 'title' = 'title';
        if (inSummary) {
          snippet = getContextSnippet(item.summary || '', q);
          matchLocation = 'summary';
        } else if (inText) {
          snippet = getContextSnippet(item.text, q);
          matchLocation = 'transcript';
        } else {
          snippet = item.title;
          matchLocation = 'title';
        }

        const folder = folders.find((f) => f.id === item.folderId);

        return {
          item,
          totalMatches,
          snippet,
          matchLocation,
          folderName: folder ? folder.name : null,
        };
      })
      .filter(Boolean) as {
        item: Transcription;
        totalMatches: number;
        snippet: string;
        matchLocation: 'transcript' | 'summary' | 'title';
        folderName: string | null;
      }[];
  }, [history, folders, searchQuery]);

  // Dialog states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingTarget, setRenamingTarget] = useState<{ type: 'folder' | 'item'; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingTarget, setMovingTarget] = useState<{ type: 'folder' | 'item'; id: string; name: string } | null>(null);
  const [targetFolderChoice, setTargetFolderChoice] = useState<string>('root');

  const [isRootDragOver, setIsRootDragOver] = useState(false);

  // Pointer & mouse drag state
  const [dragState, setDragState] = useState<{
    id: string;
    title: string;
    type: 'item' | 'folder';
    x: number;
    y: number;
  } | null>(null);

  const [hoverTargetId, setHoverTargetId] = useState<string | null | 'root'>(null);
  const [hoverItemId, setHoverItemId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; item: { id: string; title: string; type: 'item' | 'folder' } } | null>(null);
  const isDraggingRef = useRef(false);
  const autoExpandTimer = useRef<number | null>(null);

  const onPointerDownRow = (e: React.PointerEvent, type: 'item' | 'folder', id: string, title: string) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, .node-actions')) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY, item: { id, title, type } };
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (dragStartPos.current && !dragState) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if (dx > 4 || dy > 4) {
          isDraggingRef.current = true;
          setDragState({
            id: dragStartPos.current.item.id,
            title: dragStartPos.current.item.title,
            type: dragStartPos.current.item.type,
            x: e.clientX,
            y: e.clientY,
          });
        }
      } else if (dragState) {
        setDragState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));

        const elem = document.elementFromPoint(e.clientX, e.clientY);
        if (!elem) {
          setHoverTargetId(null);
          setHoverItemId(null);
          return;
        }

        const folderElem = elem.closest('[data-folder-id]');
        const rootElem = elem.closest('[data-drop-root]');
        const itemElem = elem.closest('[data-item-id]');

        if (folderElem) {
          const fid = folderElem.getAttribute('data-folder-id');
          setHoverTargetId(fid);
          setHoverItemId(null);
          if (fid && !expandedFolderIds.includes(fid) && !autoExpandTimer.current) {
            autoExpandTimer.current = window.setTimeout(() => {
              toggleFolderExpanded(fid);
              autoExpandTimer.current = null;
            }, 450);
          }
        } else if (itemElem) {
          const iid = itemElem.getAttribute('data-item-id');
          const fid = itemElem.getAttribute('data-item-folder-id');
          setHoverItemId(iid);
          setHoverTargetId(fid || 'root');
        } else if (rootElem) {
          setHoverTargetId('root');
          setHoverItemId(null);
        } else {
          setHoverTargetId(null);
          setHoverItemId(null);
          if (autoExpandTimer.current) {
            clearTimeout(autoExpandTimer.current);
            autoExpandTimer.current = null;
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (autoExpandTimer.current) {
        clearTimeout(autoExpandTimer.current);
        autoExpandTimer.current = null;
      }

      if (dragState) {
        const elem = document.elementFromPoint(e.clientX, e.clientY);
        let targetFid: string | null = null;
        let droppedOnValidTarget = false;

        if (elem) {
          const folderElem = elem.closest('[data-folder-id]');
          const rootElem = elem.closest('[data-drop-root]');
          const itemElem = elem.closest('[data-item-id]');

          if (folderElem) {
            targetFid = folderElem.getAttribute('data-folder-id');
            droppedOnValidTarget = true;
          } else if (rootElem) {
            targetFid = null;
            droppedOnValidTarget = true;
          } else if (itemElem) {
            targetFid = itemElem.getAttribute('data-item-folder-id') || null;
            droppedOnValidTarget = true;
          }
        }

        if (droppedOnValidTarget) {
          if (dragState.type === 'item') {
            moveTranscription(dragState.id, targetFid);
          } else if (dragState.type === 'folder') {
            if (dragState.id !== targetFid) {
              moveFolder(dragState.id, targetFid);
            }
          }
        }

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 60);
      } else {
        isDraggingRef.current = false;
      }

      dragStartPos.current = null;
      setDragState(null);
      setHoverTargetId(null);
      setHoverItemId(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState, expandedFolderIds, toggleFolderExpanded, moveTranscription, moveFolder]);

  useEffect(() => {
    if (dragState) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [dragState]);

  // Drag-and-drop helpers (HTML5)
  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'item', id: string) => {
    dragStartPos.current = null;
    setDragState(null);
    activeDragNode = { type, id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.setData('application/nora-node', JSON.stringify({ type, id }));
    e.stopPropagation();
  };

  const handleDragEnd = () => {
    activeDragNode = null;
    setIsRootDragOver(false);
    setHoverTargetId(null);
    setHoverItemId(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    let node = activeDragNode;
    if (!node) {
      try {
        const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/nora-node');
        if (raw) node = JSON.parse(raw);
      } catch {}
    }
    if (!node) return;
    try {
      if (node.type === 'folder') {
        if (node.id !== targetFolderId) {
          moveFolder(node.id, targetFolderId);
        }
      } else if (node.type === 'item') {
        moveTranscription(node.id, targetFolderId);
      }
    } catch (err) {
      console.error(err);
    }
    activeDragNode = null;
  };

  const openCreateFolder = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setCreateModalOpen(true);
  };

  const submitCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim(), createParentId);
    }
    setCreateModalOpen(false);
  };

  const openRename = (type: 'folder' | 'item', id: string, currentName: string) => {
    setRenamingTarget({ type, id, name: currentName });
    setRenameValue(currentName);
    setRenameModalOpen(true);
  };

  const submitRename = () => {
    if (renamingTarget && renameValue.trim()) {
      if (renamingTarget.type === 'folder') {
        renameFolder(renamingTarget.id, renameValue.trim());
      } else {
        renameTranscription(renamingTarget.id, renameValue.trim());
      }
    }
    setRenameModalOpen(false);
  };

  const openMoveModal = (type: 'folder' | 'item', id: string, name: string) => {
    setMovingTarget({ type, id, name });
    setTargetFolderChoice('root');
    setMoveModalOpen(true);
  };

  const submitMove = () => {
    if (movingTarget) {
      const targetId = targetFolderChoice === 'root' ? null : targetFolderChoice;
      if (movingTarget.type === 'folder') {
        moveFolder(movingTarget.id, targetId);
      } else {
        moveTranscription(movingTarget.id, targetId);
      }
    }
    setMoveModalOpen(false);
  };

  // Helper to build list of valid destination folders for move dialog
  const getEligibleMoveFolders = () => {
    if (!movingTarget) return [];
    if (movingTarget.type === 'item') return folders;
    // For moving a folder, exclude itself and its descendants
    const excludeIds = new Set<string>([movingTarget.id]);
    const addDescendants = (parentId: string) => {
      folders.filter((f) => f.parentId === parentId).forEach((child) => {
        excludeIds.add(child.id);
        addDescendants(child.id);
      });
    };
    addDescendants(movingTarget.id);
    return folders.filter((f) => !excludeIds.has(f.id));
  };

  // Recursive folder node renderer
  const renderFolderNode = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolderIds.includes(folder.id);
    const subfolders = sortFolders(folders.filter((f) => f.parentId === folder.id), language);
    const folderItems = sortLectures(history.filter((t) => t.folderId === folder.id), lectureSortOrder, language);

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 12}px` }}>
        <FolderItemRow
          folder={folder}
          isExpanded={isExpanded}
          isHoverTarget={hoverTargetId === folder.id}
          onToggle={() => toggleFolderExpanded(folder.id)}
          onAddSubfolder={() => openCreateFolder(folder.id)}
          onRename={() => openRename('folder', folder.id, folder.name)}
          onMove={() => openMoveModal('folder', folder.id, folder.name)}
          onDelete={() => deleteFolder(folder.id)}
          onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onPointerDown={(e) => onPointerDownRow(e, 'folder', folder.id, folder.name)}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
          isDraggingRef={isDraggingRef}
        />
        {isExpanded && (
          <div>
            {subfolders.map((childFolder) => renderFolderNode(childFolder, level + 1))}
            {folderItems.map((item) => (
              <TranscriptionItemRow
                key={item.id}
                item={item}
                isActive={currentSessionId === item.id}
                isHoverTarget={hoverItemId === item.id || hoverTargetId === folder.id}
                level={level + 1}
                language={language}
                onSelect={() => onSelectTranscription(item)}
                onRename={() => openRename('item', item.id, item.title)}
                onMove={() => openMoveModal('item', item.id, item.title)}
                onDelete={() => {
                  removeTranscription(item.id);
                  if (currentSessionId === item.id) onNewSession();
                }}
                onDragStart={(e) => handleDragStart(e, 'item', item.id)}
                onDragEnd={handleDragEnd}
                onPointerDown={(e) => onPointerDownRow(e, 'item', item.id, item.title)}
                onDropOnItem={(e, targetFolderId) => handleDropOnFolder(e, targetFolderId)}
                isDraggingRef={isDraggingRef}
              />
            ))}
            {subfolders.length === 0 && folderItems.length === 0 && (
              <div
                data-folder-id={folder.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                style={{
                  marginLeft: `${(level + 1) * 12 + 16}px`,
                  fontSize: '11px',
                  color: tokens.colorNeutralForeground4,
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: hoverTargetId === folder.id ? `1px dashed ${tokens.colorBrandStroke1}` : 'none',
                  backgroundColor: hoverTargetId === folder.id ? tokens.colorBrandBackground2 : 'transparent',
                }}
              >
                {language === 'ru' ? 'Пустая папка (перетащите сюда)' : 'Empty folder (drop here)'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Root level folders and items
  const rootFolders = sortFolders(folders.filter((f) => !f.parentId), language);
  const rootItems = sortLectures(history.filter((t) => !t.folderId), lectureSortOrder, language);

  return (
    <div className={styles.treeContainer} data-tree-container="true">
      {/* Floating Ghost Badge while dragging */}
      {dragState && (
        <div
          className={styles.floatingGhost}
          style={{
            left: `${dragState.x}px`,
            top: `${dragState.y}px`,
          }}
        >
          {dragState.type === 'folder' ? (
            <Folder20Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
          ) : (
            <DocumentBulletList20Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
          )}
          <span>{dragState.title}</span>
        </div>
      )}
      {/* Global Search Input */}
      <div style={{ marginBottom: '8px', flexShrink: 0 }}>
        <Input
          ref={searchInputRef}
          size="small"
          style={{ width: '100%' }}
          placeholder={language === 'ru' ? 'Поиск по лекциям (Ctrl+F)...' : 'Search lectures (Ctrl+F)...'}
          contentBefore={<Search20Regular style={{ color: tokens.colorNeutralForeground3 }} />}
          contentAfter={
            searchQuery ? (
              <Button
                size="small"
                appearance="subtle"
                icon={<Dismiss16Regular />}
                onClick={() => onSearchChange('')}
                title={language === 'ru' ? 'Очистить' : 'Clear'}
              />
            ) : undefined
          }
          value={searchQuery}
          onChange={(_, data) => onSearchChange(data.value)}
        />
      </div>

      {searchQuery.trim() ? (
        /* Search Results Panel */
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, marginBottom: '6px' }}>
            <Body1Strong style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              {language === 'ru' ? 'Результаты поиска' : 'Search Results'}
            </Body1Strong>
            <Badge appearance="filled" color={searchResults.length > 0 ? 'brand' : 'informative'} size="small">
              {searchResults.length} {language === 'ru' ? 'найдено' : 'found'}
            </Badge>
          </div>

          {searchResults.length === 0 ? (
            <div style={{ color: tokens.colorNeutralForeground4, padding: '16px 4px', textAlign: 'center', fontSize: '12px' }}>
              {language === 'ru' ? 'Ничего не найдено по запросу' : 'No matches found'} "{searchQuery}"
            </div>
          ) : (
            searchResults.map(({ item, totalMatches, snippet, matchLocation, folderName }) => {
              const isActive = currentSessionId === item.id;
              const badgeText = matchLocation === 'summary' 
                ? (language === 'ru' ? 'В конспекте' : 'In Summary')
                : matchLocation === 'transcript'
                ? (language === 'ru' ? 'В транскрипте' : 'In Transcript')
                : (language === 'ru' ? 'В названии' : 'In Title');

              return (
                <div
                  key={item.id}
                  className={`${styles.searchCard} ${isActive ? styles.searchCardActive : ''}`}
                  onClick={() => onSelectTranscription(item, matchLocation === 'summary' ? 'summary' : 'transcript', searchQuery)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <Body1Strong style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <HighlightText text={item.title} query={searchQuery} />
                    </Body1Strong>
                    <Badge appearance="tint" color="brand" size="small">
                      {totalMatches} {language === 'ru' ? 'совп.' : 'match'}
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: tokens.colorNeutralForeground3 }}>
                    <Badge appearance="outline" size="small">
                      {badgeText}
                    </Badge>
                    {folderName && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {folderName}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{item.date}</span>
                  </div>

                  {snippet && (
                    <div style={{ fontSize: '11px', color: tokens.colorNeutralForeground2, marginTop: '2px', lineHeight: '1.4' }}>
                      <HighlightText text={snippet} query={searchQuery} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Normal Folder Tree View */
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, marginBottom: '6px', flexShrink: 0 }}>
            <Body1Strong style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              {language === 'ru' ? 'Структура папок' : 'Folder Tree'}
            </Body1Strong>
            <Button 
              size="small" 
              appearance="subtle" 
              icon={<FolderAdd16Regular />} 
              onClick={() => openCreateFolder(null)}
              title={language === 'ru' ? 'Создать корневую папку' : 'Create root folder'}
            >
              {language === 'ru' ? 'Папка' : 'Folder'}
            </Button>
          </div>

          {/* Sort Selector Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: tokens.colorNeutralForeground3 }}>
              <ArrowSort20Regular style={{ fontSize: '14px', flexShrink: 0 }} />
              <span>{language === 'ru' ? 'Сортировка:' : 'Sort:'}</span>
            </div>
            <Select
              size="small"
              value={lectureSortOrder}
              onChange={(_, data) => setLectureSortOrder(data.value as LectureSortOrder)}
              style={{ fontSize: '11px', minWidth: '145px' }}
            >
              <option value="date-desc">{language === 'ru' ? 'Сначала новые' : 'Newest first'}</option>
              <option value="date-asc">{language === 'ru' ? 'Сначала старые' : 'Oldest first'}</option>
              <option value="title-asc">{language === 'ru' ? 'По названию (А-Я)' : 'By title (A-Z)'}</option>
              <option value="title-desc">{language === 'ru' ? 'По названию (Я-А)' : 'By title (Z-A)'}</option>
            </Select>
          </div>

          {rootFolders.map((f) => renderFolderNode(f, 0))}
          {rootItems.map((item) => (
            <TranscriptionItemRow
              key={item.id}
              item={item}
              isActive={currentSessionId === item.id}
              isHoverTarget={hoverItemId === item.id}
              level={0}
              language={language}
              onSelect={() => onSelectTranscription(item)}
              onRename={() => openRename('item', item.id, item.title)}
              onMove={() => openMoveModal('item', item.id, item.title)}
              onDelete={() => {
                removeTranscription(item.id);
                if (currentSessionId === item.id) onNewSession();
              }}
              onDragStart={(e) => handleDragStart(e, 'item', item.id)}
              onDragEnd={handleDragEnd}
              onPointerDown={(e) => onPointerDownRow(e, 'item', item.id, item.title)}
              onDropOnItem={(e, targetFolderId) => handleDropOnFolder(e, targetFolderId)}
              isDraggingRef={isDraggingRef}
            />
          ))}

          {rootFolders.length === 0 && rootItems.length === 0 && (
            <Body1 style={{ color: tokens.colorNeutralForeground4, padding: '12px 0' }}>
              {language === 'ru' ? 'История пуста' : 'History is empty'}
            </Body1>
          )}

          {/* Root drop zone for dragging items back to root level */}
          <div
            data-drop-root="true"
            className={`${styles.rootDropZone} ${(isRootDragOver || hoverTargetId === 'root') ? styles.rootDropZoneActive : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              setIsRootDragOver(true);
            }}
            onDragLeave={() => setIsRootDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsRootDragOver(false);
              handleDropOnFolder(e, null);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ArrowUpload20Regular style={{ fontSize: '14px' }} />
              <span>{language === 'ru' ? 'Перетащите сюда для выноса из папки' : 'Drop here to move out of folder'}</span>
            </div>
          </div>
        </>
      )}

      {/* Create folder modal */}
      <Dialog open={createModalOpen} onOpenChange={(_, data) => setCreateModalOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '400px' }}>
          <DialogBody>
            <DialogTitle>{language === 'ru' ? 'Создать папку' : 'Create Folder'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <Input
                placeholder={language === 'ru' ? 'Название папки...' : 'Folder name...'}
                value={newFolderName}
                onChange={(_, data) => setNewFolderName(data.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCreateFolder()}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCreateModalOpen(false)}>
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </Button>
              <Button appearance="primary" onClick={submitCreateFolder}>
                {language === 'ru' ? 'Создать' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Rename modal */}
      <Dialog open={renameModalOpen} onOpenChange={(_, data) => setRenameModalOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '400px' }}>
          <DialogBody>
            <DialogTitle>
              {language === 'ru'
                ? renamingTarget?.type === 'folder' ? 'Переименовать папку' : 'Переименовать файл'
                : 'Rename'}
            </DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <Input
                value={renameValue}
                onChange={(_, data) => setRenameValue(data.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRenameModalOpen(false)}>
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </Button>
              <Button appearance="primary" onClick={submitRename}>
                {language === 'ru' ? 'Сохранить' : 'Save'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Move modal */}
      <Dialog open={moveModalOpen} onOpenChange={(_, data) => setMoveModalOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '440px' }}>
          <DialogBody>
            <DialogTitle>
              {language === 'ru' ? `Переместить «${movingTarget?.name}»` : `Move "${movingTarget?.name}"`}
            </DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <Body1>{language === 'ru' ? 'Выберите целевую папку:' : 'Select target destination:'}</Body1>
              <Select value={targetFolderChoice} onChange={(_, data) => setTargetFolderChoice(data.value)}>
                <option value="root">{language === 'ru' ? '[Корень] (Без папки)' : '[Root] (No folder)'}</option>
                {getEligibleMoveFolders().map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setMoveModalOpen(false)}>
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </Button>
              <Button appearance="primary" onClick={submitMove}>
                {language === 'ru' ? 'Переместить' : 'Move'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

// Sub-component for individual transcription row with drag & drop support
const TranscriptionItemRow: React.FC<{
  item: Transcription;
  isActive: boolean;
  isHoverTarget?: boolean;
  level: number;
  language: 'ru' | 'en';
  onSelect: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDropOnItem: (e: React.DragEvent, targetFolderId: string | null) => void;
  isDraggingRef?: React.MutableRefObject<boolean>;
}> = ({
  item,
  isActive,
  isHoverTarget = false,
  level,
  language,
  onSelect,
  onRename,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDropOnItem,
  isDraggingRef,
}) => {
  const styles = useStyles();
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      data-item-id={item.id}
      data-item-folder-id={item.folderId || ''}
      onPointerDown={onPointerDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDropOnItem(e, item.folderId ?? null);
      }}
      onClick={() => {
        if (isDraggingRef?.current) return;
        onSelect();
      }}
      className={`${styles.itemRow} ${isActive ? styles.itemRowActive : ''} ${
        isDragOver || isHoverTarget ? styles.itemRowDragOver : ''
      }`}
      style={{ marginLeft: `${level * 12}px` }}
    >
      <div className={styles.itemMain} onPointerDown={onPointerDown}>
        <DocumentBulletList20Regular style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }} />
        <span className={styles.itemTitle} title={item.title}>
          {item.title}
        </span>
        {item.summary && (
          <Badge appearance="filled" color="brand" size="small">
            <CheckmarkRegular style={{ fontSize: '10px' }} />
          </Badge>
        )}
      </div>

      <div className={`node-actions ${styles.nodeActions}`} onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          appearance="subtle"
          icon={<Edit16Regular />}
          onClick={onRename}
          title={language === 'ru' ? 'Переименовать' : 'Rename'}
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowMove20Regular />}
          onClick={onMove}
          title={language === 'ru' ? 'Переместить в папку' : 'Move to folder'}
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<DismissRegular />}
          onClick={onDelete}
          title={language === 'ru' ? 'Удалить' : 'Delete'}
        />
      </div>
    </div>
  );
};

// Sub-component for individual folder row with auto-expand on drag hover
const FolderItemRow: React.FC<{
  folder: Folder;
  isExpanded: boolean;
  isHoverTarget?: boolean;
  onToggle: () => void;
  onAddSubfolder: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDraggingRef?: React.MutableRefObject<boolean>;
}> = ({
  folder,
  isExpanded,
  isHoverTarget = false,
  onToggle,
  onAddSubfolder,
  onRename,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onDrop,
  isDraggingRef,
}) => {
  const styles = useStyles();
  const [isDragOver, setIsDragOver] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  return (
    <div
      draggable
      data-folder-id={folder.id}
      onPointerDown={onPointerDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
        if (!isExpanded && !hoverTimerRef.current) {
          hoverTimerRef.current = window.setTimeout(() => {
            onToggle();
            hoverTimerRef.current = null;
          }, 450);
        }
      }}
      onDragLeave={() => {
        setIsDragOver(false);
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
      }}
      onDrop={(e) => {
        setIsDragOver(false);
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        onDrop(e);
      }}
      onClick={() => {
        if (isDraggingRef?.current) return;
        onToggle();
      }}
      className={`${styles.folderRow} ${
        isDragOver || isHoverTarget ? styles.folderRowDragOver : ''
      }`}
    >
      <div className={styles.folderMain} onPointerDown={onPointerDown}>
        {isExpanded ? (
          <ChevronDown16Regular style={{ flexShrink: 0, color: tokens.colorNeutralForeground3 }} />
        ) : (
          <ChevronRight16Regular style={{ flexShrink: 0, color: tokens.colorNeutralForeground3 }} />
        )}
        {isExpanded ? (
          <FolderOpen20Regular style={{ flexShrink: 0, color: tokens.colorBrandForeground1 }} />
        ) : (
          <Folder20Regular style={{ flexShrink: 0, color: tokens.colorBrandForeground1 }} />
        )}
        <span className={styles.folderTitle} title={folder.name}>
          {folder.name}
        </span>
      </div>

      <div className={`node-actions ${styles.nodeActions}`} onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          appearance="subtle"
          icon={<FolderAdd16Regular />}
          onClick={onAddSubfolder}
          title="Создать подпапку"
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<Edit16Regular />}
          onClick={onRename}
          title="Переименовать"
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowMove20Regular />}
          onClick={onMove}
          title="Переместить"
        />
        <Button
          size="small"
          appearance="subtle"
          icon={<Delete16Regular />}
          onClick={onDelete}
          title="Удалить"
        />
      </div>
    </div>
  );
};
