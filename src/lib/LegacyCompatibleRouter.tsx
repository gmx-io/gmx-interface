import { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";

import { shouldUseLegacyHashRouter } from "./legacyHashUrl";

export function LegacyCompatibleRouter({ children }: { children: ReactNode }) {
  if (shouldUseLegacyHashRouter(window.navigator.userAgent)) {
    return <HashRouter>{children}</HashRouter>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}
