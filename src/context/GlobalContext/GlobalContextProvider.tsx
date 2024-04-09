import { Dispatch, PropsWithChildren, SetStateAction, createContext, memo, useContext, useMemo } from "react";
import { getIsSyntheticsSupported } from "config/features";
import { TRADE_LINK_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { PendingTransaction, SetPendingTransactions } from "domain/legacy";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: Dispatch<SetStateAction<number | undefined>>;

  pendingTxns: PendingTransaction[];
  setPendingTxns: SetPendingTransactions;
};

const context = createContext<GlobalContextType>(null);

const { Provider } = context;

export const GlobalStateProvider = memo(
  ({
    pendingTxns,
    setPendingTxns,
    children,
  }: PropsWithChildren<{
    pendingTxns: PendingTransaction[];
    setPendingTxns: SetPendingTransactions;
  }>) => {
    const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

    const value = useMemo(
      () => ({ tradePageVersion, setTradePageVersion, pendingTxns, setPendingTxns }),
      [tradePageVersion, setTradePageVersion, pendingTxns, setPendingTxns]
    );

    return <Provider value={value}>{children}</Provider>;
  }
);

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
