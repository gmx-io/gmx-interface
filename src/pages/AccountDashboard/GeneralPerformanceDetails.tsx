import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";
import type { Address } from "viem";

import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { formatPercentage, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AccountPnlSummarySkeleton } from "components/Skeleton/Skeleton";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import {
  DEBUG_QUERY,
  GeneralPerformanceDetailsDebugTooltip,
  PnlSummaryPointDebugFields,
} from "./generalPerformanceDetailsDebug";

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
    <div className="overflow-hidden rounded-4 bg-slate-800">
      <div className="border-b border-b-gray-950 p-16">
        <Trans>General Performance Details</Trans>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="*:text-left *:font-normal *:uppercase">
              <th className="py-13 pl-16 pr-5 opacity-70">
                <Trans>Date</Trans>
              </th>
              <th className="px-5 py-13 opacity-70">
                <Trans>Volume</Trans>
              </th>
              <th className="px-5 py-13 opacity-70">
                <TooltipWithPortal
                  portalClassName="cursor-help *:cursor-auto"
                  content={t`The total realized and unrealized profit and loss for the period, including fees and price impact.`}
                >
                  <Trans>PnL ($)</Trans>
                </TooltipWithPortal>
              </th>
              <th className="px-5 py-13 opacity-70">
                <TooltipWithPortal
                  portalClassName="cursor-help *:cursor-auto"
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
              </th>
              <th className="w-0 whitespace-nowrap py-13 pl-5 pr-16 !text-right opacity-70">
                <Trans>Win / Loss</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && <AccountPnlSummarySkeleton count={6} />}
            {!loading && data.map((row) => <GeneralPerformanceDetailsRow key={row.bucketLabel} row={row} />)}
          </tbody>
        </table>
        {error && (
          <div className="max-h-[200px] overflow-auto p-16">
            <div className="whitespace-pre-wrap font-mono text-red-500">{JSON.stringify(error, null, 2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralPerformanceDetailsRow({ row }: { row: PnlSummaryPoint }) {
  const { _ } = useLingui();
  const showDebugValues = useShowDebugValues();

  return (
    <tr key={row.bucketLabel}>
      <td className="py-13 pl-16 pr-5">{_(bucketLabelMap[row.bucketLabel as keyof typeof bucketLabelMap])}</td>
      <td className="px-5 py-13">{formatUsd(row.volume, { maxThreshold: null })}</td>
      <td className="px-5 py-13">
        <TooltipWithPortal
          disableHandleStyle
          portalClassName="cursor-help *:cursor-auto"
          className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
            "text-green-500 decoration-green": row.pnlUsd > 0,
            "text-red-500 decoration-red": row.pnlUsd < 0,
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
                />
                <StatsTooltipRow
                  label={t`Unrealized PnL`}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(row.unrealizedPnlUsd)}
                  value={formatUsd(row.unrealizedPnlUsd)}
                />
                <StatsTooltipRow
                  label={t`Start Unrealized PnL`}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(row.startUnrealizedPnlUsd)}
                  value={formatUsd(row.startUnrealizedPnlUsd)}
                />
              </>
            )
          }
        >
          {formatUsd(row.pnlUsd)}
        </TooltipWithPortal>
      </td>
      <td className="px-5 py-13">
        <TooltipWithPortal
          disableHandleStyle
          portalClassName="cursor-help *:cursor-auto"
          className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
            "text-green-500 decoration-green": row.pnlBps > 0n,
            "text-red-500 decoration-red": row.pnlBps < 0n,
            "decoration-gray-400": row.pnlBps === 0n,
          })}
          content={<StatsTooltipRow label={t`Capital Used`} showDollar={false} value={formatUsd(row.usedCapitalUsd)} />}
        >
          {formatPercentage(row.pnlBps, { signed: true })}
        </TooltipWithPortal>
      </td>
      <td className="py-13 pl-5 pr-16 text-right">
        <TooltipWithPortal
          handle={`${row.wins} / ${row.losses}`}
          content={
            <>
              <StatsTooltipRow label={t`Total Trades`} showDollar={false} value={String(row.wins + row.losses)} />
              {row.winsLossesRatioBps !== undefined && (
                <StatsTooltipRow
                  label={t`Win Rate`}
                  showDollar={false}
                  value={formatPercentage(row.winsLossesRatioBps)}
                />
              )}
            </>
          }
        />
      </td>
    </tr>
  );
}

export type PnlSummaryPoint = {
  bucketLabel: string;
  losses: number;
  pnlBps: bigint;
  pnlUsd: bigint;
  realizedPnlUsd: bigint;
  unrealizedPnlUsd: bigint;
  startUnrealizedPnlUsd: bigint;
  volume: bigint;
  wins: number;
  winsLossesRatioBps: bigint | undefined;
  usedCapitalUsd: bigint;
} & PnlSummaryPointDebugFields;

type PnlSummaryData = PnlSummaryPoint[];

const PROD_QUERY = gql`
  query AccountHistoricalPnlResolver($account: String!) {
    accountPnlSummaryStats(account: $account) {
      bucketLabel
      losses
      pnlBps
      pnlUsd
      realizedPnlUsd
      unrealizedPnlUsd
      startUnrealizedPnlUsd
      volume
      wins
      winsLossesRatioBps
      usedCapitalUsd
    }
  }
`;

function usePnlSummaryData(chainId: number, account: Address) {
  const showDebugValues = useShowDebugValues();

  const res = useGqlQuery(showDebugValues ? DEBUG_QUERY : PROD_QUERY, {
    client: getSubsquidGraphClient(chainId)!,
    variables: { account: account },
  });

  const transformedData: PnlSummaryData = useMemo(() => {
    if (!res.data?.accountPnlSummaryStats) {
      return EMPTY_ARRAY;
    }

    return res.data.accountPnlSummaryStats.map((row: any) => {
      if (showDebugValues) {
        return {
          bucketLabel: row.bucketLabel,
          losses: row.losses,
          pnlBps: BigInt(row.pnlBps),
          pnlUsd: BigInt(row.pnlUsd),
          realizedPnlUsd: BigInt(row.realizedPnlUsd),
          unrealizedPnlUsd: BigInt(row.unrealizedPnlUsd),
          startUnrealizedPnlUsd: BigInt(row.startUnrealizedPnlUsd),
          volume: BigInt(row.volume),
          wins: row.wins,
          winsLossesRatioBps: row.winsLossesRatioBps ? BigInt(row.winsLossesRatioBps) : undefined,
          usedCapitalUsd: BigInt(row.usedCapitalUsd),

          realizedBasePnlUsd: row.realizedBasePnlUsd !== undefined ? BigInt(row.realizedBasePnlUsd) : 0n,
          realizedFeesUsd: row.realizedFeesUsd !== undefined ? BigInt(row.realizedFeesUsd) : 0n,
          realizedPriceImpactUsd: row.realizedPriceImpactUsd !== undefined ? BigInt(row.realizedPriceImpactUsd) : 0n,
          unrealizedBasePnlUsd: row.unrealizedBasePnlUsd !== undefined ? BigInt(row.unrealizedBasePnlUsd) : 0n,
          unrealizedFeesUsd: row.unrealizedFeesUsd !== undefined ? BigInt(row.unrealizedFeesUsd) : 0n,
          startUnrealizedBasePnlUsd:
            row.startUnrealizedBasePnlUsd !== undefined ? BigInt(row.startUnrealizedBasePnlUsd) : 0n,
          startUnrealizedFeesUsd: row.startUnrealizedFeesUsd !== undefined ? BigInt(row.startUnrealizedFeesUsd) : 0n,
        };
      }
      return {
        bucketLabel: row.bucketLabel,
        losses: row.losses,
        pnlBps: BigInt(row.pnlBps),
        pnlUsd: BigInt(row.pnlUsd),
        realizedPnlUsd: BigInt(row.realizedPnlUsd),
        unrealizedPnlUsd: BigInt(row.unrealizedPnlUsd),
        startUnrealizedPnlUsd: BigInt(row.startUnrealizedPnlUsd),
        volume: BigInt(row.volume),
        wins: row.wins,
        winsLossesRatioBps: row.winsLossesRatioBps ? BigInt(row.winsLossesRatioBps) : undefined,
        usedCapitalUsd: BigInt(row.usedCapitalUsd),
      };
    });
  }, [res.data?.accountPnlSummaryStats, showDebugValues]);

  return { data: transformedData, error: res.error, loading: res.loading };
}
