import { RedirectChainIds } from "landing/pages/Home/hooks/useGoToTrade";
import { PoolsData, usePoolsData } from "landing/pages/Home/hooks/usePoolsData";
import noop from "lodash/noop";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { SolanaRedirectModal } from "../SolanaRedirectModal/SolanaRedirectModal";

type HomePageContextType = {
  redirectWithWarning: (to: string, chainId?: RedirectChainIds) => void;
  redirectModalTo: string | null;
  redirectChainId: RedirectChainIds | null;
  poolsData: Partial<PoolsData>;
};

const HomePageContext = createContext<HomePageContextType>({
  redirectWithWarning: noop,
  redirectModalTo: null,
  redirectChainId: null,
  poolsData: {},
});

export function HomePageContextProvider({ children }: { children: React.ReactNode }) {
  const poolsData = usePoolsData();
  const [redirectModalTo, setRedirectModalTo] = useState<string | null>(null);
  const [redirectChainId, setRedirectChainId] = useState<RedirectChainIds | null>(null);

  const redirectWithWarning = useCallback(
    (to: string, chainId?: RedirectChainIds) => {
      if (chainId === RedirectChainIds.Solana) {
        setRedirectModalTo(to);
        setRedirectChainId(chainId);
      } else {
        window.location.href = to;
      }
    },
    [setRedirectModalTo, setRedirectChainId]
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
      poolsData,
    }),
    [redirectWithWarning, redirectModalTo, redirectChainId, poolsData]
  );

  return (
    <HomePageContext.Provider value={value}>
      {children}
      {redirectModalTo && redirectChainId === RedirectChainIds.Solana && (
        <SolanaRedirectModal onClose={handleCloseModal} onConfirm={handleSolanaConfirm} />
      )}
    </HomePageContext.Provider>
  );
}

export function useHomePageContext() {
  return useContext(HomePageContext);
}
