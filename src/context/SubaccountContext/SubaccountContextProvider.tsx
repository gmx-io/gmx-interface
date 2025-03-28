import { SubaccountState, useInitSubaccountState } from "domain/synthetics/gassless/useInitSubaccountState";
import React, { createContext, useContext } from "react";

const SubaccountContext = createContext<SubaccountState | undefined>(undefined);

export function useSubaccountContext() {
  const context = useContext(SubaccountContext);
  if (!context) {
    throw new Error("useSubaccount must be used within SubaccountContextProvider");
  }
  return context;
}

export function SubaccountContextProvider({ children }: { children: React.ReactNode }) {
  const state = useInitSubaccountState();

  return <SubaccountContext.Provider value={state}>{children}</SubaccountContext.Provider>;
}
