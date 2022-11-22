import { useState } from "react";
import Tab from "components/Tab/Tab";
import { Trans } from "@lingui/macro";
import useGlobalLeaderboard from "domain/leaderboard/useGlobalLeaderboard";
import { FiSearch } from "react-icons/fi";
import { useDebounce } from "lib/useDebounce";
import { shortenAddress, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { useWeb3React } from "@web3-react/core";
import Pagination from "components/Pagination/Pagination";
import "../../components/Leaderboard/Leaderboard.css";
import Loader from "components/Common/Loader";

export default function GeneralLeaderboards() {
  const { chainId } = useWeb3React();
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);
  const [activePeriod, setActivePeriod] = useState(0);
  const [search, setSearch] = useState("");
  const { data: stats, loading } = useGlobalLeaderboard(
    chainId,
    activeLeaderboard === 0 ? "settled" : "open",
    activePeriod
  );
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filteredStats = () => {
    return stats.filter((stat) => {
      return debouncedSearch === "" || stat.address.indexOf(debouncedSearch.toLowerCase()) !== -1;
    });
  };

  const pageCount = () => {
    return Math.ceil(stats.length / perPage);
  };

  const displayedStats = () => {
    return filteredStats().slice((page - 1) * perPage, page * perPage);
  };

  const handleSearchInput = ({ target }) => {
    setSearch(target.value.trim());
  };

  return (
    <div>
      <div className="tab-container">
        <Tab
          option={activeLeaderboard}
          onChange={(val) => setActiveLeaderboard(val)}
          options={[0, 1]}
          optionLabels={["Top Settled", "Top Open"]}
        />
      </div>

      <div className="leaderboard-header">
        <Tab
          className="Exchange-swap-order-type-tabs"
          type="inline"
          option={activePeriod}
          options={[0, 1, 2]}
          onChange={(val) => setActivePeriod(val)}
          optionLabels={["24 hours", "1 week", "1 month"]}
        />
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Search Address"
            value={search}
            onInput={handleSearchInput}
            className="leaderboard-search-input text-input input-small"
          />
          <FiSearch className="input-logo" />
        </div>
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
              <td>Loading...</td>
            </tr>
          )}
          {!loading &&
            displayedStats().map((stat) => (
              <tr key={stat.rank}>
                <td>#{stat.rank}</td>
                <td>{shortenAddress(stat.address, 12)}</td>
                <td>{formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true)}</td>
                <td className="text-right">
                  {stat.winCount} / {stat.lossCount}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && <Pagination page={page} pageCount={pageCount()} onPageChange={(page) => setPage(page)} />}
    </div>
  );
}
