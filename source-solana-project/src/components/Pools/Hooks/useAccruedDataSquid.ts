import { BN } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { usePoolsOverviewSquidData } from './usePoolsOverviewSquidData';
import { usePoolsDetailSquidData } from './usePoolsDetailSquidData';
import type { PoolsSquidOptions } from './poolsSquidTypes';
import { GLV_TOKEN_TO_ACCOUNT } from '../utils/glvTokenToAccount';

export { GLV_TOKEN_TO_ACCOUNT };

interface LineChartEntry {
  timeStamp: number;
  ydata: number;
  ydataBn: BN;
}

interface MarketChartData {
  lineCharts: LineChartEntry[];
  annualized: string;
}

export interface GlvDailyFeesData {
  lineCharts: LineChartEntry[];
  annualized: string;
}

function filterChartMaps(
  data: {
    marketChartDataMap: Map<string, MarketChartData>;
    glvDailyFeesMap: Map<string, GlvDailyFeesData>;
  } | undefined,
  startTimestamp: string
) {
  const defaultMarketChartDataMap = new Map<string, MarketChartData>();
  const defaultGlvDailyFeesMap = new Map<string, GlvDailyFeesData>();

  if (!data) {
    return {
      marketChartDataMap: defaultMarketChartDataMap,
      glvDailyFeesMap: defaultGlvDailyFeesMap,
    };
  }

  const filterStartTs =
    startTimestamp && startTimestamp !== 'total'
      ? new Date(startTimestamp).getTime() / 1000
      : null;

  const filterLineCharts = (lineCharts: LineChartEntry[]) =>
    filterStartTs
      ? lineCharts.filter((p) => p.timeStamp >= filterStartTs)
      : lineCharts;

  const filteredMarketChartDataMap = new Map<string, MarketChartData>();
  data.marketChartDataMap.forEach((v, k) => {
    const filtered = filterLineCharts(v.lineCharts);
    const annualized =
      filtered.length > 1
        ? filtered[filtered.length - 1].ydataBn
            .sub(filtered[0].ydataBn)
            .toString()
        : filtered.length === 1
          ? filtered[0].ydataBn.toString()
          : '0';
    filteredMarketChartDataMap.set(k, { lineCharts: filtered, annualized });
  });

  const filteredGlvDailyFeesMap = new Map<string, GlvDailyFeesData>();
  data.glvDailyFeesMap.forEach((v, k) => {
    const filtered = filterLineCharts(v.lineCharts);
    const annualized =
      filtered.length > 1
        ? filtered[filtered.length - 1].ydataBn
            .sub(filtered[0].ydataBn)
            .toString()
        : filtered.length === 1
          ? filtered[0].ydataBn.toString()
          : '0';
    filteredGlvDailyFeesMap.set(k, { lineCharts: filtered, annualized });
  });

  return {
    marketChartDataMap: filteredMarketChartDataMap,
    glvDailyFeesMap: filteredGlvDailyFeesMap,
  };
}

export function useMarketDailyStatsSquid(
  startTimestamp: string,
  options?: PoolsSquidOptions
) {
  const squidSource = options?.squidSource ?? 'overview';
  const enabled = options?.enabled !== false;
  const marketAddresses = options?.marketAddresses ?? [];
  const glvAddresses = options?.glvAddresses ?? [];

  const overview = usePoolsOverviewSquidData({
    marketAddresses,
    glvAddresses,
    enabled,
  });

  const detail = usePoolsDetailSquidData({
    marketAddresses,
    glvAddresses,
    poolType: options?.poolType,
    tokenAddress: options?.tokenAddress,
    enabled: enabled && squidSource === 'detail',
  });

  const squidData =
    squidSource === 'detail'
      ? detail.data ?? overview.data
      : overview.data;
  const isLoading =
    squidSource === 'detail'
      ? detail.isLoading && !overview.data
      : overview.isLoading;

  const { marketChartDataMap, glvDailyFeesMap } = useMemo(
    () => filterChartMaps(squidData, startTimestamp),
    [squidData, startTimestamp]
  );

  return {
    marketChartDataMap,
    glvDailyFeesMap,
    isAccruedLoading: isLoading || !squidData,
  };
}
