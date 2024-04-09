import { Dispatch, PropsWithChildren, SetStateAction, createContext, memo, useContext, useMemo } from "react";
import { getIsSyntheticsSupported } from "config/features";
import { REDIRECT_POPUP_TIMESTAMP_KEY, TRADE_LINK_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { PendingTransaction, SetPendingTransactions } from "domain/legacy";
import { useLocalStorage } from "react-use";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: Dispatch<SetStateAction<number | undefined>>;

  pendingTxns: PendingTransaction[];
  setPendingTxns: SetPendingTransactions;

  redirectPopupTimestamp: number | undefined;
  setRedirectPopupTimestamp: Dispatch<SetStateAction<number | undefined>>;
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

    const [redirectPopupTimestamp, setRedirectPopupTimestamp] = useLocalStorage<number | undefined>(
      REDIRECT_POPUP_TIMESTAMP_KEY,
      undefined,
      {
        raw: false,
        deserializer: (val) => {
          if (!val) {
            return undefined;
          }
          const num = parseInt(val);

          if (Number.isNaN(num)) {
            return undefined;
          }

          return num;
        },
        serializer: (val) => (val ? val.toString() : ""),
      }
    );

    const value = useMemo(
      () => ({
        tradePageVersion,
        setTradePageVersion,
        pendingTxns,
        setPendingTxns,
        redirectPopupTimestamp,
        setRedirectPopupTimestamp,
      }),
      [
        tradePageVersion,
        setTradePageVersion,
        pendingTxns,
        setPendingTxns,
        redirectPopupTimestamp,
        setRedirectPopupTimestamp,
      ]
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
