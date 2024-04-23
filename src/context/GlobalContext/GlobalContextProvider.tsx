import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { getIsSyntheticsSupported } from "config/features";
import { REDIRECT_POPUP_TIMESTAMP_KEY, TRADE_LINK_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { PendingTransaction, SetPendingTransactions } from "domain/legacy";
import { useLocalStorage } from "react-use";
import { matchPath, useHistory, useLocation } from "react-router-dom";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;

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
  const location = useLocation();
  const history = useHistory();

  const isV1Matched = useMemo(() => matchPath(location.pathname, { path: "/v1/:tradeType?" }), [location.pathname]);
  const defaultVersion = !isV1Matched && getIsSyntheticsSupported(chainId) ? 2 : 1;
  const [savedTradePageVersion, setSavedTradePageVersion] = useLocalStorageSerializeKey(
    [chainId, TRADE_LINK_KEY],
    defaultVersion
  );

  const tradePageVersion = isV1Matched ? 1 : 2;

  // manual switch
  const setTradePageVersion = useCallback(
    (version: number) => {
      setSavedTradePageVersion(version);
      if (version === 1) {
        history.replace("/v1");
      } else if (version === 2) {
        history.replace("/trade");
      }
    },
    [history, setSavedTradePageVersion]
  );

  // chainId changes -> switch to prev selected version
  useEffect(() => {
    if (savedTradePageVersion === 1) {
      history.replace("/v1");
    } else if (savedTradePageVersion === 2) {
      history.replace("/trade");
    }
  }, [chainId, savedTradePageVersion, history]);

  return [tradePageVersion, setTradePageVersion] as const;
}
