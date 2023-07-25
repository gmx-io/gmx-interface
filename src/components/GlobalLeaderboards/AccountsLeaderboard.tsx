import Pagination from "components/Pagination/Pagination";
import Tab from "components/Tab/Tab";
import Table from "components/Table";
import TableFilterSearch from "components/TableFilterSearch";
import { t } from "@lingui/macro";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { useLeaderboardContext } from "./Context";
import { PerfPeriod } from "domain/synthetics/leaderboards";
import { formatAmount } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { BigNumberish } from "ethers";

const formatUsdAmount = (x: BigNumberish, displayDecimals = 2, useCommas = false) => (
  formatAmount(x, USD_DECIMALS, displayDecimals, useCommas)
);

export default function AccountsLeaderboard() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topAccounts, period, setPeriod } = useLeaderboardContext();
  const filteredStats = topAccounts.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const displayedStats = filteredStats.slice((page - 1) * perPage, page * perPage).map(s => ({
    id: s.id,
    account: s.account,
    absPnl: formatUsdAmount(s.absPnl),
    relPnl: formatUsdAmount(s.relPnl),
    sizeLev: `${ formatUsdAmount(s.size) } (${ formatUsdAmount(s.leverage) })`,
    perf: `${ s.wins.toNumber() }/${ s.losses.toNumber() }`,
  }));

  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = ({ target }) => setSearch(target.value);
  const titles = {
    account: {title: "Address"},
    absPnl: {title: "P&L ($)"},
    relPnl: {title: "P&L (%)"},
    sizeLev: {title: "Size (Lev)"},
    perf: {title: "Win/Loss", className: "text-right"},
  };

  return (
    <div>
      <div className="leaderboard-header">
        <TableFilterSearch label={t`Address`} value={search} onInput={handleSearchInput}/>
        <Tab
          enumerate={true}
          enumerateFrom={perPage * page}
          className="Exchange-swap-order-type-tabs"
          type="inline"
          option={period}
          onChange={setPeriod}
          options={[/* PerfPeriod.DAY, PerfPeriod.WEEK, PerfPeriod.MONTH, */PerfPeriod.TOTAL]}
          optionLabels={[/*t`24 hours`, t`7 days`, t`1 month`, */t`Total`]}
        />
      </div>
      <Table
        enumerate={true}
        isLoading={topAccounts.isLoading}
        error={topAccounts.error}
        content={displayedStats}
        titles={titles}
        rowKey={"id"}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage}/>
    </div>
  );
}
