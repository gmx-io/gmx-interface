import cx from "classnames";
import { ReactNode } from "react";

import { formatDeltaUsd, formatUsd } from "lib/numbers";

import { EarningValue } from "components/EarningValue/EarningValue";

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
      <span className="text-body-small font-medium text-typography-secondary">{label}</span>
      <span className="text-body-large font-medium numbers">{children}</span>
    </div>
  );
}

export function UsdStatValue({
  usd,
  isLoading,
  isAvailable = true,
}: {
  usd: bigint | undefined;
  isLoading: boolean;
  isAvailable?: boolean;
}) {
  return (
    <EarningValue value={usd} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={65}>
      {(value) => <span className={cx({ "text-typography-secondary": value === 0n })}>{formatUsd(value)}</span>}
    </EarningValue>
  );
}

export function Last7dStatValue({
  usd,
  isLoading,
  isAvailable = true,
}: {
  usd: bigint | undefined;
  isLoading: boolean;
  isAvailable?: boolean;
}) {
  return (
    <EarningValue value={usd} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={65}>
      {(value) => (
        <span className={cx(value > 0n ? "text-green-500" : "text-typography-secondary")}>
          {value > 0n ? formatDeltaUsd(value, undefined, { hidePercentage: true }) : formatUsd(value)}
        </span>
      )}
    </EarningValue>
  );
}
