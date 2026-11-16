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
