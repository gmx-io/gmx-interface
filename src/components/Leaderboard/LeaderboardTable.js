import { useHistory } from "react-router-dom";
import { formatAmount, USD_DECIMALS } from "../../Helpers";
import "./../../views/Exchange/Exchange.css";

export default function LeaderboardTable({ resolveLink, stats }) {
  const history = useHistory();

  const handleClick = (stat) => {
    if (!resolveLink) {
      return;
    }

    history.push(resolveLink(stat));
  };

  return (
    <table className="Exchange-list large App-box">
      <tbody>
        <tr className="Exchange-list-header">
          <th>Rank</th>
          <th>Team</th>
          <th>PnL</th>
        </tr>
        {stats.map((stat) => (
          <tr key={stat.label} onClick={() => handleClick(stat)}>
            <td>#{stat.rank}</td>
            <td>{stat.label}</td>
            <td>${formatAmount(stat.pnl, USD_DECIMALS, 0, true, "...")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
