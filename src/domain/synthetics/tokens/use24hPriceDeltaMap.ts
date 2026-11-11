import { useMemo } from "react";
import useSWR from "swr";
import { Address } from "viem";

import { isSolanaNetwork } from "config/chains";
import { useChainId } from "lib/chains";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import type { DayPriceCandle } from "lib/oracleKeeperFetcher/types";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { ContractsChainId } from "sdk/configs/chains";
import { getToken } from "sdk/configs/tokens";

import { type PriceDelta, getPriceDelta } from "./priceDelta";

export type { PriceDelta } from "./priceDelta";

export type PriceDeltaMap = Partial<Record<Address, PriceDelta>>;

type PriceDeltaResponse =
  | { network: "evm"; candles: DayPriceCandle[] }
  | { network: "solana"; deltas: Partial<Record<string, PriceDelta>> };

export function use24hPriceDeltaMap(
  chainId: number,
  tokenAddresses: (Address | undefined)[]
): PriceDeltaMap | undefined {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId as ContractsChainId);
  const { networkId } = useChainId();
  // On Solana chainId stays Arbitrum and the SDK has no Solana mints, so deltas come keyed by mint
  // through each token's arbitrumTokenAddress.
  const isSolana = isSolanaNetwork(networkId);

  const { data } = useSWR<PriceDeltaResponse>(
    [isSolana ? networkId : chainId, oracleKeeperFetcher.url, "use24PriceDelta"],
    {
      fetcher: async (): Promise<PriceDeltaResponse> => {
        const response: PriceDeltaResponse = isSolana
          ? {
              network: "solana",
              deltas: await import("domain/gmsol/tokens/fetchGmsol24hPriceDeltas").then(
                ({ fetchGmsol24hPriceDeltas }) => fetchGmsol24hPriceDeltas(oracleKeeperFetcher)
              ),
            }
          : { network: "evm", candles: await oracleKeeperFetcher.fetch24hPrices() };

        freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Prices24h);
        return response;
      },
    }
  );

  const priceDeltas = useMemo(() => {
    return Object.fromEntries(
      tokenAddresses
        .filter((tokenAddress): tokenAddress is Address => Boolean(tokenAddress))
        .map((tokenAddress) => {
          if (data?.network === "solana") {
            return [tokenAddress, data.deltas[tokenAddress]];
          }

          // Solana selected but its response not here yet: never look a mint up in the SDK config.
          if (isSolana) {
            return [tokenAddress, undefined];
          }

          return [tokenAddress, getPriceDelta(data?.candles, getToken(chainId, tokenAddress).symbol)];
        })
    );
  }, [chainId, data, isSolana, tokenAddresses]);

  return priceDeltas;
}
