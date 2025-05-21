import cx from "classnames";
import { ReactNode } from "react";

import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

export function PoolsDetailsMarketAmount({
  value,
  secondaryValue,
  label,
}: {
  value: string | undefined;
  secondaryValue?: string;
  label?: ReactNode;
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

  if (isMobile) {
    return <SyntheticsInfoRow label={label} value={valueContent} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-body-small text-slate-100">{label}</div>
      {valueContent}
    </div>
  );
}
