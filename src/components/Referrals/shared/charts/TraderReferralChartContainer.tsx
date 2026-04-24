import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { lightFormat } from "date-fns";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { TraderReferralStats } from "domain/referrals";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { bigintToNumber } from "lib/numbers";

import { getDateFormat, formatTooltipDate } from "./chartDateUtils";
import { RebatesChart, TradersVolumeChart } from "./GmxBarChart";

type ChartType = "volume" | "discounts";

export function TraderReferralChartContainer({
  chartType,
  stats,
  isLoading,
  timeRangeInfo,
}: {
  chartType: ChartType;
  stats?: TraderReferralStats;
  isLoading?: boolean;
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
      rebatesUsd: point.discountsUsd,
      rebatesUsdFloat: bigintToNumber(point.discountsUsd, USD_DECIMALS),
    }));
  }, [stats?.points, stats?.bucketSizeSeconds, isSmall, i18n.locale]);

  if (isLoading) {
    return (
      <div className="text-body-small flex h-[256px] w-full items-center justify-center text-typography-secondary">
        <Trans>Loading…</Trans>
      </div>
    );
  }

  if (chartType === "discounts") {
    return <RebatesChart chartData={chartData} />;
  }

  return <TradersVolumeChart chartData={chartData} />;
}
