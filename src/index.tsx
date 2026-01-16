import "lib/polyfills";
import "styles/tailwind.css";
import "lib/monkeyPatching";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";

import WalletProvider from "lib/wallets/WalletProvider";

import App from "./App/App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <WalletProvider>
        <App />
      </WalletProvider>
    </Router>
  </React.StrictMode>
);
