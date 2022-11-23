import { Trans } from "@lingui/macro";
import Pagination from "components/Pagination/Pagination";
import { useGeneralOpenLeaderboard } from "domain/leaderboard/useGeneralLeaderboards";
import { useChainId } from "lib/chains";
import { shortenAddress, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";

export default function GeneralOpenLeaderboard() {
  const { chainId } = useChainId();
  const { data: stats, loading } = useGeneralOpenLeaderboard(chainId, 0);
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filteredStats = () => {
    return stats.filter((stat) => stat.address.indexOf(debouncedSearch.toLowerCase()) !== -1);
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
            <th>
              <Trans>Token</Trans>
            </th>
            <th>
              <Trans>Entry Price ($)</Trans>
            </th>
            <th>
              <Trans>Size ($)</Trans>
            </th>
            <th className="text-right">
              <Trans>Liq. Price ($)</Trans>
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
              <td>{shortenAddress(stat.address, 12)}</td>
              <td>{formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true)}</td>
              <td>
                {stat.isLong ? "Long" : "Short"} {shortenAddress(stat.token, 12)}
              </td>
              <td>{formatAmount(stat.averagePrice, USD_DECIMALS, 2, true)}</td>
              <td>{formatAmount(stat.sizeDelta, USD_DECIMALS, 0, true)}</td>
              <td className="text-right">{formatAmount(stat.liquidationPrice, USD_DECIMALS, 2, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageCount={pageCount()} onPageChange={(p) => setPage(p)} />
    </div>
  );
}
