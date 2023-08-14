import Pagination from "components/Pagination/Pagination";
import Table from "components/Table";
import TableFilterSearch from "components/TableFilterSearch";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { useLeaderboardContext } from "./Context";
import { t } from "@lingui/macro";
import { formatUsd } from "lib/numbers";

export default function PositionsLeaderboard() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topPositions } = useLeaderboardContext();
  const filteredStats = topPositions.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const firstItemIndex = (page - 1) * perPage;
  const displayedStats = filteredStats.slice(firstItemIndex, page * perPage).map(p => ({
    id: p.id,
    account: p.account,
    unrealizedPnl: formatUsd(p.info.pnlAfterFees),
    market: `${ p.info.marketInfo.name } ${ p.isLong ? t`Long` : t`Short` }`,
    entryPrice: formatUsd(p.info.entryPrice),
    sizeLiqPrice: `${
      formatUsd(p.info.sizeInUsd)
    } (${
      formatUsd(p.info.liquidationPrice)
    })`,
  }));

  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = ({ target }) => setSearch(target.value);
  const titles = {
    account: {title: t`Address`},
    unrealizedPnl: {title: t`P&L ($)`},
    market: {title: t`Token (L/S)`},
    entryPrice: {title: t`Entry`},
    sizeLiqPrice: {title: t`Size (Liq)`},
  };

  return (
    <div>
      <div className="leaderboard-header">
        <TableFilterSearch label={t`Address`} value={search} onInput={handleSearchInput}/>
      </div>
      <Table
        enumerate={true}
        offset={firstItemIndex}
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
