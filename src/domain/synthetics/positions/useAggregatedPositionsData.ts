import { useMemo } from "react";
import { useMarketsFeesConfigs } from "../fees/useMarketsFeesConfigs";
import { useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { AggregatedPositionsData } from "./types";
import { usePositionsConstants } from "./usePositionsConstants";
import { getAggregatedPositionData } from "./utils";
import { useOptimisticPositionsData } from "./useOptimisticPositionsData";

type AggregatedPositionsDataResult = {
  aggregatedPositionsData: AggregatedPositionsData;
  isLoading: boolean;
};

export function useAggregatedPositionsData(
  chainId: number,
  p: { savedIsPnlInLeverage: boolean }
): AggregatedPositionsDataResult {
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { marketsFeesConfigs, isLoading: isFeesConfigsLoading } = useMarketsFeesConfigs(chainId);
  const { optimisticPositionsData, isLoading: isPositionsLoading } = useOptimisticPositionsData(chainId);
  const { maxLeverage } = usePositionsConstants(chainId);

  return useMemo(() => {
    const positionKeys = Object.keys(optimisticPositionsData);

    return {
      aggregatedPositionsData: positionKeys.reduce((acc: AggregatedPositionsData, positionKey: string) => {
        const position = getAggregatedPositionData(
          optimisticPositionsData,
          marketsData,
          tokensData,
          marketsFeesConfigs,
          positionKey,
          p.savedIsPnlInLeverage,
          maxLeverage
        );

        if (position) {
          acc[positionKey] = position;
        }

        return acc;
      }, {} as AggregatedPositionsData),
      isLoading: isTokensLoading || isMarketsLoading || isPositionsLoading || isFeesConfigsLoading,
    };
  }, [
    isFeesConfigsLoading,
    isMarketsLoading,
    isPositionsLoading,
    isTokensLoading,
    marketsData,
    marketsFeesConfigs,
    maxLeverage,
    optimisticPositionsData,
    p.savedIsPnlInLeverage,
    tokensData,
  ]);
}
