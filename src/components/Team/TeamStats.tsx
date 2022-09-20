import { Competition, Team } from "../../domain/leaderboard/types";
import { formatAmount, USD_DECIMALS } from "../../lib/legacy";

type Props = {
  team: Team,
  competition: Competition,
}

export default function TeamStats({ team, competition }: Props) {
  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">Competition Rank</h3>
            <div className="data">{competition.active ? `#${team.rank}` : "..."}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">P&L</h3>
            <div className="data">
              {competition.active ? (
                <>
                  <span>${formatAmount(team.pnl, USD_DECIMALS, 0, true)}</span>
                </>
              ) : "..."}
            </div>
          </div>
        </div>
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">Total members</h3>
            <div className="data">
              <span>{team.members.length}</span>
              {competition.registrationActive ? <span> / {competition.maxTeamSize}</span> : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
