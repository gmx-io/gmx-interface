import React, { createContext, useContext } from "react";

import { TokenPermitsState, useInitTokenPermitsState } from "domain/synthetics/gassless/useInitTokenPermitsState";

const TokenPermitsContext = createContext<TokenPermitsState | undefined>(undefined);

export function useTokenPermitsContext() {
  const context = useContext(TokenPermitsContext);
  if (!context) {
    throw new Error("useTokenPermits must be used within TokenPermitsContextProvider");
  }
  return context;
}

export function TokenPermitsContextProvider({ children }: { children: React.ReactNode }) {
  const state = useInitTokenPermitsState();

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
