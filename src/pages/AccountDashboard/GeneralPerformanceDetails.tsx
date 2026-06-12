import type { MessageDescriptor } from "@lingui/core";
import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import type { Address } from "viem";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { PnlSummaryPoint, usePnlSummaryData } from "domain/synthetics/accountStats";
import { formatPercentage, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { AccountPnlSummarySkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { GeneralPerformanceDetailsDebugTooltip } from "./generalPerformanceDetailsDebug";

const bucketLabelMap: Record<string, MessageDescriptor> = {
  today: msg`Today`,
  yesterday: msg`Yesterday`,
  week: msg`Last 7d`,
  month: msg`Last 30d`,
  year: msg`This year`,
  all: msg`All time`,
};

export function GeneralPerformanceDetails({
  chainId,
  account,
  onBucketClick,
}: {
  chainId: number;
  account: Address;
  onBucketClick?: (bucketLabel: string) => void;
}) {
  const { data, error, loading } = usePnlSummaryData(chainId, account);

  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      <div className="flex items-center gap-8 border-b-1/2 border-slate-600 p-20 text-20 font-medium">
        <Trans>General performance details</Trans>
        <TooltipWithPortal content={t`Performance and chart data are based on UTC times`} variant="none">
          <InfoIconStroke className="h-16 w-16 cursor-help text-typography-secondary" />
        </TooltipWithPortal>
      </div>

      <TableScrollFadeContainer>
        <table className="w-full min-w-max">
          <thead>
            <TableTheadTr>
              <TableTh>
                <Trans>DATE</Trans>
              </TableTh>
              <TableTh>
                <Trans>VOLUME</Trans>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  tooltipClassName="cursor-help *:cursor-auto"
                  content={t`Total PnL after fees and price impact. Hover the value to see the breakdown.`}
                  variant="iconStroke"
                >
                  <Trans>PNL ($)</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  tooltipClassName="cursor-help *:cursor-auto"
                  variant="iconStroke"
                  content={t`Total PnL percentage after fees and price impact. Hover the value to see the breakdown.`}
                >
                  <Trans>PNL (%)</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh className="w-0 whitespace-nowrap py-13 pl-5 pr-16 !text-right">
                <Trans>WIN/LOSS</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {loading && <AccountPnlSummarySkeleton count={6} />}
            {!loading &&
              data.map((row) => (
                <GeneralPerformanceDetailsRow key={row.bucketLabel} row={row} onBucketClick={onBucketClick} />
              ))}
          </tbody>
        </table>
        {!loading && (error || data.length === 0) && (
          <EmptyTableContent
            isLoading={false}
            isEmpty
            emptyText={error ? <Trans>Data is currently unavailable</Trans> : <Trans>No data available</Trans>}
          />
        )}
      </TableScrollFadeContainer>
    </div>
  );
}

function GeneralPerformanceDetailsRow({
  row,
  onBucketClick,
}: {
  row: PnlSummaryPoint;
  onBucketClick?: (bucketLabel: string) => void;
}) {
  const { _ } = useLingui();
  const showDebugValues = useShowDebugValues();
  const bucketLabel = _(bucketLabelMap[row.bucketLabel]);

  return (
    <TableTr key={row.bucketLabel}>
      <TableTd className="!py-16">
        {onBucketClick ? (
          <button
            type="button"
            className="cursor-pointer text-left text-typography-secondary underline decoration-dashed decoration-[0.5px] underline-offset-2 hover:text-typography-primary"
            onClick={() => onBucketClick(row.bucketLabel)}
          >
            {bucketLabel}
          </button>
        ) : (
          bucketLabel
        )}
      </TableTd>
      <TableTd>
        <MetricWithRank rank={row.volumeRank}>
          <span className="numbers">{formatUsd(row.volume, { maxThreshold: null })}</span>
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <MetricWithRank rank={row.pnlUsdRank}>
          <TooltipWithPortal
            variant="none"
            tooltipClassName={cx("cursor-help *:cursor-auto", {
              "!p-0": !showDebugValues,
            })}
            maxAllowedWidth={showDebugValues ? 350 : 420}
            className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
              "text-green-500 decoration-green-500/50": row.pnlUsd > 0n,
              "text-red-500 decoration-red-500/50": row.pnlUsd < 0n,
              "decoration-gray-400": row.pnlUsd === 0n,
            })}
            content={
              showDebugValues ? <GeneralPerformanceDetailsDebugTooltip row={row} /> : <PnlBreakdownTooltip row={row} />
            }
            handle={<span className="numbers">{formatUsd(row.pnlUsd)}</span>}
          />
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <MetricWithRank rank={row.pnlBpsRank}>
          <TooltipWithPortal
            variant="none"
            tooltipClassName="cursor-help !p-0 *:cursor-auto"
            maxAllowedWidth={420}
            className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
              "text-green-500 decoration-green-500/50": row.pnlBps > 0n,
              "text-red-500 decoration-red-500/50": row.pnlBps < 0n,
              "decoration-gray-400": row.pnlBps === 0n,
            })}
            content={<PnlPercentageTooltip row={row} />}
            handle={<span className="numbers">{formatPercentage(row.pnlBps, { signed: true })}</span>}
          />
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          handle={`${row.wins} / ${row.losses}`}
          handleClassName="numbers"
          content={
            <>
              <StatsTooltipRow
                label={t`Total trades`}
                showDollar={false}
                value={String(row.wins + row.losses)}
                valueClassName="numbers"
              />
              {row.winsLossesRatioBps !== undefined && (
                <StatsTooltipRow
                  label={t`Win rate`}
                  showDollar={false}
                  value={formatPercentage(row.winsLossesRatioBps)}
                  valueClassName="numbers"
                />
              )}
            </>
          }
        />
      </TableTd>
    </TableTr>
  );
}

function MetricWithRank({ rank, children }: { rank: number | undefined; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-8">
      {children}
      {rank !== undefined && (
        <TooltipWithPortal
          variant="none"
          shouldStopPropagation
          content={t`Rank among accounts for this metric and period.`}
          handle={
            <span className="cursor-help rounded-full border-1/2 border-stroke-primary px-6 py-1 text-12 font-medium text-typography-secondary numbers">
              #{rank}
            </span>
          }
        />
      )}
    </span>
  );
}

type BreakdownRow = {
  key: string;
  label: React.ReactNode;
  value: bigint;
};

function PnlBreakdownTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <div className="max-h-[min(70dvh,560px)] w-[400px] max-w-[calc(100vw-32px)] overflow-y-auto p-16 tracking-normal max-md:w-[calc(100vw-24px)] max-md:max-w-[calc(100vw-24px)] max-md:p-14">
      <PnlBreakdownTooltipContent row={row} />
    </div>
  );
}

function PnlBreakdownTooltipContent({ row }: { row: PnlSummaryPoint }) {
  const pnlRows: BreakdownRow[] = [
    { key: "realizedBasePnlUsd", label: t`Realized PnL before fees`, value: row.realizedBasePnlUsd },
    { key: "unrealizedBasePnlUsd", label: t`Live unrealized PnL before fees`, value: row.unrealizedBasePnlUsd },
    {
      key: "startUnrealizedBasePnlContributionUsd",
      label: t`Start unrealized PnL before fees`,
      value: row.startUnrealizedBasePnlContributionUsd,
    },
  ];

  const feeRows: BreakdownRow[] = [
    { key: "openFeesUsd", label: t`Open fees`, value: row.openFeesUsd },
    { key: "closeFeesUsd", label: t`Close fees`, value: row.closeFeesUsd },
    { key: "borrowingFeesUsd", label: t`Borrow fees`, value: row.borrowingFeesUsd },
    ...(row.positiveFundingFeesUsd === 0n
      ? []
      : [{ key: "positiveFundingFeesUsd", label: t`Positive funding fees`, value: row.positiveFundingFeesUsd }]),
    { key: "negativeFundingFeesUsd", label: t`Negative funding fees`, value: row.negativeFundingFeesUsd },
    ...(row.liquidationFeesUsd === 0n
      ? []
      : [{ key: "liquidationFeesUsd", label: t`Liquidation fees`, value: row.liquidationFeesUsd }]),
    { key: "realizedFeesRemainderUsd", label: t`Other realized fees`, value: row.realizedFeesRemainderUsd },
    {
      key: "unrealizedFeesContributionUsd",
      label: t`Unrealized fee contribution`,
      value: row.unrealizedFeesContributionUsd,
    },
    { key: "netPriceImpactUsd", label: t`Net price impact`, value: row.netPriceImpactUsd },
    { key: "swapFeesUsd", label: t`Swap fees`, value: row.swapFeesUsd },
    { key: "swapPriceImpactUsd", label: t`Swap price impact`, value: row.swapPriceImpactUsd },
  ];

  return (
    <div className="text-body-medium leading-[1.35]">
      <BreakdownTooltipRow label={t`PnL`} value={row.pnlUsd} labelClassName="!text-typography-primary" />

      <div className="mt-8 flex flex-col gap-8">
        {pnlRows.map((breakdownRow) => (
          <BreakdownTooltipRow key={breakdownRow.key} label={breakdownRow.label} value={breakdownRow.value} />
        ))}
      </div>

      <div className="my-12 h-[0.5px] bg-slate-600" />

      <div className="mb-10 font-medium text-typography-primary">
        <Trans>Fees and impacts</Trans>
      </div>
      <div className="flex flex-col gap-8">
        {feeRows.map((breakdownRow) => (
          <BreakdownTooltipRow key={breakdownRow.key} label={breakdownRow.label} value={breakdownRow.value} />
        ))}
      </div>
      <div className="text-body-small mt-8 leading-[1.35] text-typography-secondary">
        <Trans>Outstanding claimable amounts are not included</Trans>.
      </div>
    </div>
  );
}

function PnlPercentageTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <div className="max-h-[min(70dvh,560px)] w-[400px] max-w-[calc(100vw-32px)] overflow-y-auto p-16 tracking-normal max-md:max-w-[calc(100vw-24px)] max-md:p-14">
      <StatsTooltipRow
        label={t`Capital used`}
        showDollar={false}
        value={formatUsd(row.usedCapitalUsd)}
        valueClassName="numbers"
        labelClassName="text-typography-primary font-medium"
      />
      <div className="text-body-small text-typography-secondary">
        <Trans>Capital used = max(sum of collateral of open positions - realized PnL + starting pending PnL).</Trans>
      </div>
      <div className="my-12 h-[0.5px] bg-slate-600" />
      <PnlBreakdownTooltipContent row={row} />
    </div>
  );
}

function BreakdownTooltipRow({
  label,
  value,
  labelClassName,
}: {
  label: React.ReactNode;
  value: bigint;
  labelClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-16">
      <span className={cx("min-w-0 break-words font-medium text-typography-secondary", labelClassName)}>{label}</span>
      <span className={cx("whitespace-nowrap text-right numbers", getPositiveOrNegativeClass(value))}>
        {formatUsd(value)}
      </span>
    </div>
  );
}
