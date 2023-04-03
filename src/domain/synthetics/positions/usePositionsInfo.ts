import { useMemo } from "react";
import { useMarketsInfo } from "../markets";
import { PositionsInfoData } from "./types";
import { useOptimisticPositionsData } from "./useOptimisticPositionsData";
import { usePositionsConstants } from "./usePositionsConstants";
import { getAggregatedPositionData } from "./utils";

type PositionsInfoResult = {
  positionsInfoData?: PositionsInfoData;
  isLoading: boolean;
};

export function usePositionsInfo(chainId: number, p: { showPnlInLeverage: boolean }): PositionsInfoResult {
  const { showPnlInLeverage } = p;
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { optimisticPositionsData } = useOptimisticPositionsData(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);

  return useMemo(() => {
    if (!marketsInfoData || !optimisticPositionsData) {
      return {
        isLoading: true,
      };
    }

    const positionKeys = Object.keys(optimisticPositionsData);

    return {
      positionsInfoData: positionKeys.reduce((acc: PositionsInfoData, positionKey: string) => {
        const position = getAggregatedPositionData(
          optimisticPositionsData,
          marketsInfoData || {},
          positionKey,
          p.showPnlInLeverage,
          maxLeverage
        );

        if (position) {
          acc[positionKey] = position;
        }

        return acc;
      }, {} as PositionsInfoData),
      isLoading: false,
    };
  }, [marketsInfoData, maxLeverage, optimisticPositionsData, p.showPnlInLeverage]);
}
