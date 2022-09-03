import { useWeb3React } from "@web3-react/core";
import { Link } from "react-router-dom";
import { useCompetitionDetails } from "../../domain/leaderboard/contracts";
import { useTeamsStats } from "../../domain/leaderboard/graph"
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";

export function TeamLeaderboard({ competitionIndex }) {
  const { chainId, library } = useWeb3React();
  const { data: stats, loading: teamLoading } = useTeamsStats(chainId);
  const { data: details, loading: detailsLoading } = useCompetitionDetails(chainId, library, competitionIndex)

  const resolveLink = (stat) => {
    return `/leaderboard/team/${competitionIndex}/${stat.id}`;
  }

  if (teamLoading || detailsLoading) {
    return <Loader/>
  }

  return (
    <>
      <div className="Leaderboard-table-actions">
        {details.registrationActive && (
          <Link className="default-btn" to={`/leaderboard/register-team/${competitionIndex}`}>
            Register your team
          </Link>
        )}
      </div>
      <LeaderboardTable stats={stats} resolveLink={resolveLink} />
    </>
  )
}
