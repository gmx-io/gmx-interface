import { Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { useDebounce } from "lib/useDebounce";
import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { shortenAddress, USD_DECIMALS } from "lib/legacy";
import useIndividualLeaderboard from "domain/leaderboard/useIndividualLeaderboard";
import { formatAmount } from "lib/numbers";
import Pagination from "components/Pagination/Pagination";

export function IndividualLeaderboard() {
  const { chainId } = useChainId();
  const perPage = 10;
  const [page, setPage] = useState(1);
  const { data: stats, loading } = useIndividualLeaderboard(chainId, "total");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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
    setSearch(target.value.trim());
  };

  return (
    <>
      <div className="leaderboard-header">
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Search account"
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
              <Trans>Name</Trans>
            </th>
            <th>
              <Trans>PnL</Trans>
            </th>
            <th>
              <Trans>Open Positions</Trans>
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
          {displayedStats().map((stat) => (
            <tr key={stat.rank}>
              <td>#{stat.rank}</td>
              <td>{shortenAddress(stat.account, 12)}</td>
              <td>{formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true)}</td>
              <td>{stat.openPositions}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="Exchange-list small">
        {loading && <div className="Exchange-empty-positions-list-note App-card">Loading...</div>}
        {!loading && filteredStats().length === 0 && (
          <div className="Exchange-empty-positions-list-note App-card">No account found</div>
        )}
        {displayedStats().map((stat, i) => (
          <div key={stat.rank} className="App-card">
            <div className="App-card-title">
              <span className="Exchange-list-title">
                #{stat.rank} - {shortenAddress(stat.account, 12)}
              </span>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">PnL</div>
                <div>{formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pageCount={pageCount()} onPageChange={(page) => setPage(page)} />
    </>
  );
}
