import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";
import { useMemo } from "react";

import { POOLS_TIME_RANGE_OPTIONS, PoolsTimeRange } from "domain/synthetics/markets/usePoolsTimeRange";
import { useLocalizedMap } from "lib/i18n";

import { PoolsTabs } from "components/Synthetics/PoolsTabs/PoolsTabs";

const LABEL_BY_POOLS_TIME_RANGE: Record<PoolsTimeRange, MessageDescriptor> = {
  total: msg`Total`,
  "7d": msg`Last 7d`,
  "30d": msg`Last 30d`,
  "90d": msg`Last 90d`,
};

export default function PoolsTimeRangeFilter({
  setTimeRange,
  timeRange,
}: {
  setTimeRange: (timeRange: PoolsTimeRange) => void;
  timeRange: PoolsTimeRange;
}) {
  const labelsMap = useLocalizedMap(LABEL_BY_POOLS_TIME_RANGE);

  const tabs = useMemo(
    () =>
      POOLS_TIME_RANGE_OPTIONS.map((item) => ({
        label: labelsMap[item],
        value: item,
      })),
    [labelsMap]
  );

  return (
    <PoolsTabs<PoolsTimeRange>
      tabs={tabs}
      selected={timeRange}
      setSelected={setTimeRange}
      itemClassName="bg-slate-700 text-slate-100"
    />
  );
}
