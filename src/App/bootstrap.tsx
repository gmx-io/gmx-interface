import "lib/polyfills";
// Normalize the URL before modules that read the location are evaluated.
import "lib/legacyHashUrlRedirect";
import "styles/tailwind.css";
import "lib/monkeyPatching";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";

import { ThemeProvider } from "context/ThemeContext/ThemeContext";
import { initializeI18n } from "lib/i18n";
import { configureInstalledApp } from "lib/pwa/getIsInstalledApp";
import { initializeLaunchSource } from "lib/pwa/getLaunchSource";
import { registerServiceWorker } from "lib/pwa/registerServiceWorker";
import WalletProvider from "lib/wallets/WalletProvider";

import StartupErrorBoundary from "components/Errors/StartupErrorBoundary";

import reportWebVitals from "../reportWebVitals";
import App from "./App";

export async function bootstrap() {
  initializeLaunchSource();
  configureInstalledApp();
  await initializeI18n();

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <StartupErrorBoundary>
        <Router>
          <ThemeProvider>
            <WalletProvider>
              <App />
            </WalletProvider>
          </ThemeProvider>
        </Router>
      </StartupErrorBoundary>
    </React.StrictMode>
  );

  reportWebVitals();
  registerServiceWorker();
}
