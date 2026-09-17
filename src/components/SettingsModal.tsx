import React, { useState } from 'react';
import {
  makeStyles, shorthands, tokens, Dialog, DialogSurface, DialogBody,
  DialogTitle, DialogContent, DialogActions, Button, Input, Select,
  Body1, Body1Strong, Caption1, Badge, Divider, TabList, Tab, Textarea, Switch,
} from '@fluentui/react-components';
import {
  Settings24Regular, DismissRegular, Eye20Regular, EyeOff20Regular,
  Delete20Regular, Key20Regular, Globe20Regular, Info20Regular,
  Open16Regular, Checkmark16Regular, WeatherSunny20Regular, WeatherMoon20Regular,
  Sparkle20Regular, ArrowUndo16Regular, Mic20Regular
} from '@fluentui/react-icons';
import { useAppStore } from '../store/appStore';
import { openExternalUrl } from '../lib/openUrl';

const useStyles = makeStyles({
  surface: {
    maxWidth: '560px',
    width: '92%',
    maxHeight: '82vh',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...shorthands.padding('20px', '24px', '16px', '24px'),
  },
  dialogBody: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    minHeight: 0,
    overflow: 'hidden',
    flexGrow: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    flexShrink: 0,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  titleContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
  },
  tabList: {
    marginBottom: '6px',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    paddingTop: '8px',
    paddingBottom: '16px',
    paddingRight: '6px',
    overflowY: 'auto',
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    boxSizing: 'border-box',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  callout: {
    display: 'flex',
    ...shorthands.gap('10px'),
    ...shorthands.padding('10px', '12px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    alignItems: 'flex-start',
  },
  keyInputRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  externalLink: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    textDecorationLine: 'none',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
    marginTop: '4px',
    '&:hover': {
      textDecorationLine: 'underline',
      color: tokens.colorBrandForegroundLinkHover,
    },
  },
  promptTextarea: {
    width: '100%',
    fontFamily: 'Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.45',
    '& textarea': {
      minHeight: '260px',
      maxHeight: '380px',
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
    },
  },
  promptToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '4px',
    paddingBottom: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    flexShrink: 0,
  },
});

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ru' | 'en';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language }) => {
  const styles = useStyles();
  const {
    theme, toggleTheme, apiKey, setApiKey, setLanguage,
    customPrompt, setCustomPrompt, resetPromptToDefault,
    realtimeTranscriptionEnabled, setRealtimeTranscriptionEnabled,
    realtimeModel, setRealtimeModel,
    realtimeChunkWindow, setRealtimeChunkWindow,
    realtimeVadSensitivity, setRealtimeVadSensitivity
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<'general' | 'prompt'>('general');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [promptNotice, setPromptNotice] = useState<boolean>(false);

  const isRu = language === 'ru';

  const handleKeyChange = (val: string) => {
    setApiKey(val.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleClearKey = () => {
    setApiKey('');
  };

  const handlePromptChange = (val: string) => {
    setCustomPrompt(val);
    setPromptNotice(true);
    setTimeout(() => setPromptNotice(false), 2000);
  };

  const handleResetPrompt = () => {
    resetPromptToDefault();
    setPromptNotice(true);
    setTimeout(() => setPromptNotice(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody className={styles.dialogBody}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleGroup}>
              <Settings24Regular style={{ color: tokens.colorBrandForeground1 }} />
              <div className={styles.titleContainer}>
                <DialogTitle style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'block' }}>
                  {isRu ? 'Настройки приложения' : 'Application Settings'}
                </DialogTitle>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                  {isRu ? 'Персонализация параметров, промпт и ключи доступа' : 'Preferences, system prompt, and access keys'}
                </Caption1>
              </div>
            </div>
            <Button
              appearance="subtle"
              icon={<DismissRegular />}
              onClick={onClose}
              title={isRu ? 'Закрыть' : 'Close'}
            />
          </div>

          {/* Tab Navigation */}
          <TabList
            className={styles.tabList}
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as 'general' | 'prompt')}
          >
            <Tab value="general" icon={<Settings24Regular style={{ fontSize: '16px' }} />}>
              {isRu ? 'Основные' : 'General'}
            </Tab>
            <Tab value="prompt" icon={<Sparkle20Regular style={{ fontSize: '16px' }} />}>
              {isRu ? 'Промпт Норы' : "Nora's Prompt"}
            </Tab>
          </TabList>

          {/* Content */}
          <DialogContent className={styles.content}>
            {activeTab === 'general' ? (
              <>
                {/* Language Section */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Globe20Regular style={{ color: tokens.colorBrandForeground1 }} />
                    <Body1Strong>{isRu ? 'Язык интерфейса' : 'Interface Language'}</Body1Strong>
                  </div>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {isRu
                      ? 'Выберите язык оформления интерфейса, системных подсказок и руководства:'
                      : 'Choose the language for application UI, tooltips, and documentation:'}
                  </Caption1>
                  <div style={{ maxWidth: '240px', marginTop: '4px' }}>
                    <Select
                      value={language}
                      onChange={(_, data) => setLanguage(data.value as 'ru' | 'en')}
                      size="medium"
                      style={{ width: '100%' }}
                    >
                      <option value="ru">Русский (RU)</option>
                      <option value="en">English (EN)</option>
                    </Select>
                  </div>
                </div>

                <Divider />

                {/* Theme Section */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    {theme === 'dark' ? (
                      <WeatherMoon20Regular style={{ color: tokens.colorBrandForeground1 }} />
                    ) : (
                      <WeatherSunny20Regular style={{ color: tokens.colorBrandForeground1 }} />
                    )}
                    <Body1Strong>{isRu ? 'Тема оформления' : 'Theme'}</Body1Strong>
                  </div>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {isRu
                      ? 'Выберите визуальную тему интерфейса приложения:'
                      : 'Select application color theme:'}
                  </Caption1>
                  <div style={{ maxWidth: '240px', marginTop: '4px' }}>
                    <Select
                      value={theme}
                      onChange={(_, data) => {
                        if (data.value !== theme) toggleTheme();
                      }}
                      size="medium"
                      style={{ width: '100%' }}
                    >
                      <option value="light">{isRu ? 'Светлая тема' : 'Light Theme'}</option>
                      <option value="dark">{isRu ? 'Тёмная тема' : 'Dark Theme'}</option>
                    </Select>
                  </div>
                </div>

                <Divider />

                {/* Groq API Key Section */}
                <div className={styles.section}>
                  <div className={styles.sectionTitleRow}>
                    <div className={styles.sectionHeader}>
                      <Key20Regular style={{ color: tokens.colorBrandForeground1 }} />
                      <Body1Strong>{isRu ? 'Ключ Groq API' : 'Groq API Key'}</Body1Strong>
                    </div>
                    {apiKey ? (
                      <Badge appearance="filled" color="brand" size="small">
                        {savedNotice ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Checkmark16Regular /> {isRu ? 'Сохранено' : 'Saved'}
                          </span>
                        ) : (
                          isRu ? 'Ключ сохранён' : 'Key Saved'
                        )}
                      </Badge>
                    ) : (
                      <Badge appearance="tint" color="warning" size="small">
                        {isRu ? 'Ключ не задан' : 'Key Not Set'}
                      </Badge>
                    )}
                  </div>

                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {isRu
                      ? 'Используется для высокоскоростного распознавания речи Whisper Large v3 / Turbo и создания умных конспектов на серверах Groq:'
                      : 'Used for ultra-fast Whisper Large v3 / Turbo speech recognition and smart notes on Groq servers:'}
                  </Caption1>

                  <div className={styles.keyInputRow}>
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="gsk_..."
                      value={apiKey}
                      onChange={(_, data) => handleKeyChange(data.value)}
                      style={{ flexGrow: 1 }}
                      size="medium"
                    />
                    <Button
                      appearance="secondary"
                      icon={showKey ? <EyeOff20Regular /> : <Eye20Regular />}
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? (isRu ? 'Скрыть ключ' : 'Hide key') : (isRu ? 'Показать ключ' : 'Show key')}
                    />
                    {apiKey && (
                      <Button
                        appearance="subtle"
                        icon={<Delete20Regular />}
                        onClick={handleClearKey}
                        title={isRu ? 'Удалить ключ' : 'Clear key'}
                      />
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      className={styles.externalLink}
                      onClick={() => openExternalUrl('https://console.groq.com/keys')}
                      title={isRu ? 'Открыть консоль Groq в браузере' : 'Open Groq Console in browser'}
                    >
                      <span>{isRu ? 'Получить бесплатный ключ в Groq Console' : 'Get a free API key at Groq Console'}</span>
                      <Open16Regular style={{ fontSize: '13px' }} />
                    </button>
                  </div>

                  <div className={styles.callout}>
                    <Info20Regular style={{ flexShrink: 0, marginTop: '2px', color: tokens.colorNeutralForeground3 }} />
                    <Caption1 style={{ color: tokens.colorNeutralForeground2, lineHeight: '1.45' }}>
                      {isRu
                        ? 'Ключ сохраняется локально на вашем компьютере в защищенном хранилище приложения и используется исключительно при формировании конспекта. Аудиозаписи лекций расшифровываются локально через Whisper без передачи в интернет.'
                        : 'The API key is stored locally on your device in secure storage and used only when compiling lecture notes. Audio speech recognition runs 100% offline via Whisper.'}
                    </Caption1>
                  </div>
                </div>

                <Divider />

                {/* Real-time Transcription Section */}
                <div className={styles.section}>
                  <div className={styles.sectionTitleRow}>
                    <div className={styles.sectionHeader}>
                      <Mic20Regular style={{ color: tokens.colorBrandForeground1 }} />
                      <Body1Strong>{isRu ? 'Транскрибация в реальном времени' : 'Real-time Live Transcription'}</Body1Strong>
                    </div>
                    {realtimeTranscriptionEnabled ? (
                      <Badge appearance="filled" color="brand" size="small">
                        {isRu ? 'Включено' : 'Enabled'}
                      </Badge>
                    ) : (
                      <Badge appearance="tint" color="subtle" size="small">
                        {isRu ? 'Выключено' : 'Disabled'}
                      </Badge>
                    )}
                  </div>

                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {isRu
                      ? 'Распознавание речи на лету во время записи лекции с микрофона с сохранением контекста фраз:'
                      : 'Live speech recognition during mic recording with full sentence context preservation:'}
                  </Caption1>

                  <div style={{ marginTop: '4px' }}>
                    <Switch
                      checked={realtimeTranscriptionEnabled}
                      onChange={(_, data) => setRealtimeTranscriptionEnabled(data.checked)}
                      label={isRu ? 'Включить распознавание на лету при записи с микрофона' : 'Enable live speech recognition during mic recording'}
                    />
                  </div>

                  {realtimeTranscriptionEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', paddingLeft: '4px' }}>
                      <div>
                        <Caption1 style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                          {isRu ? 'Модель для распознавания на лету:' : 'Live streaming recognition model:'}
                        </Caption1>
                        <Select
                          value={realtimeModel}
                          onChange={(_, data) => setRealtimeModel(data.value as any)}
                          size="medium"
                          style={{ width: '100%', maxWidth: '420px' }}
                        >
                          <option value="whisper-large-v3-turbo">
                            {isRu ? 'Whisper Large v3 Turbo (Рекомендуется, задержка ~150 мс)' : 'Whisper Large v3 Turbo (Recommended, ~150ms)'}
                          </option>
                          <option value="whisper-large-v3">
                            {isRu ? 'Whisper Large v3 (Максимальная академическая точность)' : 'Whisper Large v3 (Maximum academic accuracy)'}
                          </option>
                        </Select>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <Caption1 style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                            {isRu ? 'Окно накопления аудио:' : 'Audio chunk window:'}
                          </Caption1>
                          <Select
                            value={String(realtimeChunkWindow)}
                            onChange={(_, data) => setRealtimeChunkWindow(Number(data.value) as any)}
                            size="medium"
                            style={{ width: '100%' }}
                          >
                            <option value="4">{isRu ? 'Быстрое (4-5 сек, мин. задержка)' : 'Fast (4-5s, minimal latency)'}</option>
                            <option value="7">{isRu ? 'Сбалансированное (7-8 сек, оптимум)' : 'Balanced (7-8s, optimal)'}</option>
                            <option value="10">{isRu ? 'Большие фразы (10-12 сек, контекст)' : 'Large phrases (10-12s, context)'}</option>
                          </Select>
                        </div>

                        <div style={{ flex: '1 1 200px' }}>
                          <Caption1 style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                            {isRu ? 'Чувствительность к паузам (VAD):' : 'Pause sensitivity (VAD):'}
                          </Caption1>
                          <Select
                            value={String(realtimeVadSensitivity)}
                            onChange={(_, data) => setRealtimeVadSensitivity(Number(data.value) as any)}
                            size="medium"
                            style={{ width: '100%' }}
                          >
                            <option value="400">{isRu ? 'Быстрая пауза (400 мс)' : 'Short pause (400ms)'}</option>
                            <option value="700">{isRu ? 'Стандартная пауза лектора (700 мс)' : 'Standard pause (700ms)'}</option>
                            <option value="1200">{isRu ? 'Длинная пауза (1200 мс)' : 'Long pause (1200ms)'}</option>
                          </Select>
                        </div>
                      </div>

                      <div className={styles.callout}>
                        <Info20Regular style={{ flexShrink: 0, marginTop: '2px', color: tokens.colorNeutralForeground3 }} />
                        <Caption1 style={{ color: tokens.colorNeutralForeground2, lineHeight: '1.45' }}>
                          {isRu
                            ? 'Слова и формулы лектора плавно заполняют редактор в реальном времени. Контекст непрерывно сшивается без обрывов фраз. После завершения записи полный 16 кГц WAV сохраняется на диск без сжатия.'
                            : 'Lecturer speech smoothly populates the editor in real-time. Context is continuously stitched without sentence drops. Full 16 kHz WAV audio is saved losslessly to disk.'}
                        </Caption1>
                      </div>
                    </div>
                  )}
                </div>

                <Divider />

                {/* About Section */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <Info20Regular style={{ color: tokens.colorBrandForeground1 }} />
                    <Body1Strong>{isRu ? 'О программе' : 'About Application'}</Body1Strong>
                  </div>
                  <Body1 style={{ fontSize: '13px', color: tokens.colorNeutralForeground2 }}>
                    Nora Listener — v1.1.0
                  </Body1>
                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    {isRu
                      ? 'Академический ассистент для студентов и преподавателей. Локальная DSP-фильтрация аудио, контекстный синтез материалов и ускоренное облачное распознавание Whisper Large v3 / Turbo на базе Groq LPU.'
                      : 'Academic lecture assistant for students and lecturers. Local DSP audio preprocessing, context material synthesis, and accelerated Whisper Large v3 / Turbo speech recognition powered by Groq LPU.'}
                  </Caption1>
                </div>
              </>
            ) : (
              /* Nora Prompt Tab */
              <div className={styles.section}>
                <div className={styles.sectionTitleRow}>
                  <div className={styles.sectionHeader}>
                    <Sparkle20Regular style={{ color: tokens.colorBrandForeground1 }} />
                    <Body1Strong>{isRu ? 'Системный промпт Норы' : "Nora's System Prompt"}</Body1Strong>
                  </div>
                  {promptNotice ? (
                    <Badge appearance="filled" color="brand" size="small">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Checkmark16Regular /> {isRu ? 'Сохранено' : 'Saved'}
                      </span>
                    </Badge>
                  ) : (
                    <Badge appearance="outline" size="small">
                      {customPrompt.length} {isRu ? 'симв.' : 'chars'}
                    </Badge>
                  )}
                </div>

                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                  {isRu
                    ? 'Инструкция, которой следует Нора при составлении академического конспекта по тексту лекции. Вы можете изменить правила, разделы и стиль под свои требования:'
                    : 'System instructions followed by Nora when synthesizing academic notes from lectures. You can customize rules, structure, and tone:'}
                </Caption1>

                <div className={styles.promptToolbar}>
                  <Caption1 style={{ color: tokens.colorNeutralForeground4, fontSize: '11px' }}>
                    {isRu ? 'Изменения сохраняются автоматически' : 'Changes save automatically'}
                  </Caption1>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowUndo16Regular />}
                    onClick={handleResetPrompt}
                    title={isRu ? 'Восстановить эталонный академический промпт' : 'Restore default academic prompt'}
                  >
                    {isRu ? 'Сбросить к базовому' : 'Reset to default'}
                  </Button>
                </div>

                <Textarea
                  className={styles.promptTextarea}
                  value={customPrompt}
                  onChange={(_, data) => handlePromptChange(data.value)}
                  resize="vertical"
                  size="medium"
                />
              </div>
            )}
          </DialogContent>

          {/* Footer */}
          <DialogActions className={styles.footer}>
            <Button appearance="primary" onClick={onClose}>
              {isRu ? 'Готово' : 'Done'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
