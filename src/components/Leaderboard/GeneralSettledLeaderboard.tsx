import { Trans } from "@lingui/macro";
import Pagination from "components/Pagination/Pagination";
import Tab from "components/Tab/Tab";
import { Period } from "domain/leaderboard/constants";
import { useGeneralSettledLeaderboard } from "domain/leaderboard/useGeneralLeaderboards";
import { useChainId } from "lib/chains";
import { shortenAddress, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";

export default function GeneralSettledLeaderboard() {
  const { chainId } = useChainId();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(Period.day);
  const { data: stats, loading } = useGeneralSettledLeaderboard(chainId, period);
  const perPage = 15;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filteredStats = () => {
    return stats.filter((stat) => stat.account.indexOf(debouncedSearch.toLowerCase()) !== -1);
  };

  const displayedStats = () => {
    return filteredStats().slice((page - 1) * perPage, page * perPage);
  };

  const pageCount = () => {
    return Math.ceil(filteredStats().length / perPage);
  };

  const handleSearchInput = ({ target }) => {
    setSearch(target.value);
  };

  return (
    <div>
      <div className="leaderboard-header">
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Search Address"
            className="leaderboard-search-input text-input input-small"
            value={search}
            onInput={handleSearchInput}
          />
          <FiSearch className="input-logo" />
        </div>
        <Tab
          className="Exchange-swap-order-type-tabs"
          type="inline"
          option={period}
          onChange={(val) => setPeriod(val)}
          options={[Period.day, Period.week, Period.month]}
          optionLabels={["24 hours", "7 days", "1 month"]}
        />
      </div>
      <table className="Exchange-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>
              <Trans>Rank</Trans>
            </th>
            <th>
              <Trans>Address</Trans>
            </th>
            <th>
              <Trans>PnL ($)</Trans>
            </th>
            <th className="text-right">
              <Trans>Win / Loss</Trans>
            </th>
          </tr>
          {loading && (
            <tr>
              <td colSpan={5}>Loading...</td>
            </tr>
          )}
          {!loading && filteredStats().length === 0 && (
            <tr>
              <td colSpan={9}>Not account found</td>
            </tr>
          )}
          {!loading &&
            displayedStats().map((stat) => (
              <tr key={stat.rank}>
                <td>#{stat.rank}</td>
                <td>{shortenAddress(stat.account, 12)}</td>
                <td>{formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true)}</td>
                <td className="text-right">
                  {stat.winCount} / {stat.lossCount}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <Pagination page={page} pageCount={pageCount()} onPageChange={(p) => setPage(p)} />
    </div>
  );
}
