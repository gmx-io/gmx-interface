// Must stay above every other import so the url is normalized before anything reads the location.
import "lib/legacyHashUrlRedirect";
import "./main.css";

import React from "react";
import { createRoot } from "react-dom/client";

import { isIOS } from "lib/headlessUiIsMobile";
import { initializeUserAnalytics } from "lib/userAnalytics/initializeUserAnalytics";

import App from "./App";
import { captureLandingReferralCode } from "./utils/referralCode";

// Run before mount: the catch-all <Redirect /> in LandingRoutes clears the
// search query in its mount effect, so we read URL params synchronously here.
captureLandingReferralCode();
initializeUserAnalytics();

if ("TelegramWebviewProxy" in window && isIOS()) {
  document.documentElement.classList.add("telegram-browser");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
