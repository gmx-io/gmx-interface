import cx from "classnames";
import { Trans, t } from "@lingui/macro";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { formatPercentage, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

const DATA = [
  {
    date: "Today",
    volume: 8384123421343222434322342343323421n,
    pnl: 8384123421343222434322342343323421n,
    realizedPnl: 8384123421343222434322342343323421n,
    unrealizedPnl: 8384123421343222434322342343323421n,
    pnlRank: "#3129",
    pnlPercent: 421n,
    pnlPercentRank: "#1392",
    win: 2,
    loss: 5,
  },
  {
    date: "Yesterday",
    volume: 8384123421343222434322342343323421n,
    pnl: 8384123421343222434322342343323421n,
    realizedPnl: 8384123421343222434322342343323421n,
    unrealizedPnl: 8384123421343222434322342343323421n,
    pnlRank: "#1298",
    pnlPercent: 421n,
    pnlPercentRank: "#1892",
    win: 2,
    loss: 5,
  },
  {
    date: "Last 7d",
    volume: 8384123421343222434322342343323421n,
    pnl: 8384123421343222434322342343323421n,
    realizedPnl: 8384123421343222434322342343323421n,
    unrealizedPnl: 8384123421343222434322342343323421n,
    pnlRank: "#2387",
    pnlPercent: 421n,
    pnlPercentRank: "#9473",
    win: 2,
    loss: 5,
  },
  {
    date: "Last 30d",
    volume: 8384123421343222434322342343323421n,
    pnl: 8384123421343222434322342343323421n,
    realizedPnl: 8384123421343222434322342343323421n,
    unrealizedPnl: 8384123421343222434322342343323421n,
    pnlRank: "#22357",
    pnlPercent: 421n,
    pnlPercentRank: "#32562",
    win: 2,
    loss: 5,
  },
  {
    date: "This Year",
    volume: 8384123421343222434322342343323421n,
    pnl: -8384123421343222434322342343323421n,
    realizedPnl: -8384123421343222434322342343323421n,
    unrealizedPnl: -8384123421343222434322342343323421n,
    pnlRank: "#34267",
    pnlPercent: -421n,
    pnlPercentRank: "#92133",
    win: 14,
    loss: 17,
  },
  {
    date: "Lifetime",
    volume: 8384123421343222434322342343323421n,
    pnl: -8384123421343222434322342343323421n,
    realizedPnl: -8384123421343222434322342343323421n,
    unrealizedPnl: -8384123421343222434322342343323421n,
    pnlRank: "#85472",
    pnlPercent: -421n,
    pnlPercentRank: "#324382",
    win: 32,
    loss: 39,
  },
];

export function GeneralPerformanceDetails() {
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
                <Trans>PnL ($) / Rank</Trans>
              </th>
              <th className="px-5 py-13 opacity-70">
                <Trans>PnL (%) / Rank</Trans>
              </th>
              <th className="py-13 pl-5 pr-16 opacity-70">
                <Trans>Win / Loss</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((row) => (
              <tr key={row.date}>
                <td className="py-13 pl-16 pr-5">{row.date}</td>
                <td className="px-5 py-13">{formatUsd(row.volume)}</td>
                <td className="px-5 py-13">
                  <Tooltip
                    as={"span"}
                    className={cx(
                      "underline decoration-dashed decoration-1 underline-offset-2",
                      row.pnl > 0 ? "text-green-500 decoration-green" : "text-red-500 decoration-red"
                    )}
                    content={
                      <>
                        <StatsTooltipRow
                          label={t`Realized PnL`}
                          showDollar={false}
                          textClassName={getPositiveOrNegativeClass(row.realizedPnl)}
                          value={formatUsd(row.realizedPnl)}
                        />
                        <StatsTooltipRow
                          label={t`Unrealized PnL`}
                          showDollar={false}
                          textClassName={getPositiveOrNegativeClass(row.unrealizedPnl)}
                          value={formatUsd(row.unrealizedPnl)}
                        />
                      </>
                    }
                  >
                    {formatUsd(row.pnl)}
                  </Tooltip>{" "}
                  / {row.pnlRank}
                </td>
                <td className="px-5 py-13">
                  <Tooltip
                    as={"span"}
                    closeDelay={10000000}
                    className={cx(
                      "underline decoration-dashed decoration-1 underline-offset-2",
                      row.pnlPercent > 0 ? "text-green-500 decoration-green" : "text-red-500 decoration-red"
                    )}
                  >
                    {formatPercentage(row.pnlPercent, { signed: true })}
                  </Tooltip>{" "}
                  / {row.pnlPercentRank}
                </td>
                <td className="py-13 pl-5 pr-16">
                  <Tooltip
                    handleClassName=""
                    handle={`${row.win} / ${row.loss}`}
                    content={
                      <>
                        <StatsTooltipRow
                          label={t`Total Trades`}
                          showDollar={false}
                          value={String(row.win + row.loss)}
                        />
                        <StatsTooltipRow
                          label={t`Win Rate`}
                          showDollar={false}
                          value={formatPercentage(
                            BigInt(Math.round((row.win / (row.win + row.loss)) * BASIS_POINTS_DIVISOR))
                          )}
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
