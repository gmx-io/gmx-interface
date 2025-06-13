import cx from "classnames";
import { ReactNode } from "react";

import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function PoolsDetailsMarketAmount({
  value,
  secondaryValue,
  label,
  tooltipContent,
}: {
  value: ReactNode;
  secondaryValue?: string;
  label?: ReactNode;
  tooltipContent?: ReactNode;
}) {
  const isMobile = usePoolsIsMobilePage();

  const valueContent = (
    <span className={cx("flex items-center", { "gap-8": !isMobile, "gap-4": isMobile })}>
      <span className="text-body-medium">{value}</span>
      {secondaryValue ? (
        <span className={cx("text-slate-100", { "text-body-medium": !isMobile, "text-body-small": isMobile })}>
          {`(${secondaryValue})`}
        </span>
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
    <div className="flex flex-col gap-8">
      <div className="text-body-small text-slate-100">{label}</div>
      {valueContentWithTooltip}
    </div>
  );
}
