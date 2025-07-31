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
    <span
      className={cx("text-body-large flex items-center max-md:text-body-medium", {
        "gap-8": !isMobile,
        "gap-4": isMobile,
      })}
    >
      <span className="numbers">{value}</span>
      {secondaryValue ? (
        <>
          <span className="text-slate-100">/</span>
          <span className={cx("text-slate-100 numbers")}>{`${secondaryValue}`}</span>
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
      <div className="text-body-medium font-medium text-slate-100">{label}</div>
      {valueContentWithTooltip}
    </div>
  );
}
