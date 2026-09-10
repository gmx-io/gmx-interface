import { metrics, MissedMarketPricesCounter } from "lib/metrics";

export type MissedMarketPricesParams = {
  chainId: number;
  marketAddress: string;
  marketName: string | undefined;
  source: "usePositions" | "useKeysAndPricesParams";
  hasPrices: boolean;
};

export function createMissedMarketPricesTracker() {
  const reportedKeys = new Set<string>();

  /**
   * Pushes the counter once per "missing prices" episode of a market instead of on every prices tick:
   * the market is reported when its prices disappear and armed again once they are back.
   */
  return function trackMissedMarketPrices(p: MissedMarketPricesParams) {
    const { chainId, marketAddress, marketName, source, hasPrices } = p;
    const key = `${chainId}:${source}:${marketAddress}`;

    if (hasPrices) {
      reportedKeys.delete(key);
      return;
    }

    if (reportedKeys.has(key)) {
      return;
    }

    reportedKeys.add(key);

    metrics.pushCounter<MissedMarketPricesCounter>("missedMarketPrices", {
      marketName: marketName ?? marketAddress,
      source,
    });
  };
}

export const trackMissedMarketPrices = createMissedMarketPricesTracker();
