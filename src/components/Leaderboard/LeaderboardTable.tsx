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

  const Row = ({ stat }) => {
    return <tr key={stat.id}>
      <td>#{stat.rank}</td>
      <td>{stat.label}</td>
      <td>${formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true, "...")}</td>
      <td>
        <button className="simple-table-action" onClick={() => handleClick(stat)}>Details</button>
      </td>
    </tr>
  }

  return (
    <table className="simple-table leaderboard-table">
      <tbody>
        <tr className="simple-table-header">
          <th>Rank</th>
          <th>Team</th>
          <th>PnL</th>
          <th></th>
        </tr>
        {stats.length > 0 && stats.map(stat => <Row stat={stat}/>)}
        {stats.length === 0 && (
          <tr>
            <td colSpan={3}>No {isTeamLeaderboard ? "team" : "account"} found...</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
