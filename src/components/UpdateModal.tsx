import React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Body1,
  Caption1,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import {
  Open16Regular,
  Clock16Regular,
  Sparkle20Regular,
} from '@fluentui/react-icons';
import type { UpdateInfo } from '../lib/updateChecker';
import { openExternalUrl } from '../lib/openUrl';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  language?: 'ru' | 'en';
  onSkipVersion?: (version: string) => void;
}

const useStyles = makeStyles({
  surface: {
    maxWidth: '540px',
    width: '92vw',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding('24px'),
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  appIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '9px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px',
    marginBottom: '14px',
  },
  notesBox: {
    maxHeight: '220px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('12px', '14px'),
    fontSize: '13px',
    lineHeight: '19px',
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyBase,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '20px',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
});

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  language = 'ru',
  onSkipVersion,
}) => {
  const styles = useStyles();
  const isRu = language === 'ru';

  if (!updateInfo) return null;

  const handleUpdateClick = async () => {
    if (updateInfo.releaseUrl) {
      await openExternalUrl(updateInfo.releaseUrl);
    }
  };

  const handleSkipClick = () => {
    if (onSkipVersion && updateInfo.latestVersion) {
      onSkipVersion(updateInfo.latestVersion);
    }
    onClose();
  };

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <div className={styles.headerRow}>
            <img src="/app-icon.png" alt="Nora Listener" className={styles.appIcon} />
            <div className={styles.titleGroup}>
              <DialogTitle style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {isRu ? 'Доступно обновление Nora Listener' : 'Nora Listener Update Available'}
              </DialogTitle>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                {isRu
                  ? 'Вышла новая версия приложения на GitHub'
                  : 'A new release is available on GitHub'}
              </Caption1>
            </div>
          </div>

          <DialogContent>
            <div className={styles.badgeRow}>
              <Badge appearance="outline" size="medium">
                {isRu ? 'У вас:' : 'Current:'} v{updateInfo.currentVersion}
              </Badge>
              <span style={{ color: tokens.colorNeutralForeground4 }}>-&gt;</span>
              <Badge appearance="filled" color="brand" size="medium" icon={<Sparkle20Regular />}>
                {isRu ? 'Новая:' : 'Latest:'} {updateInfo.latestVersion}
              </Badge>
              {formattedDate && (
                <Caption1
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: tokens.colorNeutralForeground3,
                    marginLeft: 'auto',
                  }}
                >
                  <Clock16Regular /> {formattedDate}
                </Caption1>
              )}
            </div>

            <Body1 style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              {updateInfo.releaseName || (isRu ? 'Список изменений:' : 'Release Notes:')}
            </Body1>

            <div className={styles.notesBox}>
              {updateInfo.releaseNotes
                ? updateInfo.releaseNotes.trim()
                : isRu
                ? 'Подробности релиза доступны на странице выпуска GitHub.'
                : 'Release details are available on the GitHub release page.'}
            </div>
          </DialogContent>

          <DialogActions className={styles.footer}>
            <Button appearance="subtle" size="small" onClick={handleSkipClick}>
              {isRu ? 'Пропустить эту версию' : 'Skip this version'}
            </Button>
            <div className={styles.rightActions}>
              <Button appearance="secondary" onClick={onClose}>
                {isRu ? 'Напомнить позже' : 'Remind later'}
              </Button>
              <Button
                appearance="primary"
                icon={<Open16Regular />}
                iconPosition="after"
                onClick={handleUpdateClick}
              >
                {isRu ? 'Обновиться' : 'Update Now'}
              </Button>
            </div>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
