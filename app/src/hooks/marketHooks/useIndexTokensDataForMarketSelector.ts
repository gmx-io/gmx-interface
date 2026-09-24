import { useMemo } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { selectAvailableChartTokens } from '@/selectors/chart/selectAvailableChartTokens';
import { makeSelectIndexTokensStatForMarketSelector } from '@/selectors/stats/makeSelectIndexTokensStatForMarketSelector';
import { useMarketToken24hVolumes } from '@/hooks/statsHooks/useMarketToken24hVolumes';
import { useFilteredTokens } from '@/hooks/tokenHooks/useFilteredTokens';
import { BN_ZERO } from '@/config/constants';
import { IndexTokenStatForMarketSelector } from '@/selectors/stats/types';
import { useChange24hFromFeeds } from '../fetchHooks/useChange24hFromFeeds';
import { DEFAULT_SWR_REFRESH_INTERVAL_2M } from '@/config/ui';
import useSocketStore from '@/zustand/socketStore';

type SortField =
  | 'change24h'
  | 'volume24h'
  | 'longOI'
  | 'shortOI'
  | 'longLiq'
  | 'shortLiq'
  | null;
type SortDirection = 'asc' | 'desc';

interface UseIndexTokensDataForMarketSelectorProps {
  searchKeyword: string;
  sortField: SortField;
  sortDirection: SortDirection;
  isMobile: boolean;
}

export function useIndexTokensDataForMarketSelector({
  searchKeyword,
  sortField,
  sortDirection,
  isMobile,
}: UseIndexTokensDataForMarketSelectorProps) {
  const availableIndexTokens = useAppStore(selectAvailableChartTokens);
  const filteredIndexTokens = useFilteredTokens(
    availableIndexTokens,
    searchKeyword
  );

  // Build a map of percentChange24h from socketStore indexTokens (includes keeper data)
  const socketIndexTokens = useSocketStore((s) => s.indexTokens);
  const keeperChange24hMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of socketIndexTokens) {
      if (item?.percentChange24h && item.percentChange24h !== '0' && item.indexToken) {
        map[item.indexToken] = parseFloat(item.percentChange24h);
      }
    }
    return map;
  }, [socketIndexTokens]);

  // get 24hChange
  const changes24h = useChange24hFromFeeds({
    addresses: (filteredIndexTokens || []).map((item) =>
      item.address.toBase58()
    ),
    timerDate: DEFAULT_SWR_REFRESH_INTERVAL_2M,
  });

  const { marketVolumesData } = useMarketToken24hVolumes();
  const indexTokensStats = useAppStore(
    useMemo(
      () => makeSelectIndexTokensStatForMarketSelector(marketVolumesData),
      [marketVolumesData]
    )
  );

  const indexTokenData = useMemo(() => {
    return (
      filteredIndexTokens
        ?.map((indexToken) => {
          const address = indexToken.address.toBase58();
          const stats = indexTokensStats[address];
          if (!stats) return null;
          return {
            ...stats,
            change24h: changes24h[address] ?? keeperChange24hMap[address] ?? stats.change24h,
          };
        })
        .filter(
          (stats): stats is IndexTokenStatForMarketSelector => stats != null
        )
        .sort((a, b) => {
          if (isMobile) {
            // Mobile: Sort by 24h volume in descending order
            return b.volume24h.sub(a.volume24h).gt(BN_ZERO) ? 1 : -1;
          }

          if (sortField === 'change24h') {
            const changeA = a.change24h || 0;
            const changeB = b.change24h || 0;
            return sortDirection === 'desc'
              ? changeB - changeA
              : changeA - changeB;
          }
          if (sortField === 'volume24h') {
            return sortDirection === 'desc'
              ? b.volume24h.sub(a.volume24h).gt(BN_ZERO)
                ? 1
                : -1
              : a.volume24h.sub(b.volume24h).gt(BN_ZERO)
                ? 1
                : -1;
          }
          if (sortField === 'longOI') {
            return sortDirection === 'desc'
              ? b.longOpenInterest.sub(a.longOpenInterest).gt(BN_ZERO)
                ? 1
                : -1
              : a.longOpenInterest.sub(b.longOpenInterest).gt(BN_ZERO)
                ? 1
                : -1;
          }
          if (sortField === 'shortOI') {
            return sortDirection === 'desc'
              ? b.shortOpenInterest.sub(a.shortOpenInterest).gt(BN_ZERO)
                ? 1
                : -1
              : a.shortOpenInterest.sub(b.shortOpenInterest).gt(BN_ZERO)
                ? 1
                : -1;
          }
          if (sortField === 'longLiq') {
            const longLiqA =
              a.maxLongLiquidityPool?.maxLongLiquidity || BN_ZERO;
            const longLiqB =
              b.maxLongLiquidityPool?.maxLongLiquidity || BN_ZERO;
            return sortDirection === 'desc'
              ? longLiqB.sub(longLiqA).gt(BN_ZERO)
                ? 1
                : -1
              : longLiqA.sub(longLiqB).gt(BN_ZERO)
                ? 1
                : -1;
          }
          if (sortField === 'shortLiq') {
            const shortLiqA =
              a.maxShortLiquidityPool?.maxShortLiquidity || BN_ZERO;
            const shortLiqB =
              b.maxShortLiquidityPool?.maxShortLiquidity || BN_ZERO;
            return sortDirection === 'desc'
              ? shortLiqB.sub(shortLiqA).gt(BN_ZERO)
                ? 1
                : -1
              : shortLiqA.sub(shortLiqB).gt(BN_ZERO)
                ? 1
                : -1;
          }

          // Desktop: Default sort by total liquidity
          const totalLiquidityA = (
            a.maxLongLiquidityPool?.maxLongLiquidity || BN_ZERO
          ).add(a.maxShortLiquidityPool?.maxShortLiquidity || BN_ZERO);
          const totalLiquidityB = (
            b.maxLongLiquidityPool?.maxLongLiquidity || BN_ZERO
          ).add(b.maxShortLiquidityPool?.maxShortLiquidity || BN_ZERO);
          const liquidityDiff = totalLiquidityB.sub(totalLiquidityA);

          if (!liquidityDiff.isZero()) {
            return liquidityDiff.gt(BN_ZERO) ? 1 : -1;
          }

          const totalOpenInterestA = a.longOpenInterest.add(
            a.shortOpenInterest
          );
          const totalOpenInterestB = b.longOpenInterest.add(
            b.shortOpenInterest
          );
          const openInterestDiff = totalOpenInterestB.sub(totalOpenInterestA);

          if (!openInterestDiff.isZero()) {
            return openInterestDiff.gt(BN_ZERO) ? 1 : -1;
          }

          const priceA = a.lastPrice || BN_ZERO;
          const priceB = b.lastPrice || BN_ZERO;
          return priceB.sub(priceA).gt(BN_ZERO) ? 1 : -1;
        }) || []
    );
  }, [
    filteredIndexTokens,
    indexTokensStats,
    sortField,
    sortDirection,
    isMobile,
    changes24h,
    keeperChange24hMap,
  ]);

  return {
    indexTokenData,
    filteredIndexTokens,
  };
}
