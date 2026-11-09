import cx from "classnames";
import { ReactNode, useMemo } from "react";
import Skeleton from "react-loading-skeleton";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

// Label (with an optional info tooltip) over a big value, the same look as the Earn buyback dashboard metrics.
export function GtMetric({
  label,
  tooltip,
  value,
  subtitle,
  isLoading,
  className,
  valueClassName,
}: {
  label: ReactNode;
  tooltip?: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
}) {
  const labelContent = (
    <span className="text-body-small inline-flex items-center gap-4 font-medium text-typography-secondary">
      {label}
      {tooltip ? <InfoIcon className="size-16 text-typography-secondary" /> : null}
    </span>
  );

  return (
    <div className={cx("flex min-w-0 flex-col gap-4", className)}>
      {tooltip ? <TooltipWithPortal variant="none" handle={labelContent} content={tooltip} /> : labelContent}
      <div className={cx("text-h2 text-typography-primary numbers", valueClassName)}>
        {isLoading ? (
          <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={120} className="leading-base" />
        ) : (
          value
        )}
      </div>
      {subtitle && !isLoading ? (
        <div className="text-body-small text-typography-secondary numbers">{subtitle}</div>
      ) : null}
    </div>
  );
}

export function ProgressLine({ percent, className }: { percent: number; className?: string }) {
  const fillStyle = useMemo(() => ({ width: `${Math.min(Math.max(percent, 0), 100)}%` }), [percent]);

  return (
    <div className={cx("h-4 w-full overflow-hidden rounded-full bg-slate-700", className)}>
      <div className="h-full rounded-full bg-blue-300" style={fillStyle} />
    </div>
  );
}
