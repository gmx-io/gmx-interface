import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo } from "react";

import type { MarketLiquidityAndFeeStat } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { TradeType } from "sdk/types/trade";

export const BEST_POOL_MARKER = "BEST_POOL";
const TRADEBOX_SELECTED_POOLS_KEY = "tradebox-selected-pools";

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
  const { chainId } = useChainId();
  const [storedPoolsMap = {}, setStoredPoolsMap] = useLocalStorageSerializeKey<Record<string, string>>(
    [TRADEBOX_SELECTED_POOLS_KEY, chainId],
    {}
  );

  const isLong = tradeType === TradeType.Long;

  const bestPoolStat = useMemo(() => {
    return findBestPool(relatedMarketStats, relatedMarketsPositionStats, isLong);
  }, [relatedMarketStats, relatedMarketsPositionStats, isLong]);

  const bestPoolAddress = bestPoolStat?.marketInfo.marketTokenAddress;

  const availableMarketAddresses = useMemo(
    () => new Set((relatedMarketStats || []).map((market) => market.marketInfo.marketTokenAddress)),
    [relatedMarketStats]
  );

  const pairKey = useMemo(() => {
    const currentMarketStat =
      relatedMarketStats?.find((stat) => stat.marketInfo.marketTokenAddress === currentMarketAddress) ||
      relatedMarketStats?.[0];

    const indexTokenAddress = currentMarketStat?.marketInfo.indexTokenAddress;

    if (!indexTokenAddress) {
      return undefined;
    }

    return [tradeType, indexTokenAddress].join(":");
  }, [currentMarketAddress, relatedMarketStats, tradeType]);

  const removeStoredSelection = useCallback(
    (key: string) => {
      setStoredPoolsMap((prev = {}) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setStoredPoolsMap]
  );

  const savedPoolAddress = pairKey ? storedPoolsMap?.[pairKey] : undefined;

  useEffect(() => {
    if (!pairKey || !savedPoolAddress) {
      return;
    }

    const shouldRemove = !availableMarketAddresses.has(savedPoolAddress);

    if (shouldRemove) {
      removeStoredSelection(pairKey);
    }
  }, [availableMarketAddresses, pairKey, removeStoredSelection, savedPoolAddress]);

  const preferredPoolAddress =
    savedPoolAddress && availableMarketAddresses.has(savedPoolAddress) ? savedPoolAddress : undefined;

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
    if (!pairKey) {
      return;
    }

    const targetPoolAddress = preferredPoolAddress ?? bestPoolAddress;

    if (!targetPoolAddress) {
      return;
    }

    if (currentMarketAddress !== targetPoolAddress) {
      setMarketAddress(targetPoolAddress);
    }
  }, [bestPoolAddress, currentMarketAddress, pairKey, preferredPoolAddress, setMarketAddress]);

  const handlePoolSelect = useCallback(
    (marketAddress: string) => {
      if (marketAddress === BEST_POOL_MARKER && bestPoolAddress) {
        if (pairKey) {
          removeStoredSelection(pairKey);
        }

        setMarketAddress(bestPoolAddress);
        return;
      }

      if (pairKey) {
        setStoredPoolsMap((prev = {}) => ({
          ...prev,
          [pairKey]: marketAddress,
        }));
      }

      setMarketAddress(marketAddress);
    },
    [bestPoolAddress, pairKey, removeStoredSelection, setMarketAddress, setStoredPoolsMap]
  );

  const selectedPoolName =
    !preferredPoolAddress && optionsWithBestPool.length > 1 && bestPoolAddress === currentMarketAddress
      ? t`Best pool`
      : currentPoolName;

  const isBestPoolSelected = !preferredPoolAddress;

  return {
    optionsWithBestPool,
    positionStatsWithBestPool,
    bestPoolAddress,
    isBestPoolSelected,
    handlePoolSelect,
    selectedPoolName,
  };
}
