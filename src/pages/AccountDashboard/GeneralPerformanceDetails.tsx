import type { MessageDescriptor } from "@lingui/core";
import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";
import type { Address } from "viem";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { PnlSummaryBucketLabel, PnlSummaryPoint } from "domain/synthetics/accountStats/usePnlSummaryData";
import { getEmptyPnlSummaryData, usePnlSummaryData } from "domain/synthetics/accountStats/usePnlSummaryData";
import { formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { UsdValue } from "components/NumericValue/UsdValue";
import { AccountPnlSummarySkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
  TooltipText,
  TooltipTitle,
} from "components/Tooltip/TooltipBlocks";

import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { GeneralPerformanceDetailsDebugTooltip } from "./generalPerformanceDetailsDebug";
import {
  getPnlBreakdownBaseRows,
  getPnlBreakdownFeeAndImpactRows,
  type PnlBreakdownFieldKey,
  type PnlBreakdownRow,
} from "./pnlBreakdown";

const bucketLabelMap: Record<PnlSummaryBucketLabel, MessageDescriptor> = {
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
  onBucketClick?: (bucketLabel: PnlSummaryBucketLabel) => void;
}) {
  const { data, error, loading } = usePnlSummaryData(chainId, account);

  const summaryData = useMemo(() => {
    if (error || data.length === 0) {
      return getEmptyPnlSummaryData();
    }
    return data;
  }, [data, error]);

  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      <div className="flex items-center gap-8 border-b-1/2 border-slate-600 p-20 text-20 font-medium">
        <Trans>General performance details</Trans>
        <StandardTooltip content={t`Performance and chart data are based on UTC times`} variant="none">
          <InfoIconStroke className="h-16 w-16 text-typography-secondary" />
        </StandardTooltip>
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
                <StandardTooltip
                  content={t`Total PnL after fees and price impact. Hover the value to see the breakdown.`}
                  variant="iconStroke"
                >
                  <Trans>PNL ($)</Trans>
                </StandardTooltip>
              </TableTh>
              <TableTh>
                <StandardTooltip
                  variant="iconStroke"
                  content={t`Total PnL percentage after fees and price impact. Hover the value to see the breakdown.`}
                >
                  <Trans>PNL (%)</Trans>
                </StandardTooltip>
              </TableTh>
              <TableTh className="w-0 whitespace-nowrap py-13 pl-5 pr-16 !text-right">
                <Trans>WIN/LOSS</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {loading && <AccountPnlSummarySkeleton count={6} />}
            {!loading &&
              summaryData.map((row) => (
                <GeneralPerformanceDetailsRow key={row.bucketLabel} row={row} onBucketClick={onBucketClick} />
              ))}
          </tbody>
        </table>
      </TableScrollFadeContainer>
    </div>
  );
}

function GeneralPerformanceDetailsRow({
  row,
  onBucketClick,
}: {
  row: PnlSummaryPoint;
  onBucketClick?: (bucketLabel: PnlSummaryBucketLabel) => void;
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
          <UsdValue usd={row.volume} maxThreshold={null} className="numbers" />
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <MetricWithRank rank={row.pnlUsdRank}>
          <StandardTooltip
            className={cx({
              "text-green-500": row.pnlUsd > 0n,
              "text-red-500": row.pnlUsd < 0n,
            })}
            content={
              showDebugValues ? <GeneralPerformanceDetailsDebugTooltip row={row} /> : <PnlBreakdownTooltip row={row} />
            }
            handle={<UsdValue usd={row.pnlUsd} className="numbers" />}
          />
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <MetricWithRank rank={row.pnlBpsRank}>
          <StandardTooltip
            className={cx({
              "text-green-500": row.pnlBps > 0n,
              "text-red-500": row.pnlBps < 0n,
            })}
            content={<PnlPercentageTooltip row={row} />}
            handle={<span className="numbers">{formatPercentage(row.pnlBps, { signed: true, useCommas: true })}</span>}
          />
        </MetricWithRank>
      </TableTd>
      <TableTd>
        <StandardTooltip
          handle={`${row.wins} / ${row.losses}`}
          handleClassName="numbers"
          content={
            <TooltipRows>
              <TooltipRow label={t`Total trades`} value={String(row.wins + row.losses)} />
              {row.winsLossesRatioBps !== undefined && (
                <TooltipRow label={t`Win rate`} value={formatPercentage(row.winsLossesRatioBps)} />
              )}
            </TooltipRows>
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
        <StandardTooltip
          variant="none"
          shouldStopPropagation
          content={t`Rank among accounts for this metric and period`}
          handle={
            <span className="rounded-full border-1/2 border-stroke-primary px-6 py-1 text-12 font-medium text-typography-secondary numbers">
              #{rank}
            </span>
          }
        />
      )}
    </span>
  );
}

function PnlBreakdownTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <TooltipContent className="max-h-[min(70dvh,560px,calc(var(--tooltip-available-height,70dvh)-28px))] overflow-y-auto">
      <PnlBreakdownTooltipContent row={row} />
    </TooltipContent>
  );
}

function PnlBreakdownTooltipContent({ row }: { row: PnlSummaryPoint }) {
  const pnlRows = getPnlBreakdownBaseRows(row);
  const feeRows = getPnlBreakdownFeeAndImpactRows(row);

  return (
    <>
      <TooltipRows>
        <TooltipTitle value={<UsdValue usd={row.pnlUsd} />} valueClassName={getPositiveOrNegativeClass(row.pnlUsd)}>
          {t`PnL`}
        </TooltipTitle>
        {pnlRows.map((breakdownRow) => (
          <BreakdownTooltipRow key={breakdownRow.key} row={breakdownRow} />
        ))}
      </TooltipRows>
      <TooltipDivider />
      <TooltipRows>
        <TooltipTitle>
          <Trans>Fees and impacts</Trans>
        </TooltipTitle>
        {feeRows.map((breakdownRow) => (
          <BreakdownTooltipRow key={breakdownRow.key} row={breakdownRow} />
        ))}
      </TooltipRows>
      <TooltipFootnote>
        <Trans>Outstanding claimable amounts are not included</Trans>.
      </TooltipFootnote>
    </>
  );
}

function PnlPercentageTooltip({ row }: { row: PnlSummaryPoint }) {
  return (
    <TooltipContent className="max-h-[min(70dvh,560px,calc(var(--tooltip-available-height,70dvh)-28px))] overflow-y-auto">
      <TooltipRows>
        <TooltipTitle value={<UsdValue usd={row.usedCapitalUsd} />}>{t`Capital used`}</TooltipTitle>
        <TooltipText>
          <Trans>Capital used = max(sum of collateral of open positions - realized PnL + starting pending PnL).</Trans>
        </TooltipText>
      </TooltipRows>
      <TooltipDivider />
      <PnlBreakdownTooltipContent row={row} />
    </TooltipContent>
  );
}

function getPnlBreakdownFieldLabel(key: PnlBreakdownFieldKey) {
  switch (key) {
    case "realizedBasePnlUsd":
      return t`Realized PnL before fees`;
    case "unrealizedBasePnlUsd":
      return t`Live unrealized PnL before fees`;
    case "startUnrealizedBasePnlContributionUsd":
      return t`Start unrealized PnL before fees`;
    case "openFeesUsd":
      return t`Open fees`;
    case "closeFeesUsd":
      return t`Close fees`;
    case "borrowingFeesUsd":
      return t`Borrow fees`;
    case "positiveFundingFeesUsd":
      return t`Positive funding fees`;
    case "negativeFundingFeesUsd":
      return t`Negative funding fees`;
    case "liquidationFeesUsd":
      return t`Liquidation fees`;
    case "realizedFeesRemainderUsd":
      return t`Other realized fees`;
    case "unrealizedFeesContributionUsd":
      return t`Unrealized fee contribution`;
    case "netPriceImpactUsd":
      return t`Net price impact`;
    case "swapFeesUsd":
      return t`Swap fees`;
    case "swapPriceImpactUsd":
      return t`Swap price impact`;
  }
}

function BreakdownTooltipRow({ row }: { row: PnlBreakdownRow }) {
  return (
    <TooltipRow
      label={getPnlBreakdownFieldLabel(row.key)}
      value={<UsdValue usd={row.value} />}
      valueClassName={getPositiveOrNegativeClass(row.value)}
    />
  );
}
