import { useWeb3React } from "@web3-react/core";
import { useIndividualStats } from "../../domain/leaderboard/graph";
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";

export function IndividualLeaderboard() {
  const { chainId } = useWeb3React();
  const { data, loading } = useIndividualStats(chainId);

  const resolveLink = (stat) => {
    return `/leaderboard/team/${stat.id}`;
  }

  return loading ? <Loader/> : <LeaderboardTable
    stats={data}
    resolveLink={resolveLink}
  />
}
