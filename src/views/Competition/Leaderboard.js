import { formatAmount, USD_DECIMALS } from "../../Helpers";
import Loader from "../../components/Common/Loader"
import "./Leaderboard.css"
import { useLeaderboardStats } from "../../Api/competition";
import { Link } from "react-router-dom";
import { useWeb3React } from "@web3-react/core";

export default function Leaderboard() {
  const { chainId, library } = useWeb3React()

  const stats = useLeaderboardStats(chainId, library)

  const Row = ({ team }) => (
    <tr key={team.leader}>
      <td>
        <Link to={"/competition/"+team.leader}>
          {team.name}
        </Link>
      </td>
      <td>{(team.pnl.gt(0) ? "+" : "-") + formatAmount(team.pnl, USD_DECIMALS, 0, true)}</td>
    </tr>
  )

  return (
    <>
      {!stats && <Loader />}
      {stats && (
        <div className="App-card">
          <table className="Leaderboard-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>PnL</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(team => <Row team={team}/>)}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
