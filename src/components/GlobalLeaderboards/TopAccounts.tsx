import { useState } from "react";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import { formatAmount, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import Pagination from "components/Pagination/Pagination";
import SearchInput from "components/SearchInput/SearchInput";
import Table from "components/Table/Table";
import { useLeaderboardContext } from "./Context";
import { USD_DECIMALS } from "lib/legacy";
import { TableCell, TableHeader } from "components/Table/types";
import { TopAccountsRow, formatDelta, signedValueClassName } from "domain/synthetics/leaderboards";
import AddressView from "components/AddressView/AddressView";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

const parseRow = (s: TopAccountsRow): Record<string, TableCell> => ({
  id: s.id,
  rank: s.rank + 1,
  account: {
    value: (breakpoint) =>
      s.account && (
        <AddressView
          address={s.account}
          ensName={s.ensName}
          avatarUrl={s.avatarUrl}
          breakpoint={breakpoint}
          size={24}
          maxLength={11}
        />
      ),
  },
  absPnl: {
    value: () => (
      <Tooltip
        handle={
          <span className={signedValueClassName(s.absPnl)}>
            {formatDelta(s.absPnl, { signed: true, prefix: "$" })}
          </span>
        }
        position="center-top"
        className="nowrap"
        renderContent={() => (
          <div>
            <StatsTooltipRow
              label={t`Realized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.rPnl)}>
                  {formatDelta(s.rPnl, { signed: true, prefix: "$" })}
                </span>
              }
            />
            <StatsTooltipRow
              label={t`Unrealized PnL`}
              showDollar={false}
              value={
                <span className={signedValueClassName(s.uPnl)}>
                  {formatDelta(s.uPnl, { signed: true, prefix: "$" })}
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
        handle={
          <span className={signedValueClassName(s.relPnl)}>
            {formatDelta(s.relPnl.mul(BigNumber.from(100)), { signed: true, postfix: "%" })}
          </span>
        }
        position="center-top"
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
  size: {
    value: formatUsd(s.size) || "",
    className: "leaderboard-size",
  },
  leverage: {
    value: `${formatAmount(s.leverage, USD_DECIMALS, 2)}x`,
    className: "leaderboard-leverage",
  },
  perf: {
    value: `${s.wins.toNumber()}/${s.losses.toNumber()}`,
    className: "text-right",
  },
});

export default function TopAccounts() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topAccounts, topAccountsHeaderClick } = useLeaderboardContext();
  const { isLoading, error } = topAccounts;
  const filteredStats = topAccounts.data.filter((a) => a.account.toLowerCase().indexOf(term.toLowerCase()) >= 0);
  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow);
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = (e) => setSearch(e.target.value.trim());
  const titles: Record<string, TableHeader> = {
    rank: { title: t`Rank` },
    account: { title: t`Address` },
    absPnl: {
      title: t`PnL ($)`,
      tooltip: t`Total Realized and Unrealized Profit.`,
      onClick: topAccountsHeaderClick("absPnl"),
    },
    relPnl: {
      title: t`PnL (%)`,
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
      onClick: topAccountsHeaderClick("relPnl"),
    },
    size: {
      title: t`Avg. Size`,
      tooltip: t`Average Position Size.`,
      onClick: topAccountsHeaderClick("size"),
    },
    leverage: {
      title: t`Avg. Lev.`,
      tooltip: t`Average Leverage used.`,
      onClick: topAccountsHeaderClick("leverage"),
    },
    perf: {
      title: t`Win/Loss`,
      className: "text-right",
      tooltip: t`Wins and Losses for fully closed Positions.`,
      onClick: topAccountsHeaderClick("wins"),
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
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"id"} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
