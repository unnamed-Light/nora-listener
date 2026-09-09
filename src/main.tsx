import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import App from './App';
import { useAppStore } from './store/appStore';
import 'katex/dist/katex.min.css';
import './index.css';

function Root() {
  const { theme } = useAppStore();
  return (
    <FluentProvider 
      theme={theme === 'dark' ? webDarkTheme : webLightTheme}
      style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <App />
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
