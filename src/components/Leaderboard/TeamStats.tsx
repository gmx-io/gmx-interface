import { formatAmount, USD_DECIMALS } from "../../lib/legacy";

export default function TeamStats({ team }) {
  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">Competition Rank</h3>
            <div className="data">#{team.rank}</div>
          </div>
        </div>
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">Realized PnL</h3>
            <div className="data">
              ${formatAmount(team.realizedPnl, USD_DECIMALS, 0, true)}
            </div>
          </div>
        </div>
        <div className="info-card">
          <div className="card-details">
            <h3 className="label">Total members</h3>
            <div className="data">{team.members.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
