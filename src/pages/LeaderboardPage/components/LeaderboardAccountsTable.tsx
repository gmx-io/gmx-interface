import { t } from "@lingui/macro";
import cx from "classnames";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Table from "components/Table/Table";
import { TableHeader } from "components/Table/types";
import Tooltip from "components/Tooltip/Tooltip";
import { BigNumber } from "ethers";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import { useCallback, useMemo, useState } from "react";

import { TopAccountsSkeleton } from "components/Skeleton/Skeleton";
import {
  LeaderboardAccount,
  Ranked,
  RemoteData,
  TopAccountsRow,
  formatDelta,
  signedValueClassName,
} from "domain/synthetics/leaderboard";

const constructRow = (s: Ranked<LeaderboardAccount>, i: number): TopAccountsRow => ({
  key: s.account,
  rank: {
    value: () => <span className={cx(s.rank < 3 && `LeaderboardRank-${s.rank + 1}`)}>{s.rank + 1}</span>,
  },
  account: {
    value: (breakpoint) => <AddressView size={24} address={s.account} breakpoint={breakpoint} />,
  },
  absPnl: {
    value: () => (
      <Tooltip
        handle={
          <span className={signedValueClassName(s.totalPnl)}>
            {formatDelta(s.totalPnl, { signed: true, prefix: "$" })}
          </span>
        }
        position={i > 7 ? "right-top" : "right-bottom"}
        className="nowrap"
        renderContent={() => (
          <div>
            <StatsTooltipRow
              label={t`Realized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.totalRealizedPnl)}>
                  {formatDelta(s.totalRealizedPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Unrealized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.totalPendingPnl)}>
                  {formatDelta(s.totalPendingPnl, { signed: true, prefix: "$" })}
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
        position={i > 7 ? "right-top" : "right-bottom"}
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

type TopAccountsProps = {
  accounts: RemoteData<LeaderboardAccount>;
  search: string;
};

export function LeaderboardAccountsTable({ accounts, search }: TopAccountsProps) {
  const perPage = 15;
  const { isLoading, error, data } = accounts;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<keyof LeaderboardAccount>("totalPnl");
  const [direction, setDirection] = useState<number>(1);
  const onColumnClick = useCallback(
    (key: keyof LeaderboardAccount) => () => {
      if (key === "wins") {
        setOrderBy(orderBy === "wins" ? "losses" : "wins");
        setDirection(1);
      } else if (key === orderBy) {
        setDirection((d: number) => -1 * d);
      } else {
        setOrderBy(key);
        setDirection(1);
      }
    },
    [orderBy, setOrderBy, setDirection]
  );

  const accountsHash = (data || []).map((a) => a[orderBy]!.toString()).join(":");
  const rankedAccounts = useMemo(() => {
    if (!data) {
      return [];
    }

    const result = data
      .map((p, i) => ({ ...p, rank: i }))
      .sort((a, b) => {
        const key = orderBy;
        if (BigNumber.isBigNumber(a[key]) && BigNumber.isBigNumber(b[key])) {
          return direction * ((a[key] as BigNumber).gt(b[key] as BigNumber) ? -1 : 1);
        } else {
          return 1;
        }
      });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsHash, orderBy, direction]);

  const term = useDebounce(search, 300);
  const filteredStats = rankedAccounts.filter((a) => a.account.toLowerCase().indexOf(term.toLowerCase()) >= 0);
  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(constructRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const getSortableClass = useCallback(
    (key: keyof LeaderboardAccount) =>
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
      rank: { title: t`Rank`, width: 6 },
      account: {
        title: t`Address`,
        width: (p = "XL") => ({ XL: 40, L: 36, M: 16, S: 10 }[p] || 40),
        tooltip: t`Only Addresses with over $1,000 in traded volume are displayed.`,
        tooltipPosition: "left-bottom",
      },
      absPnl: {
        title: t`PnL ($)`,
        tooltip: t`Total Realized and Unrealized Profit and Loss.`,
        onClick: onColumnClick("totalPnl"),
        width: 12,
        className: getSortableClass("totalPnl"),
      },
      relPnl: {
        title: t`PnL (%)`,
        onClick: onColumnClick("pnlPercentage"),
        width: 10,
        className: getSortableClass("pnlPercentage"),
      },
      averageSize: {
        title: t`Avg. Size`,
        tooltip: t`Average Position Size.`,
        onClick: onColumnClick("averageSize"),
        width: 12,
        className: getSortableClass("averageSize"),
      },
      averageLeverage: {
        title: t`Avg. Lev.`,
        tooltip: t`Average Leverage used.`,
        onClick: onColumnClick("averageLeverage"),
        width: 10,
        className: getSortableClass("averageLeverage"),
      },
      winsLosses: {
        title: t`Win/Loss`,
        tooltip: t`Wins and Losses for fully closed Positions.`,
        onClick: onColumnClick("wins"),
        width: 10,
        className: cx("text-right", getSortableClass("wins")),
      },
    }),
    [getSortableClass, onColumnClick]
  );

  const loader = useCallback(() => <TopAccountsSkeleton count={15} />, []);

  return (
    <div>
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"key"} Loader={loader} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
