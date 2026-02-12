import { lightFormat } from "date-fns";
import { useEffect, useMemo } from "react";
import useSWR from "swr";

import { USD_DECIMALS } from "config/factors";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { SECONDS_IN_DAY } from "lib/dates";
import { bigintToNumber } from "lib/numbers";
import { sleep } from "lib/sleep";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { STUB_DATA, STUB_HOUR_DATA } from "./DEV";
import { TradersVolumeChart } from "./GmxBarChart";

async function fetchTradersVolumeData(periodStart: number, periodEnd: number, isSmall: boolean) {
  await sleep(1000);

  if (isSmall) {
    return STUB_HOUR_DATA.filter(({ timestamp }) => timestamp >= periodStart && timestamp <= periodEnd);
  }

  return STUB_DATA.filter(({ timestamp }) => timestamp >= periodStart && timestamp <= periodEnd);
}

function toChartData(raw: { timestamp: number; volume: bigint; profit: number; loss: number }[], isSmall: boolean) {
  return raw.map(({ timestamp, volume }) => ({
    timestamp,
    dateCompact: isSmall ? lightFormat(timestamp * 1000, "HH:mm") : lightFormat(timestamp * 1000, "dd/MM"),
    volumeFloat: bigintToNumber(volume, USD_DECIMALS),
  }));
}

export function TradersVolumeChartContainer({
  periodStart,
  periodEnd,
  timeRangeInfo,
}: {
  periodStart: number;
  periodEnd: number;
  timeRangeInfo: TimeRangeInfo;
}) {
  const isSmall = timeRangeInfo.days === 1;

  const { data: rawData, isLoading } = useSWR(
    ["referrals-traders-volume-chart", timeRangeInfo.slug],
    () => fetchTradersVolumeData(periodStart, periodEnd, isSmall),
    {
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      revalidateOnFocus: false,
    }
  );

  const chartData = useMemo(() => (rawData ? toChartData(rawData, isSmall) : []), [rawData, isSmall]);

  if (isLoading) {
    return (
      <div className="text-body-small flex h-[256px] w-full items-center justify-center text-typography-secondary">
        Loading…
      </div>
    );
  }

  return <TradersVolumeChart chartData={chartData} />;
}
