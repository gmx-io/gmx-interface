import Pagination from "components/Pagination/Pagination";
import Table from "components/Table";
import TableFilterSearch from "components/TableFilterSearch";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { useLeaderboardContext } from "./Context";
import { t } from "@lingui/macro";
import { formatUsd } from "lib/numbers";
import classnames from "classnames";
import { TableCell, TableHeader } from "components/Table/types";
import { AccountOpenPosition } from "domain/synthetics/leaderboards";
import { importImage } from "lib/legacy";
import AddressView from "components/AddressView";

const titles: Record<string, TableHeader> = {
  rank: { title: t`Rank` },
  account: { title: t`Address` },
  unrealizedPnl: { title: t`PnL ($)`, tooltip: t`Total Unrealized Profit` },
  market: { title: t`Position` },
  entryPrice: { title: t`Entry` },
  size: { title: t`Size` },
  liqPrice: { title: t`Liq. Price` },
};

const parseRow = (start: number) => (p: AccountOpenPosition, i: number): Record<keyof typeof titles, TableCell> => ({
  id: p.key,
  rank: start + i + 1,
  account: { value: "", render: () => <AddressView address={ p.account } size={ 24 }/> },
  unrealizedPnl: {
    value: formatUsd(p.unrealizedPnlAfterFees) || "",
    className: classnames(
      p.unrealizedPnlAfterFees.isNegative() ? "negative" : "positive",
      "leaderboard-pnl-abs"
    ),
  },
  market: {
    value: "",
    render: () => {
      const { symbol } = p.marketInfo.indexToken;
      const { name } = p.marketInfo;

      return (
        <div className="leaderboard-position">
          <img src={ importImage(`ic_${ symbol.toLocaleLowerCase() }_40.svg`) } alt={ name } width="24"/>
          <span>{ symbol }</span>
          <span className={ p.isLong ? "positive" : "negative" }>{ p.isLong ? t`Long` : t`Short` }</span>
        </div>
      );
    }
  },
  entryPrice: { value: formatUsd(p.entryPrice) || "" },
  size: { value: formatUsd(p.sizeInUsd) || "" },
  liqPrice: { value: formatUsd(p.liquidationPrice) || "" },
});

export default function TopPositions() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topPositions } = useLeaderboardContext();
  const { isLoading, error } = topPositions;
  const filteredStats = topPositions.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const indexFrom = (page - 1) * perPage;
  const rows = filteredStats.slice(indexFrom, indexFrom + perPage).map(parseRow(indexFrom));
  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = ({ target }) => setSearch(target.value);

  return (
    <div>
      <div className="leaderboard-header">
        <TableFilterSearch label={t`Search Address`} value={search} onInput={handleSearchInput}/>
      </div>
      <Table isLoading={isLoading} error={error} content={rows} titles={titles} rowKey={"id"}/>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage}/>
    </div>
  );
}
