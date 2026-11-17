// Must stay above every other import so the url is normalized before anything reads the location.
import "lib/legacyHashUrlRedirect";
import "./main.css";

import { i18n } from "@lingui/core";
import React from "react";
import { createRoot } from "react-dom/client";

import { isIOS } from "lib/headlessUiIsMobile";
import { defaultLocale } from "lib/i18n";
import { messages as englishMessages } from "locales/en/messages.po";

import App from "./App";
import { captureLandingReferralCode } from "./utils/referralCode";
import { captureLandingUtmParams } from "./utils/utm";

// Run before mount: the catch-all <Redirect /> in LandingRoutes clears the
// search query in its mount effect, so we read URL params synchronously here.
captureLandingReferralCode();
captureLandingUtmParams();

if ("TelegramWebviewProxy" in window && isIOS()) {
  document.documentElement.classList.add("telegram-browser");
}

i18n.load(defaultLocale, englishMessages);
i18n.activate(defaultLocale);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
