import noop from "lodash/noop";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";

import { REDIRECT_POPUP_TIMESTAMP_KEY } from "config/localStorage";
import { RedirectChainIds } from "landing/pages/Home/hooks/useGoToTrade";
import { PoolsData, usePoolsData } from "landing/pages/Home/hooks/usePoolsData";

import { LeaveHomepageRedirectModal } from "../LeaveHomepageRedirectModal/LeaveHompageRedirectModal";
import { SolanaRedirectModal } from "../SolanaRedirectModal/SolanaRedirectModal";

type HomePageContextType = {
  redirectWithWarning: (to: string, chainId?: RedirectChainIds) => void;
  redirectModalTo: string | null;
  redirectChainId: RedirectChainIds | null;
  redirectPopupTimestamp: number | undefined;
  setRedirectPopupTimestamp: Dispatch<SetStateAction<number | undefined>>;
  shouldShowRedirectModal: () => boolean;
  poolsData: Partial<PoolsData>;
};

export const HomePageContext = createContext<HomePageContextType>({
  redirectWithWarning: noop,
  redirectModalTo: null,
  redirectChainId: null,
  redirectPopupTimestamp: undefined,
  setRedirectPopupTimestamp: noop,
  shouldShowRedirectModal: () => false,
  poolsData: {},
});
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

export function HomePageContextProvider({ children }: { children: React.ReactNode }) {
  const poolsData = usePoolsData();
  const [redirectModalTo, setRedirectModalTo] = useState<string | null>(null);
  const [redirectChainId, setRedirectChainId] = useState<RedirectChainIds | null>(null);
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

        if (isNaN(num)) {
          return undefined;
        }

        return num;
      },
      serializer: (val) => (val ? val.toString() : ""),
    }
  );

  const shouldShowRedirectModal = useCallback(() => {
    if (!redirectPopupTimestamp) {
      return true;
    }

    const expiryTime = redirectPopupTimestamp + THIRTY_DAYS;
    const now = Date.now();
    if (redirectPopupTimestamp < 0 || redirectPopupTimestamp > now) {
      return true;
    }
    return now > expiryTime;
  }, [redirectPopupTimestamp]);

  const redirectWithWarning = useCallback(
    (to: string, chainId?: RedirectChainIds) => {
      if (shouldShowRedirectModal()) {
        setRedirectModalTo(to);
        setRedirectChainId(chainId || null);
      } else {
        window.location.href = to;
      }
    },
    [shouldShowRedirectModal, setRedirectModalTo, setRedirectChainId]
  );

  const handleSolanaConfirm = useCallback(() => {
    if (redirectModalTo) {
      window.location.href = redirectModalTo;
    }
  }, [redirectModalTo]);

  const handleCloseModal = useCallback(() => {
    setRedirectModalTo(null);
    setRedirectChainId(null);
  }, []);

  const value = useMemo(
    () => ({
      redirectWithWarning,
      redirectModalTo,
      redirectChainId,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
      shouldShowRedirectModal,
      poolsData,
    }),
    [
      redirectWithWarning,
      redirectModalTo,
      redirectChainId,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
      shouldShowRedirectModal,
      poolsData,
    ]
  );

  return (
    <HomePageContext.Provider value={value}>
      {children}
      {redirectModalTo &&
        (redirectChainId === RedirectChainIds.Solana ? (
          <SolanaRedirectModal onClose={handleCloseModal} onConfirm={handleSolanaConfirm} />
        ) : (
          <LeaveHomepageRedirectModal
            to={redirectModalTo}
            onClose={handleCloseModal}
            setRedirectPopupTimestamp={setRedirectPopupTimestamp}
          />
        ))}
    </HomePageContext.Provider>
  );
}

export function useHomePageContext() {
  return useContext(HomePageContext);
}
