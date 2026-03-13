import { MessageDescriptor } from "@lingui/core";

import { getTimestampByDaysAgo, normalizeDateRange, SECONDS_IN_DAY } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { Period } from "./usePoolsTimeRange";

export type TimeRangeInfo = { slug: string; days: number; title: MessageDescriptor };

export function useTimeRange(
  key: string,
  timeRangeInfos: TimeRangeInfo[]
): {
  periodStart: number;
  periodEnd: number;
  setTimeRange: (timeRange: string) => void;
  timeRangeInfo: TimeRangeInfo;
} {
  const fallbackPreset = timeRangeInfos.at(-1)!;
  const [timeRange, setTimeRange] = useLocalStorageSerializeKey<string>(key, fallbackPreset.slug);

  const timeRangeInfo = timeRangeInfos.find((info) => info.slug === timeRange) ?? fallbackPreset;
  const { periodStart, periodEnd } = convertTimeRangeInfoToPeriod(timeRangeInfo);

  return { periodStart, periodEnd, setTimeRange, timeRangeInfo };
}

function getStartDate(days: number) {
  return new Date(getTimestampByDaysAgo(days) * 1000);
}

function convertTimeRangeInfoToPeriod(timeRangeInfo: TimeRangeInfo): Period {
  if (timeRangeInfo.days === 1) {
    return {
      periodStart: Math.trunc(Date.now() / 1000) - SECONDS_IN_DAY,
      periodEnd: Math.trunc(Date.now() / 1000),
    };
  }

  let [periodStart, periodEnd] = normalizeDateRange(getStartDate(timeRangeInfo.days), new Date());
  if (timeRangeInfo.days === 0) {
    periodStart = 0;
  }

  return {
    periodStart,
    periodEnd,
  };
}
