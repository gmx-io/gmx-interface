import { t } from "@lingui/macro";
import cx from "classnames";

import { POOLS_TIME_RANGE_OPTIONS, PoolsTimeRange } from "domain/synthetics/markets/poolsTimeRange";

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
    <div className="flex gap-8">
      {POOLS_TIME_RANGE_OPTIONS.map((item) => (
        <PoolsTimeRangeFilterItem key={item} item={item} setItem={setTimeRange} isActive={timeRange === item} />
      ))}
    </div>
  );
}

export const PoolsTimeRangeFilterItem = ({
  item,
  setItem,
  isActive,
}: {
  item: PoolsTimeRange;
  setItem: (item: PoolsTimeRange) => void;
  isActive: boolean;
}) => {
  return (
    <div
      className={cx("text-body-medium  rounded-4 px-[12.5px] py-[8px]", {
        "bg-cold-blue-500 text-white": isActive,
        "bg-slate-700 text-slate-100": !isActive,
      })}
      onClick={() => setItem(item)}
    >
      {LABEL_BY_POOLS_TIME_RANGE[item]}
    </div>
  );
};
