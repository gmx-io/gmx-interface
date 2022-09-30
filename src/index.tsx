import React from "react";
import ReactDOM from "react-dom";
import "regenerator-runtime/runtime";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App/App";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.info))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
export { getTotalVolumeSum } from "./lib/legacy";
export { getVisibleTokens } from "./config/tokens";
export { getWhitelistedTokens } from "./config/tokens";
export { getTokenBySymbol } from "./config/tokens";
export { getToken } from "./config/tokens";
export { isValidToken } from "./config/tokens";
export { getTokens } from "./config/tokens";
export { getNativeToken } from "./config/tokens";
export { getWrappedToken } from "./config/tokens";
