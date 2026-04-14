import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { IncentivesConfig } from "./types";

const INCENTIVES_CONFIG_QUERY = gql`
  query CurrentIncentivesConfig {
    currentIncentivesConfig {
      programStartTimestamp
      epochTimestamp
      epochStartTimestamp
      epochDuration
      maxMultiplier
      multiplierDecimals
      volumeTierPersistenceEpochs
      pointsExpirationEpochs
      basePointsFactor
      pointsToGmxFactor
      volumeTiers {
        tier
        threshold
        multiplier
      }
      stakingTiers {
        tier
        threshold
        multiplier
      }
      boosts {
        boost
        multiplier
      }
      balancingTradesThreshold
      lifetimeVolumeThreshold
      featuredMarkets
    }
  }
`;

export function useIncentivesConfig(chainId: number) {
  const { data, error, isLoading } = useSWR<IncentivesConfig | undefined>(["useIncentivesConfig", chainId], {
    fetcher: async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client) return undefined;

      const res = await client.query({
        query: INCENTIVES_CONFIG_QUERY,
        fetchPolicy: "no-cache",
      });

      const config = res?.data?.currentIncentivesConfig;
      if (!config) return undefined;

      return {
        programStartTimestamp: config.programStartTimestamp,
        epochTimestamp: config.epochTimestamp,
        epochStartTimestamp: config.epochStartTimestamp,
        epochDuration: config.epochDuration,
        maxMultiplier: config.maxMultiplier,
        multiplierDecimals: config.multiplierDecimals,
        volumeTierPersistenceEpochs: config.volumeTierPersistenceEpochs,
        pointsExpirationEpochs: config.pointsExpirationEpochs,
        basePointsFactor: BigInt(config.basePointsFactor),
        pointsToGmxFactor: BigInt(config.pointsToGmxFactor),
        volumeTiers: config.volumeTiers.map((t: { tier: string; threshold: string; multiplier: number }) => ({
          tier: t.tier,
          threshold: BigInt(t.threshold),
          multiplier: t.multiplier,
        })),
        stakingTiers: config.stakingTiers.map((t: { tier: string; threshold: string; multiplier: number }) => ({
          tier: t.tier,
          threshold: BigInt(t.threshold),
          multiplier: t.multiplier,
        })),
        boosts: config.boosts
          .filter((b: { boost: string }) => b.boost !== "MultichainTrades")
          .map((b: { boost: string; multiplier: number }) => ({
            boost: b.boost,
            multiplier: b.multiplier,
          })),
        balancingTradesThreshold: BigInt(config.balancingTradesThreshold),
        lifetimeVolumeThreshold: BigInt(config.lifetimeVolumeThreshold),
        volumeDowngradingCoefficients: config.volumeDowngradingCoefficients
          ? config.volumeDowngradingCoefficients.map(
              (epoch: { epochTimestamp: number; coefficients: { market: string; coefficient: number }[] }) => ({
                epochTimestamp: epoch.epochTimestamp,
                coefficients: epoch.coefficients.map((c: { market: string; coefficient: number }) => ({
                  market: c.market,
                  coefficient: c.coefficient,
                })),
              })
            )
          : [],
        featuredMarketTokens: config.featuredMarkets ?? [],
      };
    },
    refreshInterval: 5 * 60_000,
    revalidateOnFocus: false,
  });

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
