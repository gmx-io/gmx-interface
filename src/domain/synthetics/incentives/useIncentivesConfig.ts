import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";

import type { BoostId, IncentivesConfig, StakingTierId, VolumeTierId } from "./types";

type RawVolumeTierConfig = { tier: VolumeTierId; threshold: string; multiplier: number };
type RawStakingTierConfig = { tier: StakingTierId; threshold: string; multiplier: number };
type RawBoostConfig = { boost: BoostId | "MultichainTrades"; multiplier: number };

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
      downgradingCoefficients {
        market
        coefficient
      }
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
        volumeTiers: (config.volumeTiers as RawVolumeTierConfig[])
          .map((t) => ({
            tier: t.tier,
            threshold: BigInt(t.threshold),
            multiplier: t.multiplier,
          }))
          .sort((a, b) => (a.threshold < b.threshold ? -1 : a.threshold > b.threshold ? 1 : 0)),
        stakingTiers: (config.stakingTiers as RawStakingTierConfig[])
          .map((t) => ({
            tier: t.tier,
            threshold: BigInt(t.threshold),
            multiplier: t.multiplier,
          }))
          .sort((a, b) => (a.threshold < b.threshold ? -1 : a.threshold > b.threshold ? 1 : 0)),
        boosts: (config.boosts as RawBoostConfig[])
          .filter((b): b is { boost: BoostId; multiplier: number } => b.boost !== "MultichainTrades")
          .map((b) => ({
            boost: b.boost,
            multiplier: b.multiplier,
          })),
        balancingTradesThreshold: BigInt(config.balancingTradesThreshold),
        lifetimeVolumeThreshold: BigInt(config.lifetimeVolumeThreshold),
        downgradingCoefficients: Object.fromEntries(
          (config.downgradingCoefficients ?? []).map((c: { market: string; coefficient: string }) => [
            c.market,
            BigInt(c.coefficient),
          ])
        ),
        featuredMarketTokens: config.featuredMarkets ?? [],
      };
    },
    refreshInterval: 5 * 60_000,
    revalidateOnFocus: false,
  });

  return useMemo(() => ({ data, error, loading: isLoading }), [data, error, isLoading]);
}
