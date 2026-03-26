import { Trans } from "@lingui/macro";

import type { BuybackDerivedMetrics } from "domain/buyback/useBuybackChartData";
import { numberWithCommas } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function BuybackMetricsHeader({
  metrics,
  isLoading,
  error,
}: {
  metrics: BuybackDerivedMetrics | undefined;
  isLoading: boolean;
  error: Error | undefined;
}) {
  const isUnavailable = !isLoading && (!!error || metrics === undefined);

  return (
    <div className="flex gap-28 max-md:grid max-md:grid-cols-2 max-md:gap-12">
      <MetricItem
        label={<Trans>Total Bought GMX</Trans>}
        tooltip={<Trans>Total amount of GMX bought back since tracking began.</Trans>}
        value={metrics ? `${numberWithCommas(Math.round(metrics.totalBoughtGmx))} GMX` : "N/A"}
        subtitle={
          metrics ? `(${numberWithCommas(Math.round(metrics.totalBoughtUsd), { showDollar: true })})` : undefined
        }
        isLoading={isLoading}
        isUnavailable={isUnavailable}
      />
      <MetricItem
        label={<Trans>Annualized Rate</Trans>}
        tooltip={<Trans>Average weekly rate extrapolated to a full year (weekly rate × 52).</Trans>}
        value={metrics ? (metrics.annualizedRate !== undefined ? formatPercent(metrics.annualizedRate) : "N/A") : "N/A"}
        isLoading={isLoading}
        isUnavailable={isUnavailable}
      />
    </div>
  );
}

function MetricItem({
  label,
  tooltip,
  value,
  subtitle,
  isLoading,
  isUnavailable,
}: {
  label: React.ReactNode;
  tooltip: React.ReactNode;
  value: string;
  subtitle?: string;
  isLoading: boolean;
  isUnavailable: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TooltipWithPortal
        variant="none"
        handle={
          <span className="text-body-small inline-flex items-center gap-4 font-medium text-typography-secondary">
            {label}
            <InfoIcon className="size-16 text-typography-secondary" />
          </span>
        }
        content={tooltip}
      />
      <div className="flex items-baseline gap-8">
        <span className="text-h2 numbers">{isLoading ? "..." : isUnavailable ? "N/A" : value}</span>
        {subtitle && !isLoading && !isUnavailable && (
          <span className="text-14 font-medium text-typography-secondary numbers">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
