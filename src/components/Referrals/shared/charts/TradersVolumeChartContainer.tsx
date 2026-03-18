import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { lightFormat } from "date-fns";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { AffiliateReferralStats } from "domain/referrals";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { bigintToNumber } from "lib/numbers";

import { getDateFormat, formatTooltipDate } from "./chartDateUtils";
import { RebatesChart, TradersReferredChart, TradesCountChart, TradersVolumeChart } from "./GmxBarChart";

type ChartType = "volume" | "trades" | "tradersReferred" | "rebates";

export function TradersVolumeChartContainer({
  chartType,
  stats,
  isLoading,
  timeRangeInfo,
}: {
  chartType: ChartType;
  stats: AffiliateReferralStats | undefined;
  isLoading: boolean | undefined;
  timeRangeInfo: TimeRangeInfo;
}) {
  const { i18n } = useLingui();
  const isSmall = timeRangeInfo.days === 1;
  const chartData = useMemo(() => {
    if (!stats?.points) return [];

    const timestamps = stats.points.map((p) => p.timestamp);
    const fmt = getDateFormat(timestamps, isSmall);
    const bucketSizeSeconds = stats.bucketSizeSeconds;

    return stats.points.map((point) => ({
      timestamp: point.timestamp,
      dateCompact: lightFormat(point.timestamp * 1000, fmt),
      dateTooltip: formatTooltipDate(point.timestamp, bucketSizeSeconds, i18n.locale),
      volumeUsd: point.volumeUsd,
      volumeFloat: bigintToNumber(point.volumeUsd, USD_DECIMALS),
      tradesCount: point.tradesCount,
      rebatesUsd: point.rebatesUsd,
      rebatesUsdFloat: bigintToNumber(point.rebatesUsd, USD_DECIMALS),
      tradersGained: point.tradersGained,
      tradersLost: -point.tradersLost,
      tradersNet: point.tradersNet,
      tradersSumGainedLost: point.tradersGained + point.tradersLost,
    }));
  }, [stats?.points, stats?.bucketSizeSeconds, isSmall, i18n.locale]);

  if (isLoading) {
    return (
      <div className="text-body-small flex h-[256px] w-full grow items-center justify-center text-typography-secondary">
        <Trans>Loading…</Trans>
      </div>
    );
  }

  if (chartType === "trades") {
    return <TradesCountChart chartData={chartData} />;
  }

  if (chartType === "tradersReferred") {
    return <TradersReferredChart chartData={chartData} />;
  }

  if (chartType === "rebates") {
    return <RebatesChart chartData={chartData} />;
  }

  return <TradersVolumeChart chartData={chartData} />;
}
