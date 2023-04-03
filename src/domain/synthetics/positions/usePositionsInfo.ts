import { useMemo } from "react";
import { PositionsInfoData } from "./types";
import { usePositionsConstants } from "./usePositionsConstants";
import { getAggregatedPositionData } from "./utils";
import { useOptimisticPositionsData } from "./useOptimisticPositionsData";
import { useMarketsInfo } from "../markets";

type PositionsInfoResult = {
  positionsInfoData: PositionsInfoData;
  isLoading: boolean;
};

export function usePositionsInfo(chainId: number, p: { showPnlInLeverage: boolean }): PositionsInfoResult {
  const { showPnlInLeverage } = p;

  const { marketsInfoData, isLoading: isMarketsInfoLoading } = useMarketsInfo(chainId);
  const { optimisticPositionsData, isLoading: isPositionsLoading } = useOptimisticPositionsData(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);

  return useMemo(() => {
    const positionKeys = Object.keys(optimisticPositionsData);

    return {
      positionsInfoData: positionKeys.reduce((acc: PositionsInfoData, positionKey: string) => {
        const position = getAggregatedPositionData(
          optimisticPositionsData,
          marketsInfoData,
          positionKey,
          p.showPnlInLeverage,
          maxLeverage
        );

        if (position) {
          acc[positionKey] = position;
        }

        return acc;
      }, {} as PositionsInfoData),
      isLoading: isMarketsInfoLoading || isPositionsLoading,
    };
  }, [
    isMarketsInfoLoading,
    isPositionsLoading,
    marketsInfoData,
    maxLeverage,
    optimisticPositionsData,
    p.showPnlInLeverage,
  ]);
}
