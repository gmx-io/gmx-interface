import Pagination from "components/Pagination/Pagination";
import Tab from "components/Tab/Tab";
import Table from "components/Table";
import TableFilterSearch from "components/TableFilterSearch";
import { t } from "@lingui/macro";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { useLeaderboardContext } from "./Context";
import { AccountFilterPeriod } from "domain/synthetics/leaderboards";

export default function AccountsLeaderboard() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topAccounts, period, setPeriod } = useLeaderboardContext();
  const filteredStats = topAccounts.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const displayedStats = filteredStats.slice((page - 1) * perPage, page * perPage);
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
          options={[AccountFilterPeriod.DAY, AccountFilterPeriod.WEEK, AccountFilterPeriod.MONTH]}
          optionLabels={[t`24 hours`, t`7 days`, t`1 month`]}
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
