import { Trans } from "@lingui/macro";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useIndividuals } from "../../domain/leaderboard/graph";
import { shortenAddress, useChainId, useDebounce } from "../../lib/legacy";

export function IndividualLeaderboard() {
  const { chainId } = useChainId()
  const perPage = 10
  const [page, setPage] = useState(1)
  const { data: accounts, loading } = useIndividuals(chainId);
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const filteredAccount = () => {
    return accounts.filter(account =>
      account.id.indexOf(debouncedSearch.toLowerCase()) !== -1
    )
  }

  const displayedAccounts = () => {
    return filteredAccount().slice((page - 1) * perPage, page * perPage)
  }

  const pageCount = () => {
    return Math.ceil(filteredAccount().length / perPage)
  }

  const handleSearchInput = ({ target }) => {
    setSearch(target.value.trim())
  }

  return (
    <>
      <div className="leaderboard-header">
        <div className="input-wrapper">
          <input type="text" placeholder="Search account" value={search} onInput={handleSearchInput} className="leaderboard-search-input text-input input-small"/>
          <FiSearch className="input-logo"/>
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
          {!loading && filteredAccount().length === 0 && (
            <tr>
              <td colSpan={9}>Not account found</td>
            </tr>
          )}
          {displayedAccounts().map(account => (
            <tr key={account.id}>
              <td>#1</td>
              <td>{account.ens ?? account.id}</td>
              <td>-$1,425 (-5.8%)</td>
              <td>{account.positions.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="Exchange-list small">
        {loading && <div className="Exchange-empty-positions-list-note App-card">Loading...</div>}
        {!loading && filteredAccount().length === 0 && <div className="Exchange-empty-positions-list-note App-card">No account found</div>}
        {displayedAccounts().map((account, i) => (
          <div key={account.id} className="App-card">
            <div className="App-card-title">
              <span className="Exchange-list-title">
                #{i+1} - {account.ens ?? shortenAddress(account.id, 12)}
              </span>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  PnL
                </div>
                <div>{account.pnl}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {pageCount() > 1 && (
        <div className="leaderboard-table-pagination">
          <button className="transparent-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <button className="transparent-btn" onClick={() => setPage(p => p + 1)} disabled={page >= pageCount()}>Next</button>
        </div>
      )}
    </>
  )
}
