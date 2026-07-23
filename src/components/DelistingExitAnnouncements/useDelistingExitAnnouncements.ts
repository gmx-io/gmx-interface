import { useCallback, useReducer } from "react";

import { hasDelistingMarkets } from "config/static/markets";
import { useMarketsInfoRequest, useMarketTokensDataRequest } from "domain/synthetics/markets";
import { usePositions } from "domain/synthetics/positions";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { DelistingToast, getActiveDelistingAnnouncements, writeDismissal } from "./delistingExitAnnouncementsLogic";

type Result = {
  announcements: DelistingToast[];
  dismiss: (item: DelistingToast) => void;
};

// Runs at the app shell for the connected wallet, so the exit warnings appear on every page and never
// duplicate (a single instance), regardless of which SyntheticsStateContextProvider is mounted.
export function useDelistingExitAnnouncements(): Result {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const enabled = Boolean(account) && hasDelistingMarkets(chainId);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const positions = usePositions(chainId, {
    marketsData: marketsInfoData,
    tokensData,
    account,
    enabled,
  });

  const { marketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: true,
    account,
    withGlv: false,
    enabled,
  });

  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const dismiss = useCallback((item: DelistingToast) => {
    writeDismissal(item.id, item.markets, Date.now());
    forceRerender();
  }, []);

  const announcements = getActiveDelistingAnnouncements({
    chainId,
    positionsInfoData: positions.positionsData,
    depositMarketTokensData: marketTokensData,
    marketsInfoData,
    now: Date.now(),
  });

  return { announcements, dismiss };
}
