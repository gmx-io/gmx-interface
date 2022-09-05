import { useHistory } from "react-router-dom";
import { formatAmount, USD_DECIMALS } from "../../lib/legacy";
import "./LeaderboardTable.css";

export default function LeaderboardTable({ resolveLink, stats, isTeamLeaderboard = false }) {
  const history = useHistory();

  const handleClick = (stat) => {
    if (!resolveLink) {
      return;
    }

    history.push(resolveLink(stat));
  };

  return (
    <table className="simple-table leaderboard-table">
      <tbody>
        <tr className="simple-table-header">
          <th>Rank</th>
          <th>Team</th>
          <th>PnL</th>
        </tr>
        {!stats.length ? (
          <tr>
            <td colSpan={3}>No {isTeamLeaderboard ? "team" : "account"} found...</td>
          </tr>
        ) : (
          <>
            {stats.map((stat) => (
              <tr key={stat.id} onClick={() => handleClick(stat)}>
                <td>#{stat.rank}</td>
                <td>{stat.label}</td>
                <td>${formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true, "...")}</td>
              </tr>
            ))}
          </>
        )}
      </tbody>
    </table>
  );
}
