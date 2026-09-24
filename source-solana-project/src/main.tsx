import '@/styles/animations.scss';
import '@/styles/tailwind.css';
import '@/styles/index.scss';
import '@/config/datadog';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';

import { App } from './App';
import { registerPreloadErrorReload } from '@/utils/registerPreloadErrorReload';
import { installWsDebugKillSwitch } from '@/utils/debug/wsDebugKillSwitch';
import { preloadTradeConfig } from '@/utils/tradeConfig';

async function startApp() {
  await preloadTradeConfig();

  registerPreloadErrorReload();

  if (import.meta.env.DEV) {
    installWsDebugKillSwitch();
  }

  if (import.meta.env.VITE_NIGHTLY?.toLowerCase() === 'true') {
    localStorage.setItem(
      'nightly_build',
      JSON.stringify({
        enabled: true,
        message:
          '🌙 Nightly Build Enabled – You are running a nightly build with experimental features enabled.',
        timestamp: new Date().toISOString(),
      })
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </React.StrictMode>
  );
}

void startApp();
