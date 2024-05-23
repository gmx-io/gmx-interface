import { ApolloClient, InMemoryCache, gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, msg, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";

import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { formatPercentage, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const bucketLabelMap = {
  today: msg`Today`,
  yesterday: msg`Yesterday`,
  week: msg`Week`,
  month: msg`Month`,
  year: msg`This Year`,
  all: msg`All Time`,
};

export function GeneralPerformanceDetails() {
  const account = useAccount()!;
  const data = usePnlSummaryData(account);
  const { _ } = useLingui();

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
                <Trans>PnL ($)</Trans>
              </th>
              <th className="px-5 py-13 opacity-70">
                <Trans>PnL (%)</Trans>
              </th>
              <th className="py-13 pl-5 pr-16 opacity-70">
                <Trans>Win / Loss</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.bucketLabel}>
                <td className="py-13 pl-16 pr-5">
                  {_(bucketLabelMap[row.bucketLabel as keyof typeof bucketLabelMap])}
                </td>
                <td className="px-5 py-13">{formatUsd(row.volume)}</td>
                <td className="px-5 py-13">
                  <TooltipWithPortal
                    disableHandleStyle
                    className={cx(
                      "underline decoration-dashed decoration-1 underline-offset-2",
                      row.pnlUsd > 0 ? "text-green-500 decoration-green" : "text-red-500 decoration-red"
                    )}
                    content={
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
                      </>
                    }
                  >
                    {formatUsd(row.pnlUsd)}
                  </TooltipWithPortal>
                </td>
                <td className="px-5 py-13">
                  <TooltipWithPortal
                    disableHandleStyle
                    className={cx(
                      "underline decoration-dashed decoration-1 underline-offset-2",
                      row.pnlBps > 0 ? "text-green-500 decoration-green" : "text-red-500 decoration-red"
                    )}
                  >
                    {formatPercentage(row.pnlBps, { signed: true })}
                  </TooltipWithPortal>
                </td>
                <td className="py-13 pl-5 pr-16">
                  <TooltipWithPortal
                    handle={`${row.wins} / ${row.losses}`}
                    content={
                      <>
                        <StatsTooltipRow
                          label={t`Total Trades`}
                          showDollar={false}
                          value={String(row.wins + row.losses)}
                        />
                        <StatsTooltipRow
                          label={t`Win Rate`}
                          showDollar={false}
                          value={formatPercentage(row.winsLossesRatioBps)}
                        />
                      </>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type PnlSummaryPoint = {
  bucketLabel: string;
  losses: number;
  pnlBps: bigint;
  pnlUsd: bigint;
  realizedPnlUsd: bigint;
  unrealizedPnlUsd: bigint;
  volume: bigint;
  wins: number;
  winsLossesRatioBps: bigint | undefined;
};

type PnlSummaryData = PnlSummaryPoint[];

function usePnlSummaryData(account: string): PnlSummaryData {
  const res = useGqlQuery(
    gql`
      query AccountHistoricalPnlResolver($account: String!) {
        accountPnlSummaryStats(account: $account) {
          bucketLabel
          losses
          pnlBps
          pnlUsd
          realizedPnlUsd
          unrealizedPnlUsd
          volume
          wins
          winsLossesRatioBps
        }
      }
    `,
    {
      client: client,
      variables: { account: account },
    }
  );

  const transformedData = useMemo(() => {
    return (
      res.data?.accountPnlSummaryStats?.map((row: any) => {
        return {
          bucketLabel: row.bucketLabel,
          losses: row.losses,
          pnlBps: BigInt(row.pnlBps),
          pnlUsd: BigInt(row.pnlUsd),
          realizedPnlUsd: BigInt(row.realizedPnlUsd),
          unrealizedPnlUsd: BigInt(row.unrealizedPnlUsd),
          volume: BigInt(row.volume),
          wins: row.wins,
          winsLossesRatioBps: row.winsLossesRatioBps ? BigInt(row.winsLossesRatioBps) : undefined,
        };
      }) || EMPTY_ARRAY
    );
  }, [res.data?.accountPnlSummaryStats]);

  return transformedData;
}

const client = new ApolloClient({
  uri: "http://37.27.100.223:4000/graphql",
  cache: new InMemoryCache(),
});
