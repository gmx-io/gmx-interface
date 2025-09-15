import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import type { Address } from "viem";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { PnlSummaryPoint, usePnlSummaryData } from "domain/synthetics/accountStats";
import { formatPercentage, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AccountPnlSummarySkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { GeneralPerformanceDetailsDebugTooltip } from "./generalPerformanceDetailsDebug";

const bucketLabelMap = {
  today: msg`Today`,
  yesterday: msg`Yesterday`,
  week: msg`Last 7d`,
  month: msg`Last 30d`,
  year: msg`This Year`,
  all: msg`All Time`,
};

export function GeneralPerformanceDetails({ chainId, account }: { chainId: number; account: Address }) {
  const { data, error, loading } = usePnlSummaryData(chainId, account);

  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 p-20 text-20 font-medium">
        <Trans>General Performance Details</Trans>
      </div>

      <TableScrollFadeContainer>
        <table className="w-full min-w-max">
          <thead>
            <TableTheadTr>
              <TableTh>
                <Trans>Date</Trans>
              </TableTh>
              <TableTh>
                <Trans>Volume</Trans>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  tooltipClassName="cursor-help *:cursor-auto"
                  content={t`The total realized and unrealized profit and loss for the period, including fees and price impact.`}
                  variant="iconStroke"
                >
                  <Trans>PnL ($)</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  tooltipClassName="cursor-help *:cursor-auto"
                  variant="iconStroke"
                  content={
                    <Trans>
                      The PnL ($) compared to the capital used.
                      <br />
                      <br />
                      The capital used is calculated as the highest value of [
                      <i>sum of collateral of open positions - realized PnL + period start pending PnL</i>].
                    </Trans>
                  }
                >
                  <Trans>PnL (%)</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh className="w-0 whitespace-nowrap py-13 pl-5 pr-16 !text-right">
                <Trans>Win / Loss</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {loading && <AccountPnlSummarySkeleton count={6} />}
            {!loading && data.map((row) => <GeneralPerformanceDetailsRow key={row.bucketLabel} row={row} />)}
          </tbody>
        </table>
        {error && (
          <div className="max-h-[200px] overflow-auto p-20">
            <div className="whitespace-pre-wrap font-mono text-red-500">{JSON.stringify(error, null, 2)}</div>
          </div>
        )}
      </TableScrollFadeContainer>
    </div>
  );
}

function GeneralPerformanceDetailsRow({ row }: { row: PnlSummaryPoint }) {
  const { _ } = useLingui();
  const showDebugValues = useShowDebugValues();

  return (
    <TableTr key={row.bucketLabel}>
      <TableTd>{_(bucketLabelMap[row.bucketLabel as keyof typeof bucketLabelMap])}</TableTd>
      <TableTd className="numbers">{formatUsd(row.volume, { maxThreshold: null })}</TableTd>
      <TableTd>
        <TooltipWithPortal
          variant="none"
          tooltipClassName="cursor-help *:cursor-auto"
          className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
            "text-green-500 decoration-green-500/50": row.pnlUsd > 0,
            "text-red-500 decoration-red-500/50": row.pnlUsd < 0,
            "decoration-gray-400": row.pnlUsd === 0n,
          })}
          content={
            showDebugValues ? (
              <GeneralPerformanceDetailsDebugTooltip row={row} />
            ) : (
              <>
                <StatsTooltipRow
                  label={t`Realized PnL`}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(row.realizedPnlUsd)}
                  value={formatUsd(row.realizedPnlUsd)}
                  valueClassName="numbers"
                />
                <StatsTooltipRow
                  label={t`Unrealized PnL`}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(row.unrealizedPnlUsd)}
                  value={formatUsd(row.unrealizedPnlUsd)}
                  valueClassName="numbers"
                />
                <StatsTooltipRow
                  label={t`Start Unrealized PnL`}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(row.startUnrealizedPnlUsd)}
                  value={formatUsd(row.startUnrealizedPnlUsd)}
                  valueClassName="numbers"
                />
              </>
            )
          }
          handle={formatUsd(row.pnlUsd)}
          handleClassName="numbers"
        ></TooltipWithPortal>
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          variant="none"
          tooltipClassName="cursor-help *:cursor-auto"
          className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
            "text-green-500 decoration-green-500/50": row.pnlBps > 0n,
            "text-red-500 decoration-red-500/50": row.pnlBps < 0n,
            "decoration-gray-400": row.pnlBps === 0n,
          })}
          content={
            <StatsTooltipRow
              label={t`Capital Used`}
              showDollar={false}
              value={formatUsd(row.usedCapitalUsd)}
              valueClassName="numbers"
            />
          }
          handle={formatPercentage(row.pnlBps, { signed: true })}
          handleClassName="numbers"
        ></TooltipWithPortal>
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          handle={`${row.wins} / ${row.losses}`}
          handleClassName="numbers"
          content={
            <>
              <StatsTooltipRow
                label={t`Total Trades`}
                showDollar={false}
                value={String(row.wins + row.losses)}
                valueClassName="numbers"
              />
              {row.winsLossesRatioBps !== undefined && (
                <StatsTooltipRow
                  label={t`Win Rate`}
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
