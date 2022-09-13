import { useWeb3React } from "@web3-react/core"
import { useState } from "react"
import { useTeamMembersStats } from "../../domain/leaderboard/graph"
import { Team } from "../../domain/leaderboard/types"
import { shortenAddress } from "../../lib/legacy"

type Props = {
  team: Team
}

export function TeamMembers({ team }: Props) {
  const { chainId } = useWeb3React()
  const [page, setPage] = useState(1)
  const perPage = 10
  const { data, loading } = useTeamMembersStats(chainId, team.competitionIndex, page, perPage)

  const pageCount = () => {
    return Math.ceil(data.length / perPage)
  }

  return (
    <>
      <div className="Tab-title-section">
        <div className="Page-title">
          Members
        </div>
        <div className="Page-description">Platform and GLP index tokens.</div>
      </div>
      <div>
        <table className="simple-table">
          <tbody>
            <tr className="simple-table-header">
              <th>Address</th>
            </tr>
            {loading && (
              <tr>
                <td>Loading stats...</td>
              </tr>
            )}
            {!loading && data.map(member => (
              <tr key={member.address}>
                <td>{shortenAddress(member.address, 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount() > 1 && (
        <div className="simple-table-pagination">
          <button className="default-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
          <button className="default-btn" onClick={() => setPage(p => p + 1)} disabled={page === pageCount()}>Next</button>
        </div>
      )}
    </>
  )
}
