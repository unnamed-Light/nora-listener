import React, { useState, useRef } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Body1Strong,
  Caption1,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  DocumentFolder20Regular,
  Attach20Regular,
  DismissRegular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  SlideTransition20Regular,
  DocumentText20Regular,
  BookOpen20Regular,
  Document20Regular,
  Info16Regular,
} from '@fluentui/react-icons';
import { processContextFile } from '../lib/contextExtractor';
import type { ContextItem } from '../lib/contextExtractor';

interface ContextPanelProps {
  contextItems: ContextItem[];
  onAddItems: (newItems: ContextItem[]) => void;
  onRemoveItem: (id: string) => void;
  language?: 'ru' | 'en';
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('8px', '12px'),
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  callout: {
    display: 'flex',
    alignItems: 'flex-start',
    ...shorthands.gap('6px'),
    ...shorthands.padding('6px', '10px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '15px',
  },
  cardsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
    maxHeight: '140px',
    overflowY: 'auto',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    fontSize: '12px',
  },
  dropzone: {
    border: `1px dashed ${tokens.colorBrandStroke1}`,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    ...shorthands.padding('8px'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('8px'),
    backgroundColor: tokens.colorBrandBackground2,
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: '12px',
    color: tokens.colorBrandForeground1,
    fontWeight: 500,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

export const ContextPanel: React.FC<ContextPanelProps> = ({
  contextItems,
  onAddItems,
  onRemoveItem,
  language = 'ru',
}) => {
  const styles = useStyles();
  const isEn = language === 'en';
  const [isExpanded, setIsExpanded] = useState<boolean>(contextItems.length > 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalChars = contextItems.reduce((acc, it) => acc + it.charCount, 0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    const added: ContextItem[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const item = await processContextFile(files[i]);
        added.push(item);
      } catch (err: any) {
        console.error('Failed to parse context file:', files[i].name, err);
      }
    }

    if (added.length > 0) {
      onAddItems(added);
      setIsExpanded(true);
    }
    setIsLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'presentation':
        return <SlideTransition20Regular style={{ color: tokens.colorPaletteBerryForeground1, flexShrink: 0 }} />;
      case 'notes':
        return <DocumentText20Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />;
      case 'literature':
        return <BookOpen20Regular style={{ color: tokens.colorPaletteTealForeground2, flexShrink: 0 }} />;
      default:
        return <Document20Regular style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }} />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'presentation':
        return isEn ? 'Slide deck' : 'Презентация';
      case 'notes':
        return isEn ? 'Student notes' : 'Конспект';
      case 'literature':
        return isEn ? 'Literature' : 'Литература';
      default:
        return isEn ? 'Document' : 'Материал';
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.ppt,.docx,.txt,.md,.markdown"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      <div className={styles.header} onClick={() => setIsExpanded(prev => !prev)}>
        <div className={styles.titleGroup}>
          <DocumentFolder20Regular style={{ color: tokens.colorBrandForeground1 }} />
          <span className={styles.title}>
            {isEn ? 'Lecture Context (Slides, Notes, Literature)' : 'Контекст занятия (презентации, конспекты, литература)'}
          </span>
          {contextItems.length > 0 && (
            <Badge appearance="filled" color="brand" size="small">
              {contextItems.length} {isEn ? 'files' : (contextItems.length === 1 ? 'файл' : 'файла')} ({Math.round(totalChars / 1000)}k {isEn ? 'chars' : 'симв.'})
            </Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            size="small"
            appearance="subtle"
            icon={<Attach20Regular />}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isEn ? 'Attach' : 'Прикрепить'}
          </Button>
          <Button
            size="small"
            appearance="subtle"
            icon={isExpanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          />
        </div>
      </div>

      {isExpanded && (
        <div className={styles.body}>
          <div className={styles.callout}>
            <Info16Regular style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {isEn
                ? 'Nora uses attached materials for intelligent synthesis: cross-referencing formulas and terminology with slides, matching your personal note-taking structure, and supplementing verbally skipped details tagged as [From lecture materials / slides].'
                : 'Нора использует эти материалы для умного синтеза: сверяет термины и формулы со слайдами, имитирует структуру ваших заметок и дополняет пропущенные лектором детали с пометкой [Из материалов лекции / слайдов].'}
            </span>
          </div>

          <div
            className={styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <Attach20Regular />
            <span>
              {isEn
                ? 'Click or drag & drop files here (.pdf, .pptx, .docx, .md, .txt)'
                : 'Нажмите или перетащите сюда файлы (.pdf, .pptx, .docx, .md, .txt)'}
            </span>
            {isLoading && <Spinner size="tiny" />}
          </div>

          {contextItems.length > 0 && (
            <div className={styles.cardsContainer}>
              {contextItems.map((item) => (
                <div key={item.id} className={styles.card}>
                  {getIcon(item.fileType)}
                  <Body1Strong style={{ fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>
                    {item.fileName}
                  </Body1Strong>
                  <Badge appearance="outline" size="small">
                    {getTypeBadge(item.fileType)}
                  </Badge>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3, fontSize: '11px' }}>
                    {Math.round(item.charCount / 1000)}k
                  </Caption1>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<DismissRegular style={{ fontSize: '12px' }} />}
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={isEn ? 'Remove' : 'Удалить'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
