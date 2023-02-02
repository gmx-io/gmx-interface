import { useMemo } from "react";
import { uniq } from "lodash";
import { useMarketsData } from "../markets";
import { useAvailableTokensData } from "../tokens";
import { usePositionsData } from "./usePositionsData";
import { AggregatedPositionsData } from "./types";
import { getAggregatedPositionData } from "./utils";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMarketsFeesConfigs } from "../fees/useMarketsFeesConfigs";

type AggregatedPositionsDataResult = {
  aggregatedPositionsData: AggregatedPositionsData;
  isLoading: boolean;
};

export function useAggregatedPositionsData(chainId: number): AggregatedPositionsDataResult {
  const { pendingPositionsUpdates, positionsUpdates } = useSyntheticsEvents();
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { marketsFeesConfigs, isLoading: isFeesConfigsLoading } = useMarketsFeesConfigs(chainId);
  const { positionsData, isLoading: isPositionsLoading } = usePositionsData(chainId);

  return useMemo(() => {
    const positionKeys = uniq(Object.keys(positionsData).concat(Object.keys(pendingPositionsUpdates)));

    return {
      aggregatedPositionsData: positionKeys.reduce((acc: AggregatedPositionsData, positionKey: string) => {
        const position = getAggregatedPositionData(
          positionsData,
          marketsData,
          tokensData,
          marketsFeesConfigs,
          pendingPositionsUpdates,
          positionsUpdates,
          positionKey
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
    pendingPositionsUpdates,
    positionsData,
    positionsUpdates,
    tokensData,
  ]);
}
