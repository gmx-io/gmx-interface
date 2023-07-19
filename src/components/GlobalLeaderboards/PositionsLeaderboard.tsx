import Pagination from "components/Pagination/Pagination";
import Table from "components/Table";
import TableFilterSearch from "components/TableFilterSearch";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { useLeaderboardContext } from "./Context";
import { t } from "@lingui/macro";

export default function PositionsLeaderboard() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topPositions } = useLeaderboardContext();
  const filteredStats = topPositions.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const displayedStats = filteredStats.slice((page - 1) * perPage, page * perPage).map(s => ({
    id: s.id,
    account: s.account,
    urealizedPnl: s.unrealizedPnl.toString(),
    market: `${ s.market } ${ s.isLong ? "Long" : "Short" }`,
    entryPrice: s.entryPrice.toString(),
    sizeLiqPrice: `${ s.sizeInUsd.toString() } (${ s.liqPrice.toString() })`,
  }));

  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = ({ target }) => setSearch(target.value);
  const titles = {
    account: {title: "Address"},
    unrealizedPnl: {title: "P&L ($)"},
    market: {title: "Token (L/S)"},
    entryPrice: {title: "Entry"},
    sizeLiqPrice: {title: "Size (Liq)"},
  };

  return (
    <div>
      <div className="leaderboard-header">
        <TableFilterSearch label={t`Address`} value={search} onInput={handleSearchInput}/>
      </div>
      <Table
        enumerate={true}
        enumerateFrom={perPage * page}
        isLoading={topPositions.isLoading}
        error={topPositions.error}
        content={displayedStats}
        titles={titles}
        rowKey={"id"}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage}/>
    </div>
  );
}
