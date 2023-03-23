import { useMemo } from "react";
import { AggregatedPositionsData } from "./types";
import { usePositionsConstants } from "./usePositionsConstants";
import { getAggregatedPositionData } from "./utils";
import { useOptimisticPositionsData } from "./useOptimisticPositionsData";
import { useMarketsInfo } from "../markets";

type AggregatedPositionsDataResult = {
  aggregatedPositionsData: AggregatedPositionsData;
  isLoading: boolean;
};

export function useAggregatedPositionsData(
  chainId: number,
  p: { savedIsPnlInLeverage: boolean }
): AggregatedPositionsDataResult {
  const { marketsInfoData, isLoading: isMarketsInfoLoading } = useMarketsInfo(chainId);
  const { optimisticPositionsData, isLoading: isPositionsLoading } = useOptimisticPositionsData(chainId);
  const { maxLeverage } = usePositionsConstants(chainId);

  return useMemo(() => {
    const positionKeys = Object.keys(optimisticPositionsData);

    return {
      aggregatedPositionsData: positionKeys.reduce((acc: AggregatedPositionsData, positionKey: string) => {
        const position = getAggregatedPositionData(
          optimisticPositionsData,
          marketsInfoData,
          positionKey,
          p.savedIsPnlInLeverage,
          maxLeverage
        );

        if (position) {
          acc[positionKey] = position;
        }

        return acc;
      }, {} as AggregatedPositionsData),
      isLoading: isMarketsInfoLoading || isPositionsLoading,
    };
  }, [
    isMarketsInfoLoading,
    isPositionsLoading,
    marketsInfoData,
    maxLeverage,
    optimisticPositionsData,
    p.savedIsPnlInLeverage,
  ]);
}
