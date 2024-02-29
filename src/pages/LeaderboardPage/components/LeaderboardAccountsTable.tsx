import { t } from "@lingui/macro";
import cx from "classnames";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Table from "components/Table/Table";
import { TableHeader } from "components/Table/types";
import Tooltip from "components/Tooltip/Tooltip";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";

import { TopAccountsSkeleton } from "components/Skeleton/Skeleton";
import {
  CompetitionType,
  LeaderboardAccount,
  RemoteData,
  TopAccountsRow,
  formatDelta,
  signedValueClassName,
} from "domain/synthetics/leaderboard";
import { useLeaderboardAccountsRanks } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { BigNumber } from "ethers";

function getWinnerClassname(rank: number, competition: CompetitionType | undefined) {
  if (!competition) return rank <= 3 ? `LeaderboardRank-${rank}` : undefined;
  return rank <= 10 ? `LeaderboardRank-TopCompetitor` : undefined;
}

const constructRow = (
  s: LeaderboardAccount,
  index: number,
  rank: number,
  competition: CompetitionType | undefined
): TopAccountsRow => ({
  key: s.account,
  rank: {
    value: () => <span className={getWinnerClassname(rank, competition)}>{rank}</span>,
  },
  account: {
    value: (breakpoint) => <AddressView size={20} address={s.account} breakpoint={breakpoint} />,
  },
  absPnl: {
    value: () => (
      <Tooltip
        handle={
          <span className={signedValueClassName(s.totalPnlAfterFees)}>
            {formatDelta(s.totalPnlAfterFees, { signed: true, prefix: "$" })}
          </span>
        }
        position={index > 7 ? "right-top" : "right-bottom"}
        className="nowrap"
        renderContent={() => (
          <div>
            <StatsTooltipRow
              label={t`Realized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.realizedPnl)}>
                  {formatDelta(s.realizedPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Unrealized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.pendingPnl)}>
                  {formatDelta(s.pendingPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Start Pending PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.startPendingPnl)}>
                  {formatDelta(s.startPendingPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Paid Fees`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.paidFees.mul(-1))}>
                  {formatDelta(s.paidFees.mul(-1), { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Pending Fees`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.pendingFees.mul(-1))}>
                  {formatDelta(s.pendingFees.mul(-1), { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Start Pending Fees`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.startPendingFees.mul(-1))}>
                  {formatDelta(s.startPendingFees.mul(-1), { signed: true, prefix: "$" })}
                </span>
              }
            />
          </div>
        )}
      />
    ),
  },
  relPnl: {
    value: () => (
      <Tooltip
        handle={<span className={signedValueClassName(s.pnlPercentage)}>{formatPercentage(s.pnlPercentage)}</span>}
        position={index > 7 ? "right-top" : "right-bottom"}
        className="nowrap"
        renderContent={() => (
          <StatsTooltipRow
            label={t`Max Collateral`}
            showDollar={false}
            value={<span>{formatUsd(s.maxCollateral)}</span>}
          />
        )}
      />
    ),
  },
  averageSize: {
    value: formatUsd(s.averageSize) || "",
    className: "leaderboard-size",
  },
  averageLeverage: {
    value: `${formatAmount(s.averageLeverage, 4, 2)}x`,
    className: "leaderboard-leverage",
  },
  winsLosses: {
    value: `${s.wins}/${s.losses}`,
    className: "text-right",
  },
});

type LeaderboardAccountField = keyof LeaderboardAccount;

export function LeaderboardAccountsTable({
  accounts,
  search,
  activeCompetition,
}: {
  accounts: RemoteData<LeaderboardAccount>;
  search: string;
  activeCompetition: CompetitionType | undefined;
}) {
  const perPage = 20;
  const { isLoading, error, data } = accounts;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<LeaderboardAccountField>("totalPnlAfterFees");
  const [direction, setDirection] = useState<number>(1);
  const handleColumnClick = useCallback(
    (key: string) => {
      if (key === "wins") {
        setOrderBy(orderBy === "wins" ? "losses" : "wins");
        setDirection(1);
      } else if (key === orderBy) {
        setDirection((d: number) => -1 * d);
      } else {
        setOrderBy(key as LeaderboardAccountField);
        setDirection(1);
      }
    },
    [orderBy]
  );
  const isCompetitions = Boolean(activeCompetition);

  useLayoutEffect(() => {
    if (!isCompetitions) return;

    if (activeCompetition === "notionalPnl") {
      setOrderBy("totalPnlAfterFees");
      setDirection(1);
    }
    if (activeCompetition === "pnlPercentage") {
      setOrderBy("pnlPercentage");
      setDirection(1);
    }
  }, [activeCompetition, isCompetitions]);

  const ranks = useLeaderboardAccountsRanks();

  const term = useDebounce(search, 300);
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const key = orderBy;

      if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
        return direction * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
      } else if (typeof a[key] === "number" && typeof b[key] === "number") {
        return direction * (a[key] > b[key] ? -1 : 1);
      } else {
        return 1;
      }
    });
  }, [data, direction, orderBy]);

  const filteredStats = useMemo(
    () => sorted.filter((a) => a.account.toLowerCase().indexOf(term.toLowerCase()) >= 0),
    [sorted, term]
  );

  const indexFrom = (page - 1) * perPage;
  const activeRank = activeCompetition === "pnlPercentage" ? ranks.pnlPercentage : ranks.pnl;
  const rows = useMemo(
    () =>
      filteredStats
        .slice(indexFrom, indexFrom + perPage)
        .map((acc, i) => constructRow(acc, i, activeRank.get(acc.account) ?? 0, activeCompetition)),
    [activeCompetition, activeRank, filteredStats, indexFrom]
  );
  const pageCount = Math.ceil(filteredStats.length / perPage);

  const getSortableClass = useCallback(
    (key: LeaderboardAccountField) =>
      cx(
        orderBy === key || (key === "wins" && orderBy === "losses")
          ? direction > 0
            ? "sorted-asc"
            : "sorted-desc"
          : "sortable"
      ),
    [direction, orderBy]
  );

  const titles: { [key in keyof TopAccountsRow]?: TableHeader } = useMemo(
    () => ({
      rank: { columnName: "rank", title: t`Rank`, width: 6 },
      account: {
        columnName: "account",
        title: t`Address`,
        tooltip: t`Only Addresses with over $1,000 in traded volume are displayed.`,
        tooltipPosition: "left-bottom",
        width: (p = "XL") => ({ XL: 16, L: 16, M: 16, S: 10 }[p] || 16),
      },
      absPnl: {
        className: getSortableClass("totalPnlAfterFees"),
        columnName: "totalPnlAfterFees",
        onClick: handleColumnClick,
        title: t`PnL ($)`,
        tooltip: t`Total Realized and Unrealized Profit and Loss.`,
        width: 12,
      },
      relPnl: {
        className: getSortableClass("pnlPercentage"),
        columnName: "pnlPercentage",
        onClick: handleColumnClick,
        title: t`PnL (%)`,
        width: 10,
      },
      averageSize: {
        className: getSortableClass("averageSize"),
        columnName: "averageSize",
        onClick: handleColumnClick,
        title: t`Avg. Size`,
        tooltip: t`Average Position Size.`,
        width: 12,
      },
      averageLeverage: {
        className: getSortableClass("averageLeverage"),
        columnName: "averageLeverage",
        onClick: handleColumnClick,
        title: t`Avg. Lev.`,
        tooltip: t`Average Leverage used.`,
        width: 10,
      },
      winsLosses: {
        className: cx("text-right", getSortableClass("wins")),
        columnName: "wins",
        onClick: handleColumnClick,
        title: t`Win/Loss`,
        tooltip: t`Wins and Losses for fully closed Positions.`,
        width: 10,
      },
    }),
    [getSortableClass, handleColumnClick]
  );

  const loader = useCallback(() => <TopAccountsSkeleton count={15} />, []);

  return (
    <div>
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"key"} Loader={loader} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
