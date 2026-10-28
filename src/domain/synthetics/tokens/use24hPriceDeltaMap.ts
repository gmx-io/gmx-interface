import { useMemo } from "react";
import useSWR from "swr";
import { Address } from "viem";

import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { ContractsChainId } from "sdk/configs/chains";
import { getToken } from "sdk/configs/tokens";

import { type PriceDelta, getPriceDelta } from "./priceDelta";

export type { PriceDelta } from "./priceDelta";

export type PriceDeltaMap = Partial<Record<Address, PriceDelta>>;

export function use24hPriceDeltaMap(
  chainId: number,
  tokenAddresses: (Address | undefined)[]
): PriceDeltaMap | undefined {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId as ContractsChainId);

  const { data } = useSWR<
    {
      close: number;
      high: number;
      low: number;
      open: number;
      tokenSymbol: string;
    }[]
  >([chainId, oracleKeeperFetcher.url, "use24PriceDelta"], {
    fetcher: () => {
      return oracleKeeperFetcher.fetch24hPrices().then((res) => {
        freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Prices24h);
        return res;
      });
    },
  });

  const priceDeltas = useMemo(() => {
    return Object.fromEntries(
      tokenAddresses
        .filter((tokenAddress): tokenAddress is Address => Boolean(tokenAddress))
        .map((tokenAddress) => [tokenAddress, getPriceDelta(data, getToken(chainId, tokenAddress).symbol)])
    );
  }, [chainId, data, tokenAddresses]);

  return priceDeltas;
}
