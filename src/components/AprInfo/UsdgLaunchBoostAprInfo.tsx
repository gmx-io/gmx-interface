import { Trans, t } from "@lingui/macro";
import cx from "classnames";

import { USDG_LAUNCH_BOOST_PERIOD_1_END, USDG_LAUNCH_BOOST_PERIOD_1_START } from "config/usdgPools";
import { UsdgLaunchBoost, getIsUsdgLaunchBoostIncluded } from "domain/synthetics/usdgLaunchBoost/utils";
import { formatDate, formatDateTime } from "lib/dates";
import { formatPercentage } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

function getMinimumSuffix(launchBoost: UsdgLaunchBoost) {
  return launchBoost.status === "target" && launchBoost.isGlv ? "+" : "";
}

function getHasFeeApy(apy: bigint | undefined): apy is bigint {
  return apy !== undefined && apy !== 0n;
}

function formatFeeApy(apy: bigint | undefined, isApyLoading: boolean) {
  if (isApyLoading) {
    return "...";
  }

  return getHasFeeApy(apy) ? formatPercentage(apy, { bps: false }) : t`Not enough history yet`;
}

export function formatUsdgLaunchBoostValue(launchBoost: UsdgLaunchBoost) {
  switch (launchBoost.status) {
    case "loading":
      return "...";
    case "target":
    case "live": {
      const boostApr = formatPercentage(launchBoost.apr, { bps: false });
      const minimumSuffix = getMinimumSuffix(launchBoost);
      return `${boostApr}${minimumSuffix}`;
    }
    case "paused":
      return t`Paused`;
    case "unavailable":
      return t`Unavailable`;
  }
}

export function formatApyWithUsdgLaunchBoost({
  apy,
  isApyLoading,
  launchBoost,
}: {
  apy: bigint | undefined;
  isApyLoading: boolean;
  launchBoost: UsdgLaunchBoost;
}) {
  if (isApyLoading || launchBoost.status === "loading") {
    return "...";
  }

  if (getIsUsdgLaunchBoostIncluded(launchBoost)) {
    const totalApy = formatPercentage((apy ?? 0n) + launchBoost.apr, { bps: false });
    const minimumSuffix = getMinimumSuffix(launchBoost);
    return `${totalApy}${minimumSuffix}`;
  }

  return getHasFeeApy(apy) ? formatPercentage(apy, { bps: false }) : t`N/A`;
}

export function UsdgLaunchBoostStatusNote({ launchBoost }: { launchBoost: UsdgLaunchBoost }) {
  switch (launchBoost.status) {
    case "loading":
      return null;
    case "target":
      return <Trans>Starts with the first reward round.</Trans>;
    case "live":
      return <Trans>Rate paid in the last round, on average balances.</Trans>;
    case "paused": {
      const lastRoundPaidAt = formatDateTime(launchBoost.lastRoundPaidAt);
      return <Trans>Last round paid {lastRoundPaidAt}. The boost returns with the next successful round.</Trans>;
    }
    case "unavailable":
      return <Trans>The boost rate can't be loaded right now.</Trans>;
  }
}

export function UsdgLaunchBoostProgramNote() {
  const periodStart = formatDate(USDG_LAUNCH_BOOST_PERIOD_1_START, { timezone: "utc" });
  const periodEnd = formatDate(USDG_LAUNCH_BOOST_PERIOD_1_END, { timezone: "utc" });

  return (
    <Trans>
      First 8 weeks: GLV 8% or higher, GM pools 5%. Rates dilute above $100M program TVL. Funded by Arbitrum's USDG
      program with GMX. Period 1: {periodStart} – {periodEnd}.
    </Trans>
  );
}

function UsdgLaunchBoostTooltipContent({
  apy,
  isApyLoading,
  launchBoost,
}: {
  apy: bigint | undefined;
  isApyLoading: boolean;
  launchBoost: UsdgLaunchBoost;
}) {
  const tokenSymbol = launchBoost.isGlv ? "GLV" : "GM";

  return (
    <div className="flex flex-col gap-y-14">
      <div>
        <StatsTooltipRow
          showDollar={false}
          label={t`Fee APY`}
          value={formatFeeApy(apy, isApyLoading)}
          valueClassName="numbers"
        />
        <StatsTooltipRow
          showDollar={false}
          label={launchBoost.status === "target" ? t`Launch boost (target)` : t`Launch boost`}
          value={formatUsdgLaunchBoostValue(launchBoost)}
          valueClassName="numbers"
        />
      </div>
      {launchBoost.status !== "loading" && (
        <div>
          <UsdgLaunchBoostStatusNote launchBoost={launchBoost} />
        </div>
      )}
      <div>
        <Trans>Paid into the {tokenSymbol} price every 4 hours. Nothing to claim.</Trans>
      </div>
      <div>
        <UsdgLaunchBoostProgramNote />
      </div>
    </div>
  );
}

export function UsdgLaunchBoostAprInfo({
  apy,
  isApyLoading = false,
  launchBoost,
  showTooltip = true,
  className,
}: {
  apy: bigint | undefined;
  isApyLoading?: boolean;
  launchBoost: UsdgLaunchBoost;
  showTooltip?: boolean;
  className?: string;
}) {
  const isBoostIncluded = getIsUsdgLaunchBoostIncluded(launchBoost);
  const value = formatApyWithUsdgLaunchBoost({ apy, isApyLoading, launchBoost });

  const handle = (
    <div className="inline-flex flex-nowrap">
      <span className={cx("numbers", className)}>{value}</span>
      <img
        className={cx("relative -top-3 h-10", { "opacity-50 grayscale": !isBoostIncluded })}
        src={sparkleIcon}
        alt={t`Sparkle`}
      />
    </div>
  );

  if (!showTooltip) {
    return handle;
  }

  return (
    <TooltipWithPortal
      maxAllowedWidth={280}
      handle={handle}
      position="bottom-end"
      content={<UsdgLaunchBoostTooltipContent apy={apy} isApyLoading={isApyLoading} launchBoost={launchBoost} />}
    />
  );
}
