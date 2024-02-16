import React from "react";
import ReactDOM from "react-dom";
import "regenerator-runtime/runtime";
import App from "./App/App";
import reportWebVitals from "./reportWebVitals";
import WalletProvider from "lib/wallets/WalletProvider";

ReactDOM.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.info))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
export { formatUsd } from "./lib/numbers";
export { formatTokenAmountWithUsd } from "./lib/numbers";
export { formatTokenAmount } from "./lib/numbers";
