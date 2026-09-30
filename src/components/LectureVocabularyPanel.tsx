import React, { useState } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Input,
  Textarea,
  Button,
  Badge,
  Switch,
  Label,
  Spinner,
} from '@fluentui/react-components';
import {
  BookQuestionMark20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Sparkle16Regular,
  Dismiss16Regular,
  Checkmark16Regular,
} from '@fluentui/react-icons';
import { useAppStore } from '../store/appStore';

interface LectureVocabularyPanelProps {
  language?: 'ru' | 'en';
  isTranscribing?: boolean;
  hasTranscript?: boolean;
  onManualCorrection?: () => void;
  isCorrecting?: boolean;
}

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px', '14px'),
    marginBottom: '10px',
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
    flexWrap: 'wrap',
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
  },
  body: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
    lineHeight: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    ...shorthands.gap('12px'),
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  textarea: {
    width: '100%',
    '& textarea': {
      fontSize: '13px',
      lineHeight: '18px',
      minHeight: '54px',
    },
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    flexWrap: 'wrap',
    paddingTop: '6px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

export const LectureVocabularyPanel: React.FC<LectureVocabularyPanelProps> = ({
  language = 'ru',
  isTranscribing = false,
  hasTranscript = false,
  onManualCorrection,
  isCorrecting = false,
}) => {
  const styles = useStyles();
  const isEn = language === 'en';

  const {
    lectureSubject,
    lectureLecturer,
    lectureGlossary,
    enableAsrCorrection,
    setLectureSubject,
    setLectureLecturer,
    setLectureGlossary,
    setEnableAsrCorrection,
  } = useAppStore();

  const hasContent = Boolean(
    lectureSubject.trim() || lectureLecturer.trim() || lectureGlossary.trim()
  );

  const [isExpanded, setIsExpanded] = useState<boolean>(hasContent);

  const titleText = isEn
    ? 'Lecture Context & Terminology Glossary'
    : 'Словарь лекции и контекст распознавания';

  const hintText = isEn
    ? 'Specify course subject, lecturer name, and domain terms. This primes Whisper attention heads (biasing) and runs Llama 3.3 70B verification on Groq, preventing distortions in proper nouns and technical vocabulary.'
    : 'Задайте дисциплину, ФИО лектора и ключевые термины. Это активирует прецизионную ориентацию Whisper (Biasing) и автоматическую выверку текста моделью Llama 3.3 70B на Groq, устраняя искажения редких терминов и фамилий.';

  const subjectLabel = isEn ? 'Subject / Course' : 'Предмет / Дисциплина';
  const subjectPlaceholder = isEn
    ? 'e.g.: Computer Science and AI'
    : 'Например: Основы компьютерных наук и ИИ';

  const lecturerLabel = isEn ? 'Lecturer / Professor' : 'Преподаватель (ФИО)';
  const lecturerPlaceholder = isEn
    ? 'e.g.: Prof. John Smith'
    : 'Например: Профессор Смирнов А. В.';

  const glossaryLabel = isEn
    ? 'Glossary of terms, formulas, and names (comma or newline separated)'
    : 'Словарь терминов, формул и фамилий (через запятую или с новой строки)';
  const glossaryPlaceholder = isEn
    ? 'mantissa, denormalized numbers, IEEE 754, syntactic sugar, bytecode, Turing, von Neumann...'
    : 'мантисса, денормализованные числа, IEEE 754, синтаксический сахар, байткод, Тьюринг, фон Нейман...';

  const asrSwitchLabel = isEn
    ? 'Automatic AI term verification (Llama 3.3 70B on Groq)'
    : 'Автоматическая ИИ-выверка терминов (Llama 3.3 70B на Groq)';

  const verifyBtnText = isEn
    ? isCorrecting ? 'Verifying...' : 'Verify Current Text (AI)'
    : isCorrecting ? 'Выверка...' : 'Выверить текущий текст (ИИ)';

  const clearText = isEn ? 'Clear' : 'Очистить';

  const termsCount = lectureGlossary
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={styles.titleGroup}>
          <BookQuestionMark20Regular
            style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }}
          />
          <span className={styles.title}>{titleText}</span>
          {hasContent && (
            <Badge appearance="tint" color="brand" size="small" icon={<Checkmark16Regular />}>
              {termsCount > 0 ? `${termsCount} ${isEn ? 'terms' : 'терм.'}` : (isEn ? 'Active' : 'Активен')}
            </Badge>
          )}
          {enableAsrCorrection && (
            <Badge appearance="outline" color="informative" size="small" icon={<Sparkle16Regular />}>
              Llama 3.3 70B
            </Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasContent && (
            <Button
              size="small"
              appearance="subtle"
              icon={<Dismiss16Regular />}
              onClick={(e) => {
                e.stopPropagation();
                setLectureSubject('');
                setLectureLecturer('');
                setLectureGlossary('');
              }}
              title={clearText}
            >
              {clearText}
            </Button>
          )}
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
          <div className={styles.hint}>{hintText}</div>

          <div className={styles.grid}>
            <div className={styles.fieldGroup}>
              <Label className={styles.fieldLabel}>{subjectLabel}</Label>
              <Input
                value={lectureSubject}
                onChange={(_, data) => setLectureSubject(data.value)}
                placeholder={subjectPlaceholder}
                disabled={isTranscribing || isCorrecting}
              />
            </div>

            <div className={styles.fieldGroup}>
              <Label className={styles.fieldLabel}>{lecturerLabel}</Label>
              <Input
                value={lectureLecturer}
                onChange={(_, data) => setLectureLecturer(data.value)}
                placeholder={lecturerPlaceholder}
                disabled={isTranscribing || isCorrecting}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <Label className={styles.fieldLabel}>{glossaryLabel}</Label>
            <Textarea
              className={styles.textarea}
              value={lectureGlossary}
              onChange={(_, data) => setLectureGlossary(data.value)}
              placeholder={glossaryPlaceholder}
              rows={2}
              resize="vertical"
              disabled={isTranscribing || isCorrecting}
            />
          </div>

          <div className={styles.actionsRow}>
            <Switch
              label={asrSwitchLabel}
              checked={enableAsrCorrection}
              onChange={(_, data) => setEnableAsrCorrection(data.checked)}
              disabled={isTranscribing || isCorrecting}
            />

            {onManualCorrection && (
              <Button
                appearance="primary"
                size="small"
                icon={isCorrecting ? <Spinner size="tiny" /> : <Sparkle16Regular />}
                onClick={onManualCorrection}
                disabled={!hasTranscript || isTranscribing || isCorrecting}
                title={
                  isEn
                    ? 'Fix distorted terms and lecturer names in current transcript while preserving 100% of speech'
                    : 'Исправить искаженные термины и фамилии в уже полученном тексте с сохранением 100% речи'
                }
              >
                {verifyBtnText}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
