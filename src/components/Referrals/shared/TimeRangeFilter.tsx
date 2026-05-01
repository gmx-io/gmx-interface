import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";

import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";

import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";

export const REFERRALS_TIME_RANGE_INFOS: TimeRangeInfo[] = [
  { slug: "24h", days: 1, title: msg`${24}h` },
  { slug: "7d", days: 7, title: msg`${7}d` },
  { slug: "30d", days: 30, title: msg`${30}d` },
  { slug: "90d", days: 90, title: msg`${90}d` },
  { slug: "total", days: 0, title: msg`Total` },
];

export function TimeRangeFilter({
  setTimeRange,
  timeRange,
  timeRangeInfos = REFERRALS_TIME_RANGE_INFOS,
}: {
  setTimeRange: (timeRange: string) => void;
  timeRange: string;
  timeRangeInfos?: TimeRangeInfo[];
}) {
  const { _ } = useLingui();
  const tabs = useMemo(
    () =>
      timeRangeInfos.map((item) => ({
        label: _(item.title),
        value: item.slug,
      })),
    [_, timeRangeInfos]
  );

  return (
    <PoolsTabs<string>
      tabs={tabs}
      selected={timeRange}
      setSelected={setTimeRange}
      itemClassName="bg-slate-700 text-typography-secondary"
    />
  );
}
