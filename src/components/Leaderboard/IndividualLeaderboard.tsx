import { useIndividualStats } from "../../domain/leaderboard/graph";
import { useChainId } from "../../lib/legacy";
import LeaderboardTable from "./LeaderboardTable";

export function IndividualLeaderboard() {
  const { chainId } = useChainId()
  const { data, loading } = useIndividualStats(chainId);

  return <LeaderboardTable loading={loading} stats={data}/>
}
