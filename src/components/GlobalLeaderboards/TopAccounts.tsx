import { useState, useCallback, useMemo } from "react";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import cx from "classnames";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import Tooltip from "components/Tooltip/Tooltip";
import Table from "components/Table/Table";
import { TableHeader } from "components/Table/types";
import { useDebounce } from "lib/useDebounce";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import {
  Ranked,
  formatDelta,
  TopAccountsRow,
  signedValueClassName,
  LiveAccountPerformance,
  RemoteData,
} from "domain/synthetics/leaderboards";

const parseRow = (s: Ranked<LiveAccountPerformance>, i: number): TopAccountsRow => ({
  key: s.id,
  rank: {
    value: () => <span className={cx(s.rank < 3 && `LeaderboardRank-${s.rank + 1}`)}>{s.rank + 1}</span>,
  },
  account: {
    value: (breakpoint) => (
      <Tooltip
        position={i > 7 ? "right-top" : "right-bottom"}
        handle={
          <AddressView size={24} address={s.account} breakpoint={breakpoint} lengths={{ S: 9, M: 13, L: 24, XL: 42 }} />
        }
        renderContent={() => <div>{t`Only Addresses with over $1,000 in traded volume are displayed.`}</div>}
      />
    ),
  },
  absProfit: {
    value: () => (
      <Tooltip
        handle={
          <span className={signedValueClassName(s.absProfit)}>
            {formatDelta(s.absProfit, { signed: true, prefix: "$" })}
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
                <span className={signedValueClassName(s.realizedPnl)}>
                  {formatDelta(s.realizedPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Unrealized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.unrealizedPnl)}>
                  {formatDelta(s.unrealizedPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
          </div>
        )}
      />
    ),
  },
  relProfit: {
    value: () => (
      <Tooltip
        handle={
          <span className={signedValueClassName(s.relProfit)}>
            {formatDelta(s.relProfit.mul(BigNumber.from(100)), { signed: true, postfix: "%" })}
          </span>
        }
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
    value: `${formatAmount(s.averageLeverage, USD_DECIMALS, 2)}x`,
    className: "leaderboard-leverage",
  },
  winsLosses: {
    value: `${s.wins.toNumber()}/${s.losses.toNumber()}`,
    className: "text-right",
  },
});

type TopAccountsProps = {
  accounts: RemoteData<LiveAccountPerformance>;
  search: string;
};

export default function TopAccounts({ accounts, search }: TopAccountsProps) {
  const perPage = 15;
  const { isLoading, error, data } = accounts;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<keyof LiveAccountPerformance>("absProfit");
  const [direction, setDirection] = useState<number>(1);
  const onColumnClick = useCallback(
    (key: keyof LiveAccountPerformance) => () => {
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
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const getSortableClass = (key: keyof LiveAccountPerformance) =>
    cx(
      orderBy === key || (key === "wins" && orderBy === "losses")
        ? direction > 0
          ? "sorted-asc"
          : "sorted-desc"
        : "sortable"
    );

  const titles: { [key in keyof TopAccountsRow]?: TableHeader } = {
    rank: { title: t`Rank`, width: 6 },
    account: { title: t`Address`, width: (p = "XL") => ({ XL: 40, L: 36, M: 16, S: 10 }[p] || 40) },
    absProfit: {
      title: t`PnL ($)`,
      tooltip: t`Total Realized and Unrealized Profit and Loss.`,
      onClick: onColumnClick("absProfit"),
      width: 12,
      className: getSortableClass("absProfit"),
    },
    relProfit: {
      title: t`PnL (%)`,
      onClick: onColumnClick("relProfit"),
      width: 10,
      className: getSortableClass("relProfit"),
      tooltip: () => (
        <div>
          <p>{t`PnL ($) compared to the Max Collateral used by this Address.`}</p>
          <p>
            {t`Max Collateral is the highest value of`}{" "}
            <span className="formula">{t`[Sum of Collateral of Open Positions -  RPnL]`}</span>
            {"."}
          </p>
        </div>
      ),
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
  };

  return (
    <div>
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"key"} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
