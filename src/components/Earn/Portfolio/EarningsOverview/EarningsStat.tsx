import cx from "classnames";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatUsd, getLimitedDisplay } from "lib/numbers";

import { EarningValue } from "components/EarningValue/EarningValue";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const FULL_PRECISION_DISPLAY_DECIMALS = 8;

export function EarningsStat({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <span className="text-body-small flex items-center gap-6 font-medium text-typography-secondary">{label}</span>
      <span className="text-body-large font-medium numbers">{children}</span>
    </div>
  );
}

export function isAbbreviatedUsd(usd: bigint): boolean {
  return getLimitedDisplay(usd, USD_DECIMALS).symbol !== "";
}

export function formatFullPrecisionUsd(usd: bigint): string {
  return formatUsd(usd, { displayDecimals: FULL_PRECISION_DISPLAY_DECIMALS, minThreshold: "0" })!;
}

export function UsdText({ usd, className }: { usd: bigint; className?: string }) {
  const handle = <span className={className}>{formatUsd(usd)}</span>;

  if (!isAbbreviatedUsd(usd)) {
    return handle;
  }

  return <TooltipWithPortal handle={handle} content={<span className="numbers">{formatFullPrecisionUsd(usd)}</span>} />;
}

export function UsdStatValue({
  usd,
  isLoading,
  isAvailable = true,
  highlightPositive = false,
  skeletonWidth = 65,
}: {
  usd: bigint | undefined;
  isLoading: boolean;
  isAvailable?: boolean;
  highlightPositive?: boolean;
  skeletonWidth?: number;
}) {
  return (
    <EarningValue value={usd} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={skeletonWidth}>
      {(value) => (
        <UsdText
          usd={value}
          className={cx({
            "text-typography-secondary": value === 0n,
            "text-green-500": highlightPositive && value > 0n,
          })}
        />
      )}
    </EarningValue>
  );
}
