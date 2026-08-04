import { useCallback, useReducer } from "react";

import {
  DelistingToast,
  getActiveDelistingAnnouncementsForExposure,
  writeDismissal,
} from "./delistingExitAnnouncementsLogic";
import { useDelistingExposure } from "./useDelistingExposure";

type Result = {
  announcements: DelistingToast[];
  dismiss: (item: DelistingToast) => void;
};

// Runs at the app shell for the connected wallet, so the exit warnings appear on every page and never
// duplicate (a single instance), regardless of which SyntheticsStateContextProvider is mounted.
export function useDelistingExitAnnouncements(): Result {
  const { account, positionMarkets, positionNames, positionCount, liquidityMarkets, liquidityNames } =
    useDelistingExposure();

  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const dismiss = useCallback((item: DelistingToast) => {
    writeDismissal(item.id, item.markets, Date.now());
    forceRerender();
  }, []);

  const announcements = account
    ? getActiveDelistingAnnouncementsForExposure({
        positionMarkets,
        positionNames,
        positionCount,
        liquidityMarkets,
        liquidityNames,
        now: Date.now(),
      })
    : [];

  return { announcements, dismiss };
}
