import { useState } from "react";
import { useIndividualStats } from "../../domain/leaderboard/graph";
import { useChainId } from "../../lib/legacy";
import LeaderboardTable from "./LeaderboardTable";

export function IndividualLeaderboard() {
  const { chainId } = useChainId()
  const [page, setPage] = useState(1)
  const { data, loading, hasNextPage } = useIndividualStats(chainId, page, 10);

  return (
    <>
      <LeaderboardTable loading={loading} stats={data}/>
      <div className="simple-table-pagination">
        <button className="default-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
        <button className="default-btn" onClick={() => setPage(p => p + 1)} disabled={!hasNextPage}>Next</button>
      </div>
    </>
  )
}
