import { useWeb3React } from "@web3-react/core"
import { useState } from "react"
import { removeMember } from "../../domain/leaderboard/contracts"
import { useTeamMembersStats } from "../../domain/leaderboard/graph"
import { Team } from "../../domain/leaderboard/types"
import { shortenAddress } from "../../lib/legacy"

type Props = {
  team: Team;
  pendingTxns: any;
  setPendingTxns: any;
}

export function TeamMembers({ team, pendingTxns, setPendingTxns }: Props) {
  const { chainId, library } = useWeb3React()
  const [page, setPage] = useState(1)
  const perPage = 10
  const { data: members, loading } = useTeamMembersStats(chainId, library, team.competitionIndex, team.leaderAddress, page, perPage)
  const [isRemoving, setIsRemoving] = useState(false)

  const pageCount = () => {
    return Math.ceil(members.length / perPage)
  }

  const handleRemoveClick = async (member) => {
    setIsRemoving(true)

    try {
      const tx = await removeMember(chainId, library, team.competitionIndex, team.leaderAddress, member.address, {
        successMsg: "User removed!",
        sentMsg: "User removal submitted!",
        failMsg: "User removal failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()
    } catch (err) {
      console.error(err)
    } finally {
      setIsRemoving(false)
    }
  }

  const Row = ({ member }) => {
    return (
      <tr key={member.address}>
        <td>{shortenAddress(member.address, 12)}</td>
        <td>
          {member.address !== team.leaderAddress && (
            <button className="simple-table-action" disabled={isRemoving} onClick={() => handleRemoveClick(member)}>Remove</button>
          )}
        </td>
      </tr>
    )
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
            {!loading && members.map(member => <Row member={member}/>)}
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
