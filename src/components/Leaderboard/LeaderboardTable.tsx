import { useHistory } from "react-router-dom";
import { Stats } from "../../domain/leaderboard/types";
import { formatAmount } from "../../lib/legacy";
import "./LeaderboardTable.css";

type Props = {
  resolveLink: (any) => string;
  stats: Stats[];
  isTeamLeaderboard?: boolean;
}

export default function LeaderboardTable({ resolveLink, stats, isTeamLeaderboard = false }: Props) {
  const history = useHistory();

  const handleClick = (stat) => {
    if (resolveLink) {
      history.push(resolveLink(stat));
    }
  };

  const Row = ({ stat }) => {
    return (
      <tr>
        <td>#{stat.rank}</td>
        <td>{stat.label}</td>
        <td>{formatAmount(stat.pnlPercent, 0, 0, true, "...")}%</td>
        <td>
          <button className="simple-table-action" onClick={() => handleClick(stat)}>Details</button>
        </td>
      </tr>
    )
  }

  return (
    <table className="simple-table leaderboard-table">
      <tbody>
        <tr className="simple-table-header">
          <th>Rank</th>
          <th>Team</th>
          <th>P&L</th>
          <th></th>
        </tr>
        {stats.length > 0 && stats.map(stat => <Row key={stat.id} stat={stat}/>)}
        {stats.length === 0 && (
          <tr>
            <td colSpan={4}>No {isTeamLeaderboard ? "team" : "account"} found...</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
