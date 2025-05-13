import { t } from "@lingui/macro";

import { POOLS_TIME_RANGE_OPTIONS, PoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";

import { PoolsTabs } from "components/Synthetics/PoolsTabs/PoolsTabs";

const LABEL_BY_POOLS_TIME_RANGE: Record<PoolsTimeRange, string> = {
  total: t`Total`,
  "7d": t`Last 7 days`,
  "30d": t`Last 30 days`,
  "90d": t`Last 90 days`,
};

export default function PoolsTimeRangeFilter({
  setTimeRange,
  timeRange,
}: {
  setTimeRange: (timeRange: PoolsTimeRange) => void;
  timeRange: PoolsTimeRange;
}) {
  return (
    <PoolsTabs<PoolsTimeRange>
      tabs={POOLS_TIME_RANGE_OPTIONS.map((item) => ({
        label: LABEL_BY_POOLS_TIME_RANGE[item],
        value: item,
      }))}
      selected={timeRange}
      setSelected={setTimeRange}
      itemClassName="bg-slate-700 text-slate-100"
    />
  );
}