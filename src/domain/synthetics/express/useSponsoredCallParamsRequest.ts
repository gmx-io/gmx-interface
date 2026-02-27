import { useMemo } from "react";
import useSWR from "swr";

import { getIsFlagEnabled } from "config/ab";
import { metrics } from "lib/metrics";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { fetchGelatoGasTankBalance } from "./fetchGelatoGasTankBalance";

// $100 threshold in 6-decimal USD (as returned by gelato_getBalance)
const MIN_GELATO_USD_BALANCE = 100_000_000n;

export type SponsoredCallBalanceData = {
  isSponsoredCallAllowed: boolean;
};

export function useIsSponsoredCallBalanceAvailable(chainId: number): SponsoredCallBalanceData {
  const { data: isSponsoredCallAllowed } = useSWR<boolean>([chainId, "isSponsoredCallAllowed"], {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    fetcher: async () => {
      try {
        if (!getIsFlagEnabled("testSponsoredCall")) {
          return false;
        }

        const gasTankBalance = await fetchGelatoGasTankBalance(chainId);

        if (!gasTankBalance) {
          return false;
        }

        return gasTankBalance.balance > MIN_GELATO_USD_BALANCE;
      } catch (error) {
        metrics.pushError(error, "expressOrders.useIsSponsoredCallBalanceAvailable");
        return false;
      }
    },
  });

  return useMemo(() => {
    return {
      isSponsoredCallAllowed: Boolean(isSponsoredCallAllowed),
    };
  }, [isSponsoredCallAllowed]);
}
