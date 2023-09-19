import { useState, useCallback, useMemo } from "react";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import cx from "classnames";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import SearchInput from "components/SearchInput/SearchInput";
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
} from "domain/synthetics/leaderboards";

import { useLeaderboardContext } from "./Context";

const parseRow = (s: Ranked<LiveAccountPerformance>, i: number): TopAccountsRow => ({
  key: s.id,
  rank: {
    value: () => (
      <span className={cx(s.rank < 3 && `LeaderboardRank-${s.rank + 1}`)}>{s.rank + 1}</span>
    ),
  },
  account: {
    value: (breakpoint) =>
      s.account && (
        <AddressView
          size={24}
          address={s.account}
          breakpoint={breakpoint}
          maxLength={breakpoint === "S" ? 9 : undefined}
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
        position={ i > 7 ? "right-top" : "right-bottom" }
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
        position={ i > 7 ? "right-top" : "right-bottom" }
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

export default function TopAccounts() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { accounts: { isLoading, error, data } } = useLeaderboardContext();
  const [orderBy, setOrderBy] = useState<keyof LiveAccountPerformance>("absProfit");
  const [direction, setDirection] = useState<number>(1);
  const topAccountsHeaderClick = useCallback((key: keyof LiveAccountPerformance) => () => {
    if (key === "wins") {
      setOrderBy(orderBy === "wins" ? "losses" : "wins");
      setDirection(1);
    } else if (key === orderBy) {
      setDirection((d: number) => -1 * d);
    } else {
      setOrderBy(key);
      setDirection(1);
    }
  }, [orderBy, setOrderBy, setDirection]);

  const accountsHash = (data || []).map(a => a[orderBy]!.toString()).join(":");
  const accounts = useMemo(() => {
    if (!data) {
      return [];
    }

    const result = data.map((p, i) => ({ ...p, rank: i })).sort((a, b) => {
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

  const filteredStats = accounts.filter((a) => a.account.toLowerCase().indexOf(term.toLowerCase()) >= 0);
  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = (e) => setSearch(e.target.value.trim());
  const getSortableClass = (key: keyof LiveAccountPerformance) => cx(
    (orderBy === key || (key === "wins" && orderBy === "losses"))
    ? (direction > 0 ? "sorted-asc" : "sorted-desc")
    : "sortable"
  )

  const titles: { [key in keyof TopAccountsRow]?: TableHeader } = {
    rank: { title: t`Rank`, width: 5 },
    account: { title: t`Address`, width: 40 },
    absProfit: {
      title: t`PnL ($)`,
      tooltip: t`Total Realized and Unrealized Profit and Loss.`,
      onClick: topAccountsHeaderClick("absProfit"),
      width: 11,
      className: getSortableClass("absProfit"),
    },
    relProfit: {
      title: t`PnL (%)`,
      onClick: topAccountsHeaderClick("relProfit"),
      width: 11,
      className: getSortableClass("relProfit"),
      tooltip: () => (
        <div>
          <p>{t`PnL ($) compared to the Max Collateral used by this Address.`}</p>
          <p>
            {t`Max Collateral is the highest value of`}
            {" "}
            <span className="formula">{t`[Sum of Collateral of Open Positions -  RPnL]`}</span>
            {"."}
          </p>
        </div>
      ),
    },
    averageSize: {
      title: t`Avg. Size`,
      tooltip: t`Average Position Size.`,
      onClick: topAccountsHeaderClick("averageSize"),
      width: 11,
      className: getSortableClass("averageSize"),
    },
    averageLeverage: {
      title: t`Avg. Lev.`,
      tooltip: t`Average Leverage used.`,
      onClick: topAccountsHeaderClick("averageLeverage"),
      width: 11,
      className: getSortableClass("averageLeverage"),
    },
    winsLosses: {
      title: t`Win/Loss`,
      tooltip: t`Wins and Losses for fully closed Positions.`,
      onClick: topAccountsHeaderClick("wins"),
      width: 11,
      className: cx("text-right", getSortableClass("wins")),
    },
  };

  return (
    <div>
      <div className="LeaderboardHeader">
        <SearchInput
          placeholder={t`Search Address`}
          value={search}
          onInput={handleSearchInput}
          setValue={() => {}}
          onKeyDown={() => {}}
          className="LeaderboardSearch"
          autoFocus={false}
        />
      </div>
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"key"} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
