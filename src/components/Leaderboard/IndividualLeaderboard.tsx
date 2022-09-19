import { useIndividualStats } from "../../domain/leaderboard/graph";
import { useChainId } from "../../lib/legacy";
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";

export function IndividualLeaderboard() {
  const { chainId } = useChainId()
  const { data, loading } = useIndividualStats(chainId);

  const resolveLink = (stat) => {
    return `/leaderboard/team/${stat.id}`;
  }

  return loading ? <Loader/> : <LeaderboardTable
    stats={data}
    resolveLink={resolveLink}
  />
}
