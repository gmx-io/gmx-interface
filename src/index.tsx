import "regenerator-runtime/runtime";
import "styles/tailwind.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";

import WalletProvider from "lib/wallets/WalletProvider";
import App from "./App/App";
import reportWebVitals from "./reportWebVitals";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <WalletProvider>
        <App />
      </WalletProvider>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.info))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
export { formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "./lib/numbers";
