import { Trans } from "@lingui/macro";

import type { BuybackDerivedMetrics } from "domain/buyback/useBuybackChartData";

import { numberWithCommas } from "lib/numbers";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function BuybackMetricsHeader({
  metrics,
  isLoading,
}: {
  metrics: BuybackDerivedMetrics | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="flex gap-28 max-md:grid max-md:grid-cols-2 max-md:gap-12">
      <MetricItem
        label={<Trans>Weekly Bought GMX</Trans>}
        tooltip={<Trans>Amount of GMX bought back this week from protocol fees.</Trans>}
        value={metrics ? `${numberWithCommas(Math.round(metrics.weeklyBoughtGmx))} GMX` : "..."}
        subtitle={metrics ? numberWithCommas(Math.round(metrics.weeklyBoughtUsd), { showDollar: true }) : undefined}
        isLoading={isLoading}
      />
      <MetricItem
        label={<Trans>Total Bought GMX</Trans>}
        tooltip={<Trans>Total amount of GMX bought back since tracking began.</Trans>}
        value={metrics ? `${numberWithCommas(Math.round(metrics.totalBoughtGmx))} GMX` : "..."}
        subtitle={metrics ? numberWithCommas(Math.round(metrics.totalBoughtUsd), { showDollar: true }) : undefined}
        isLoading={isLoading}
      />
      <MetricItem
        label={<Trans>Weekly Rate</Trans>}
        tooltip={<Trans>This week's buyback as a percentage of total staked GMX.</Trans>}
        value={metrics ? formatPercent(metrics.weeklyRate) : "..."}
        isLoading={isLoading}
      />
      <MetricItem
        label={<Trans>Annualized Rate</Trans>}
        tooltip={<Trans>Weekly rate extrapolated to a full year (weekly rate × 52).</Trans>}
        value={metrics ? formatPercent(metrics.annualizedRate) : "..."}
        isLoading={isLoading}
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
}: {
  label: React.ReactNode;
  tooltip: React.ReactNode;
  value: string;
  subtitle?: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TooltipWithPortal
        variant="none"
        handle={
          <span className="inline-flex items-center gap-4 text-body-small font-medium text-typography-secondary">
            {label}
            <InfoIcon className="size-16 text-typography-secondary" />
          </span>
        }
        content={tooltip}
      />
      <div className="flex items-baseline gap-8">
        <span className="text-h2 numbers">{isLoading ? "..." : value}</span>
        {subtitle && !isLoading && (
          <span className="text-14 font-medium text-typography-secondary numbers">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
