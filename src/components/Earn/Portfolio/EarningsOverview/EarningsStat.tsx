import cx from "classnames";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatUsdParts, getLimitedDisplay, NumberPart } from "lib/numbers";

import { EarningValue } from "components/EarningValue/EarningValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";
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

export function formatFullPrecisionUsdParts(usd: bigint): NumberPart[] {
  return formatUsdParts(usd, { displayDecimals: FULL_PRECISION_DISPLAY_DECIMALS, minThreshold: "0" })!;
}

export function formatUsdExpandedParts(usd: bigint): NumberPart[] {
  return isAbbreviatedUsd(usd) ? formatFullPrecisionUsdParts(usd) : formatUsdParts(usd)!;
}

export function UsdText({ usd, className }: { usd: bigint; className?: string }) {
  const handle = <UsdValue usd={usd} className={className} />;

  if (!isAbbreviatedUsd(usd)) {
    return handle;
  }

  return (
    <TooltipWithPortal
      handle={handle}
      content={<NumericValue parts={formatFullPrecisionUsdParts(usd)} className="numbers" />}
    />
  );
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
