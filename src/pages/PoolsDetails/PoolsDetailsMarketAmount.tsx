import cx from "classnames";
import { ReactNode } from "react";

import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function PoolsDetailsMarketAmount({
  value,
  secondaryValue,
  label,
  tooltipContent,
  valueClassName,
  secondaryValueClassName,
}: {
  value: ReactNode;
  secondaryValue?: string;
  label?: ReactNode;
  tooltipContent?: ReactNode;
  valueClassName?: string;
  secondaryValueClassName?: string;
}) {
  const isMobile = usePoolsIsMobilePage();

  const valueContent = (
    <span
      className={cx("text-body-large flex items-center max-md:text-body-medium", {
        "gap-8": !isMobile,
        "gap-4": isMobile,
      })}
    >
      <span className={cx("numbers", valueClassName)}>{value}</span>
      {secondaryValue ? (
        <>
          <span className={cx("text-typography-secondary numbers", secondaryValueClassName)}>({secondaryValue})</span>
        </>
      ) : null}
    </span>
  );

  const valueContentWithTooltip = tooltipContent ? (
    <TooltipWithPortal handle={valueContent} content={tooltipContent} />
  ) : (
    valueContent
  );

  if (isMobile) {
    return <SyntheticsInfoRow label={label} value={valueContentWithTooltip} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-body-medium font-medium text-typography-secondary">{label}</div>
      {valueContentWithTooltip}
    </div>
  );
}
