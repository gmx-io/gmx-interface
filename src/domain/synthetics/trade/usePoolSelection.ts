import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { MarketLiquidityAndFeeStat } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { TradeType } from "sdk/types/trade";

export const BEST_POOL_MARKER = "BEST_POOL";

export type PoolSelectionResult = {
  optionsWithBestPool: MarketStat[];
  positionStatsWithBestPool: Record<string, MarketLiquidityAndFeeStat>;
  bestPoolAddress: string | undefined;
  isBestPoolSelected: boolean;
  handlePoolSelect: (marketAddress: string) => void;
  selectedPoolName: string | undefined;
};

export type UsePoolSelectionParams = {
  relatedMarketStats: MarketStat[] | undefined;
  relatedMarketsPositionStats: Record<string, MarketLiquidityAndFeeStat>;
  tradeType: TradeType;
  currentMarketAddress: string | undefined;
  currentPoolName: string | undefined;
  setMarketAddress: (marketAddress: string) => void;
};

function findBestPool(
  marketStats: MarketStat[] | undefined,
  positionStats: Record<string, MarketLiquidityAndFeeStat>,
  isLong: boolean
): MarketStat | undefined {
  if (!marketStats || marketStats.length === 0) {
    return undefined;
  }

  const eligiblePools = marketStats.filter((stat) => {
    const positionStat = positionStats[stat.marketInfo.marketTokenAddress];
    return positionStat?.isEnoughLiquidity !== false;
  });

  if (eligiblePools.length === 0) {
    return marketStats.reduce((best, current) => {
      const currentNetFee = isLong ? current.netFeeLong : current.netFeeShort;
      const bestNetFee = isLong ? best.netFeeLong : best.netFeeShort;
      return currentNetFee > bestNetFee ? current : best;
    });
  }

  return eligiblePools.reduce((best, current) => {
    const currentNetFee = isLong ? current.netFeeLong : current.netFeeShort;
    const bestNetFee = isLong ? best.netFeeLong : best.netFeeShort;
    return currentNetFee > bestNetFee ? current : best;
  });
}

function createBestPoolMarketStat(bestPoolStat: MarketStat): MarketStat {
  return {
    ...bestPoolStat,
    marketInfo: {
      ...bestPoolStat.marketInfo,
      marketTokenAddress: BEST_POOL_MARKER,
      name: t`Best pool`,
    },
  };
}

export function usePoolSelection({
  relatedMarketStats,
  relatedMarketsPositionStats,
  tradeType,
  currentMarketAddress,
  currentPoolName,
  setMarketAddress,
}: UsePoolSelectionParams): PoolSelectionResult {
  const [isBestPoolMode, setIsBestPoolMode] = useLocalStorageSerializeKey("is-best-pool-mode", true);

  const isLong = tradeType === TradeType.Long;
  const prevBestPoolAddressRef = useRef<string | undefined>(undefined);

  const bestPoolStat = useMemo(() => {
    return findBestPool(relatedMarketStats, relatedMarketsPositionStats, isLong);
  }, [relatedMarketStats, relatedMarketsPositionStats, isLong]);

  const bestPoolAddress = bestPoolStat?.marketInfo.marketTokenAddress;

  const optionsWithBestPool = useMemo(() => {
    if (!relatedMarketStats || relatedMarketStats.length <= 1) {
      return relatedMarketStats || [];
    }

    if (!bestPoolStat) {
      return relatedMarketStats;
    }

    const bestPoolOption = createBestPoolMarketStat(bestPoolStat);
    return [bestPoolOption, ...relatedMarketStats];
  }, [relatedMarketStats, bestPoolStat]);

  const positionStatsWithBestPool = useMemo(() => {
    if (!bestPoolAddress || !relatedMarketsPositionStats[bestPoolAddress]) {
      return relatedMarketsPositionStats;
    }

    return {
      ...relatedMarketsPositionStats,
      [BEST_POOL_MARKER]: relatedMarketsPositionStats[bestPoolAddress],
    };
  }, [relatedMarketsPositionStats, bestPoolAddress]);

  useEffect(() => {
    if (!isBestPoolMode || !bestPoolAddress) {
      return;
    }

    if (prevBestPoolAddressRef.current !== bestPoolAddress) {
      prevBestPoolAddressRef.current = bestPoolAddress;

      if (currentMarketAddress !== bestPoolAddress) {
        setMarketAddress(bestPoolAddress);
      }
    }

    if (currentMarketAddress !== bestPoolAddress) {
      setIsBestPoolMode(false);
    }
  }, [isBestPoolMode, bestPoolAddress, currentMarketAddress, setMarketAddress, setIsBestPoolMode]);

  const handlePoolSelect = useCallback(
    (marketAddress: string) => {
      if (marketAddress === BEST_POOL_MARKER) {
        setIsBestPoolMode(true);
        if (bestPoolAddress) {
          setMarketAddress(bestPoolAddress);
        }
      } else {
        setIsBestPoolMode(false);
        setMarketAddress(marketAddress);
      }
    },
    [bestPoolAddress, setIsBestPoolMode, setMarketAddress]
  );

  const selectedPoolName =
    isBestPoolMode && optionsWithBestPool.length > 1 && bestPoolAddress === currentMarketAddress
      ? t`Best pool`
      : currentPoolName;

  return {
    optionsWithBestPool,
    positionStatsWithBestPool,
    bestPoolAddress,
    isBestPoolSelected: isBestPoolMode ?? true,
    handlePoolSelect,
    selectedPoolName,
  };
}
