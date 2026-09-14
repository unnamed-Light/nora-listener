import React, { useState } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Textarea,
  Button,
  Badge,
  Caption1,
} from '@fluentui/react-components';
import {
  Lightbulb20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Dismiss16Regular,
  Sparkle16Regular,
} from '@fluentui/react-icons';

interface ClarifyingPromptPanelProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'ru' | 'en';
}

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('8px', '12px'),
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
  },
  title: {
    fontWeight: 600,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
  },
  body: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
    lineHeight: '16px',
  },
  textarea: {
    width: '100%',
    '& textarea': {
      fontSize: '13px',
      lineHeight: '18px',
      minHeight: '60px',
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px',
  },
  charCount: {
    color: tokens.colorNeutralForeground4,
    fontSize: '11px',
    marginLeft: 'auto',
  },
});

export const ClarifyingPromptPanel: React.FC<ClarifyingPromptPanelProps> = ({
  value,
  onChange,
  language = 'ru',
}) => {
  const styles = useStyles();
  const isEn = language === 'en';
  const hasContent = value.trim().length > 0;
  const [isExpanded, setIsExpanded] = useState<boolean>(hasContent);

  const titleText = isEn
    ? 'Notes Preferences (Clarifying Context for Nora)'
    : 'Пожелания к конспекту (уточняющий контекст для Норы)';

  const hintText = isEn
    ? 'Specify what Nora should emphasize, topics to explain in greater depth, or desired formatting. Saved within the current session.'
    : 'Укажите, на чем Норе сделать акцент, какие темы раскрыть подробнее или в каком ключе составить конспект. Сохраняется в пределах текущей сессии.';

  const placeholderText = isEn
    ? 'For example: Explain Fermat theorem and its proof in more detail; pay special attention to midterm prep; provide practical Python examples...'
    : 'Например: Подробнее объясни теорему Ферма и доказательство; удели особое внимание подготовке к коллоквиуму; сделай акцент на практических примерах с кодом...';

  const clearText = isEn ? 'Clear' : 'Очистить';

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={styles.titleGroup}>
          <Lightbulb20Regular style={{ color: tokens.colorPaletteYellowForeground2, flexShrink: 0 }} />
          <span className={styles.title}>{titleText}</span>
          {hasContent && (
            <Badge appearance="tint" color="brand" size="small" icon={<Sparkle16Regular />}>
              {value.trim().length} {isEn ? 'chars' : 'симв.'}
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
                onChange('');
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
          <div className={styles.hint}>
            {hintText}
          </div>

          <Textarea
            className={styles.textarea}
            value={value}
            onChange={(_, data) => onChange(data.value)}
            placeholder={placeholderText}
            rows={3}
            resize="vertical"
          />

          <div className={styles.footer}>
            <Caption1 className={styles.charCount}>
              {value.length} / 2000
            </Caption1>
          </div>
        </div>
      )}
    </div>
  );
};
