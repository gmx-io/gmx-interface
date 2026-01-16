import cx from "classnames";
import type { ReactNode } from "react";

import Tooltip, { TooltipPosition } from "../Tooltip/Tooltip";

type Props = {
  label: string;
  value?: ReactNode;
  labelTooltipText?: string;
  tooltipPosition?: TooltipPosition;
  tooltipContent?: ReactNode;
  className?: string;
  children?: ReactNode;
};

function ReferralInfoCard({
  value,
  label,
  labelTooltipText,
  children,
  tooltipContent,
  tooltipPosition = "bottom",
  className,
}: Props) {
  return (
    <div
      className={cx(
        "flex justify-between gap-12 border-r-1/2 border-slate-600 p-20 last:border-r-0",
        "bg-slate-900 first:rounded-l-8 last:rounded-r-8 max-lg:border-b-1/2 max-lg:border-r-0",
        "max-lg:first:rounded-tl-8 max-lg:first:rounded-tr-8 max-lg:last:rounded-bl-8 max-lg:last:rounded-br-8",
        "max-lg:first:rounded-b-0 max-lg:last:rounded-t-0 max-lg:last:border-b-0",
        className
      )}
    >
      <div className="flex flex-col gap-4">
        {tooltipContent ? (
          <Tooltip
            position="bottom"
            className="whitespace-nowrap"
            handle={value}
            handleClassName="text-20 font-medium text-typography-primary"
            renderContent={() => tooltipContent}
          />
        ) : (
          <div className="text-20 font-medium text-typography-primary">{value}</div>
        )}
        <span className="text-body-small font-medium text-typography-secondary">
          {labelTooltipText ? (
            <Tooltip handle={label} position={tooltipPosition} renderContent={() => labelTooltipText} variant="icon" />
          ) : (
            label
          )}
        </span>
      </div>
      <div className="card-data">{children}</div>
    </div>
  );
}

export default ReferralInfoCard;
