import { Dispatch, PropsWithChildren, SetStateAction, createContext, memo, useContext, useMemo } from "react";
import { getIsSyntheticsSupported } from "config/features";
import { TRADE_LINK_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: Dispatch<SetStateAction<number | undefined>>;
};

const context = createContext<GlobalContextType>(null);

const { Provider } = context;

export const GlobalStateProvider = memo(({ children }: PropsWithChildren) => {
  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  const value = useMemo(() => ({ tradePageVersion, setTradePageVersion }), [tradePageVersion, setTradePageVersion]);

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
  const { chainId } = useChainId();
  const defaultVersion = getIsSyntheticsSupported(chainId) ? 2 : 1;
  const [tradePageVersionRaw, setTradePageVersion] = useLocalStorageSerializeKey(
    [chainId, TRADE_LINK_KEY],
    defaultVersion
  );
  const tradePageVersion = tradePageVersionRaw ?? defaultVersion;

  return [tradePageVersion, setTradePageVersion] as const;
}
