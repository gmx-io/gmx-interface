import { useMemo } from "react";
import { useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { usePositionsData } from "./usePositionsData";
import { AggregatedPositionsData } from "./types";
import { getAggregatedPositionData } from "./utils";

type AggregatedPositionsDataResult = {
  aggregatedPositionsData: AggregatedPositionsData;
  isLoading: boolean;
};

export function useAggregatedPositionsData(chainId: number): AggregatedPositionsDataResult {
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { positionsData, isLoading: isPositionsLoading } = usePositionsData(chainId);

  return useMemo(() => {
    const positionKeys = Object.keys(positionsData);

    return {
      aggregatedPositionsData: positionKeys.reduce((acc: AggregatedPositionsData, positionKey) => {
        acc[positionKey] = getAggregatedPositionData(positionsData, marketsData, tokensData, positionKey)!;

        return acc;
      }, {} as AggregatedPositionsData),
      isLoading: isTokensLoading || isMarketsLoading || isPositionsLoading,
    };
  }, [isMarketsLoading, isPositionsLoading, isTokensLoading, marketsData, positionsData, tokensData]);
}
