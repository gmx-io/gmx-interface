import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { lightFormat } from "date-fns";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { TraderReferralStats } from "domain/referrals";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { ONE_YEAR_SECONDS, SECONDS_IN_DAY } from "lib/dates";
import { bigintToNumber } from "lib/numbers";

import { RebatesChart, TradersVolumeChart } from "./GmxBarChart";

type ChartType = "volume" | "discounts";

function getDateFormat(timestamps: number[], isSmall: boolean): "HH:mm" | "dd/MM" | "yyyy" {
  if (isSmall) return "HH:mm";
  if (timestamps.length < 2) return "dd/MM";
  const spanSeconds = timestamps[timestamps.length - 1] - timestamps[0];
  return spanSeconds > ONE_YEAR_SECONDS ? "yyyy" : "dd/MM";
}

function formatTooltipDate(timestamp: number, bucketSizeSeconds: number, locale: string): string {
  if (bucketSizeSeconds > SECONDS_IN_DAY) {
    const start = new Date(timestamp * 1000);
    const end = new Date((timestamp + bucketSizeSeconds) * 1000);
    const startStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
    const endStr = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(end);
    return `${startStr} - ${endStr}`;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(bucketSizeSeconds < SECONDS_IN_DAY && { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(timestamp * 1000));
}

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
