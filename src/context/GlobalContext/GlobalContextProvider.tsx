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
  useState,
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

  notifyModalOpen: boolean;
  setNotifyModalOpen: (nextState: boolean) => void;
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

    const [notifyModalOpen, setNotifyModalOpen] = useState(false);

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
        notifyModalOpen,
        setNotifyModalOpen,
      }),
      [
        tradePageVersion,
        setTradePageVersion,
        pendingTxns,
        setPendingTxns,
        redirectPopupTimestamp,
        setRedirectPopupTimestamp,
        notifyModalOpen,
        setNotifyModalOpen,
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

  const isV2Matched = useMemo(() => matchPath(location.pathname, { path: "/trade/:tradeType?" }), [location.pathname]);
  const isV1Matched = useMemo(() => matchPath(location.pathname, { path: "/v1/:tradeType?" }), [location.pathname]);
  const defaultVersion = !isV1Matched && getIsSyntheticsSupported(chainId) ? 2 : 1;
  const [savedTradePageVersion, setSavedTradePageVersion] = useLocalStorageSerializeKey(
    [chainId, TRADE_LINK_KEY],
    defaultVersion
  );

  const tradePageVersion = savedTradePageVersion ?? defaultVersion;

  // manual switch
  const setTradePageVersion = useCallback(
    (version: number) => {
      setSavedTradePageVersion(version);
      if (version === 1 && isV2Matched) {
        history.replace("/v1");
      } else if (version === 2 && isV1Matched) {
        history.replace("/trade");
      }
    },
    [history, setSavedTradePageVersion, isV1Matched, isV2Matched]
  );

  // chainId changes -> switch to prev selected version
  useEffect(() => {
    if (savedTradePageVersion === 1 && isV2Matched) {
      history.replace("/v1");
    } else if (savedTradePageVersion === 2 && isV1Matched) {
      history.replace("/trade");
    }
  }, [chainId, savedTradePageVersion, history, isV1Matched, isV2Matched]);

  return [tradePageVersion, setTradePageVersion] as const;
}
