import "./main.css";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { captureLandingReferralCode } from "./utils/referralCode";
import { captureLandingUtmParams } from "./utils/utm";

// Run before mount: the catch-all <Redirect /> in LandingRoutes clears the
// search query in its mount effect, so we read URL params synchronously here.
captureLandingReferralCode();
captureLandingUtmParams();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
