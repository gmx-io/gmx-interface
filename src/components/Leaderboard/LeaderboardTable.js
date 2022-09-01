import { useHistory } from "react-router-dom";
import { formatAmount, USD_DECIMALS } from "../../lib/legacy";
import "./../../pages/Exchange/Exchange.css";
import "./LeaderboardTable.css";

export default function LeaderboardTable({ resolveLink, stats }) {
  const history = useHistory();

  const handleClick = (stat) => {
    if (!resolveLink) {
      return;
    }

    history.push(resolveLink(stat));
  };

  return (
    <>
      <table className="Leaderboard-table Exchange-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>Rank</th>
            <th>Team</th>
            <th>PnL</th>
          </tr>
          {stats.map((stat) => (
            <tr key={stat.id} onClick={() => handleClick(stat)}>
              <td>#{stat.rank}</td>
              <td>{stat.label}</td>
              <td>${formatAmount(stat.realizedPnl, USD_DECIMALS, 0, true, "...")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
