import { useState } from "react";
import { BigNumber } from "ethers";
import classnames from "classnames";
import { t } from "@lingui/macro";
import { formatAmount, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import Pagination from "components/Pagination/Pagination";
import TableFilterSearch from "components/TableFilterSearch";
import Table from "components/Table";
import { useLeaderboardContext } from "./Context";
import { USD_DECIMALS } from "lib/legacy";

export default function TopAccounts() {
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 300);
  const { topAccounts } = useLeaderboardContext();
  const filteredStats = topAccounts.data.filter(a => a.account.indexOf(term.toLowerCase()) >= 0);
  const firstItemIndex = (page - 1) * perPage;
  const displayedStats = filteredStats.slice(firstItemIndex, page * perPage).map(s => ({
    id: s.id,
    account: { value: s.account, isAddress: true },
    absPnl: {
      value: formatUsd(s.absPnl),
      className: classnames(
        s.absPnl.isNegative() ? "negative" : "positive",
        "top-accounts-pnl-abs"
      ),
    },
    relPnl: {
      value: `${ formatAmount(s.relPnl.mul(BigNumber.from(100)), USD_DECIMALS, 2, true) }%`,
      className: classnames(
        s.relPnl.isNegative() ? "negative" : "positive",
        "top-accounts-pnl-rel"
      )
    },
    size: {
      value: formatUsd(s.size),
      className: "top-accounts-size"
    },
    leverage: {
      value: `${formatAmount(s.leverage, USD_DECIMALS, 2)}x`,
      className: "top-accounts-leverage"
    },
    perf: {
      value: `${ s.wins.toNumber() }/${ s.losses.toNumber() }`,
      className: "text-right",
    }
  }));

  const pageCount = Math.ceil(filteredStats.length / perPage);
  const handleSearchInput = ({ target }) => setSearch(target.value);
  const titles = {
    account: { title: t`Address` },
    absPnl: { title: t`PnL ($)`, tooltip: t`Total Realized and Unrealized Profit` },
    relPnl: {
      title: t`PnL (%)`,
      tooltip: (
        t`PnL ($) compared to the Max Collateral used by this Address<br/>` +
        t`Max Collateral is the highest value of [Sum of Collateral of Open Positions -  RPnL]`
      ),
    },
    size: { title: t`Size`, tooltip: t`Average Position Size` },
    leverage: { title: t`Leverage`, tooltip: t`Average Leverage used` },
    perf: { title: t`Win/Loss`, className: "text-right", tooltip: t`Wins and Losses for fully closed Positions` },
  };

  return (
    <div>
      <div className="leaderboard-header">
        <TableFilterSearch label={t`Search Address`} value={search} onInput={handleSearchInput}/>
        {/* <Tab
          className="Exchange-swap-order-type-tabs"
          type="inline"
          option={ period }
          onChange={ setPeriod }
          options={[PerfPeriod.DAY, PerfPeriod.WEEK, PerfPeriod.MONTH, PerfPeriod.TOTAL]}
          optionLabels={[t`24 hours`, t`7 days`, t`1 month`, t`All time`]}
        /> */}
      </div>
      <Table
        enumerate={ true }
        offset={ firstItemIndex }
        isLoading={ topAccounts.isLoading }
        error={ topAccounts.error }
        content={ displayedStats }
        titles={ titles }
        rowKey={ "id" }
      />
      <Pagination page={ page } pageCount={ pageCount } onPageChange={ setPage }/>
    </div>
  );
}
