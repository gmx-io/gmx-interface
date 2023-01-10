import { useMemo } from "react";
import { useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { usePositionsData } from "./usePositionsData";
import { AggregatedPositionsData } from "./types";
import { getAggregatedPositionData } from "./utils";
import { useContractEvents } from "../contractEvents";

type AggregatedPositionsDataResult = {
  aggregatedPositionsData: AggregatedPositionsData;
  isLoading: boolean;
};

export function useAggregatedPositionsData(chainId: number): AggregatedPositionsDataResult {
  const { pendingPositionsUpdates, positionsUpdates } = useContractEvents();
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { positionsData, isLoading: isPositionsLoading } = usePositionsData(chainId);

  return useMemo(() => {
    const positionKeys = Object.keys(positionsData);

    return {
      aggregatedPositionsData: positionKeys.reduce((acc: AggregatedPositionsData, positionKey) => {
        acc[positionKey] = getAggregatedPositionData(
          positionsData,
          marketsData,
          tokensData,
          pendingPositionsUpdates,
          positionsUpdates,
          positionKey
        )!;

        return acc;
      }, {} as AggregatedPositionsData),
      isLoading: isTokensLoading || isMarketsLoading || isPositionsLoading,
    };
  }, [
    isMarketsLoading,
    isPositionsLoading,
    isTokensLoading,
    marketsData,
    pendingPositionsUpdates,
    positionsData,
    positionsUpdates,
    tokensData,
  ]);
}
