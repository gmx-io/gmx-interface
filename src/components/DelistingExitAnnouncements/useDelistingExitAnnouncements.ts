import { useCallback, useReducer } from "react";

import { isQaMockOn } from "config/qaMocks";

import {
  DelistingExposure,
  DelistingToast,
  getActiveDelistingAnnouncementsForExposure,
  writeDismissal,
} from "./delistingExitAnnouncementsLogic";
import { useDelistingExposure } from "./useDelistingExposure";

const QA_EXPOSURE: DelistingExposure = {
  positionMarkets: ["qa-delisting-market"],
  positionNames: ["DOGE/USD"],
  positionCount: 2,
  liquidityMarkets: ["qa-delisting-pool"],
  liquidityNames: ["DOGE/USD [WETH-USDC]"],
};

type Result = {
  announcements: DelistingToast[];
  isLoading: boolean;
  dismiss: (item: DelistingToast) => void;
};

// Runs at the app shell for the connected wallet, so the exit warnings appear on every page and never
// duplicate (a single instance), regardless of which SyntheticsStateContextProvider is mounted.
export function useDelistingExitAnnouncements(): Result {
  const { account, isLoading, positionMarkets, positionNames, positionCount, liquidityMarkets, liquidityNames } =
    useDelistingExposure();

  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const dismiss = useCallback((item: DelistingToast) => {
    writeDismissal(item.id, item.markets, Date.now());
    forceRerender();
  }, []);

  const isQa = isQaMockOn("funds");
  const exposure = isQa
    ? QA_EXPOSURE
    : { positionMarkets, positionNames, positionCount, liquidityMarkets, liquidityNames };

  const announcements =
    account || isQa ? getActiveDelistingAnnouncementsForExposure({ ...exposure, now: Date.now() }) : [];

  return { announcements, isLoading: isLoading && !isQa, dismiss };
}
