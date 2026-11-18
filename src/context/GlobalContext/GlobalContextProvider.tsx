import { PropsWithChildren, createContext, memo, useContext, useMemo } from "react";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;
};

const context = createContext<GlobalContextType>(null);

const { Provider } = context;

export const GlobalStateProvider = memo(({ children }: PropsWithChildren<{}>) => {
  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  const value = useMemo(
    () => ({
      tradePageVersion,
      setTradePageVersion,
    }),
    [tradePageVersion, setTradePageVersion]
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
