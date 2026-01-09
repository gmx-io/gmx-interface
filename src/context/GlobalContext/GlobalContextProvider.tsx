import { PropsWithChildren, createContext, memo, useContext, useMemo, useState } from "react";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;

  notifyModalOpen: boolean;
  setNotifyModalOpen: (nextState: boolean) => void;
};

const context = createContext<GlobalContextType>(null);

const { Provider } = context;

export const GlobalStateProvider = memo(({ children }: PropsWithChildren<{}>) => {
  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  const value = useMemo(
    () => ({
      tradePageVersion,
      setTradePageVersion,
      notifyModalOpen,
      setNotifyModalOpen,
    }),
    [tradePageVersion, setTradePageVersion, notifyModalOpen, setNotifyModalOpen]
  );

  return <Provider value={value}>{children}</Provider>;
});

export const useGlobalContext = () => {
  const value = useContext(context);
  if (value === null) {
    throw new Error("useGlobalContext must be used within a GlobalContextProvider");
  }

  return value;
};

function useTradePageVersion() {
  return [2, () => null] as const;
}
