import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";

import { useProtocolStatsSummary } from "domain/protocolStats/useProtocolStatsSummary";
import {
  formatProtocolStatsCount,
  formatProtocolStatsSourceHealth,
  formatProtocolStatsUsd,
  getProtocolStatsNetworkLabel,
} from "domain/protocolStats/utils";
import { formatDateTime } from "lib/dates";
import { PROTOCOL_STATS_NETWORKS } from "sdk/utils/stats/types";
import type { ProtocolStatsMeta, ProtocolStatsMetricSet, ProtocolStatsSummaryResponse } from "sdk/utils/stats/types";

import { AppCard, AppCardSection, AppCardSplit } from "components/AppCard/AppCard";
import Badge from "components/Badge/Badge";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";

export function ProtocolStatsCard() {
  const { data, error } = useProtocolStatsSummary();

  if (error) {
    return null;
  }

  const isPartial = data?.meta.completeness === "partial";
  const openInterest = data?.totals.openInterest;

  return (
    <AppCard dataQa="protocol-stats-card">
      <AppCardSection className="text-body-large font-medium">
        <div className="flex items-center justify-between gap-8">
          <Trans>All networks</Trans>
          {data ? <SourcesStatus meta={data.meta} /> : null}
        </div>
      </AppCardSection>
      <AppCardSplit
        className="max-lg:flex-col"
        leftClassName="max-lg:border-r-0 max-lg:border-b"
        left={
          <AppCardSection className="pb-24">
            <MetricRow
              label={t`Volume`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.volume.total}
              format={formatProtocolStatsUsd}
              note={<Trans>Perps and swaps. LP deposits and withdrawals are not included.</Trans>}
            />
            <MetricRow
              label={t`24h volume`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.volume24h?.total}
              format={formatProtocolStatsUsd}
            />
            <MetricRow
              label={t`Open interest`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.openInterest?.total}
              format={formatProtocolStatsUsd}
              extra={
                openInterest ? (
                  <>
                    <StatsTooltipRow
                      label={t`Long`}
                      showDollar={false}
                      value={formatProtocolStatsUsd(openInterest.long)}
                    />
                    <StatsTooltipRow
                      label={t`Short`}
                      showDollar={false}
                      value={formatProtocolStatsUsd(openInterest.short)}
                    />
                  </>
                ) : null
              }
            />
            <MetricRow
              label={t`Fees`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.fees.total}
              format={formatProtocolStatsUsd}
              note={<Trans>Position, borrowing, liquidation and swap fees.</Trans>}
            />
          </AppCardSection>
        }
        right={
          <AppCardSection className="pb-24">
            <MetricRow
              label={t`TVL`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.tvl?.total}
              format={formatProtocolStatsUsd}
              note={<Trans>Value of GM pools. GLV vaults hold GM tokens, so they are already included.</Trans>}
            />
            <MetricRow
              label={t`Protocol revenue`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.revenue?.protocol}
              format={formatProtocolStatsUsd}
              note={
                <Trans>
                  Share of fees kept by the protocol under each network's fee distribution. LP and buyback shares are
                  not included.
                </Trans>
              }
            />
            <MetricRow
              label={t`Traders`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.users.traders}
              format={formatProtocolStatsCount}
              note={<Trans>Wallets with an executed position change, counted once per network.</Trans>}
            />
            <MetricRow
              label={t`Perp trades`}
              summary={data}
              isPartial={isPartial}
              select={(m) => m.trades.perps}
              format={formatProtocolStatsCount}
            />
          </AppCardSection>
        }
      />
    </AppCard>
  );
}

function MetricRow<T>({
  label,
  summary,
  isPartial,
  select,
  format,
  note,
  extra,
}: {
  label: string;
  summary: ProtocolStatsSummaryResponse | undefined;
  isPartial: boolean;
  select: (metrics: ProtocolStatsMetricSet) => T | null | undefined;
  format: (value: T | null | undefined) => string;
  note?: ReactNode;
  extra?: ReactNode;
}) {
  const selectFrom = (metrics: ProtocolStatsMetricSet | undefined) => {
    if (!summary) {
      return undefined;
    }

    return metrics ? select(metrics) ?? null : null;
  };

  return (
    <div className="App-card-row">
      <div className="label">{label}</div>
      <div>
        <TooltipComponent
          position="bottom-end"
          className="whitespace-nowrap"
          handle={format(selectFrom(summary?.totals))}
          handleClassName={cx("numbers", { "text-yellow-300": isPartial })}
          content={
            <>
              {note ? <div className="mb-8">{note}</div> : null}
              {PROTOCOL_STATS_NETWORKS.map((network) => (
                <StatsTooltipRow
                  key={network}
                  label={getProtocolStatsNetworkLabel(network)}
                  showDollar={false}
                  value={format(selectFrom(summary?.byNetwork[network]))}
                />
              ))}
              <div className="!my-8 h-1 bg-gray-800" />
              <StatsTooltipRow label={t`Total`} showDollar={false} value={format(selectFrom(summary?.totals))} />
              {extra}
            </>
          }
        />
      </div>
    </div>
  );
}

function SourcesStatus({ meta }: { meta: ProtocolStatsMeta }) {
  const isPartial = meta.completeness === "partial";
  const asOf = meta.asOf;

  return (
    <TooltipComponent
      position="bottom-end"
      handle={
        <Badge indicator={isPartial ? "warning" : undefined}>{isPartial ? t`Partial data` : t`Up to date`}</Badge>
      }
      content={
        <>
          <div className="mb-8">
            {isPartial ? (
              <Trans>Some sources are stale or missing, so the totals are incomplete.</Trans>
            ) : (
              <Trans>Every source is fresh.</Trans>
            )}
          </div>
          {meta.sources.map((source) => (
            <StatsTooltipRow
              key={source.id}
              label={getProtocolStatsNetworkLabel(source.network)}
              showDollar={false}
              value={formatProtocolStatsSourceHealth(source)}
            />
          ))}
          <div className="!my-8 h-1 bg-gray-800" />
          <StatsTooltipRow
            label={t`As of`}
            showDollar={false}
            value={`${formatDateTime(asOf, { timezone: "utc" })} UTC`}
          />
        </>
      }
    />
  );
}
