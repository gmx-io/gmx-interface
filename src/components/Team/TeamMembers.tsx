import { Team } from "../../domain/leaderboard/types"
import { shortenAddress } from "../../lib/legacy"

type Props = {
  team: Team
}

export function TeamMembers({ team }: Props) {
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
            {team.members.map(member => (
              <tr key={member}>
                <td>{shortenAddress(member, 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
