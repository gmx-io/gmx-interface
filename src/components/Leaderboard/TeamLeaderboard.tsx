import { useWeb3React } from "@web3-react/core";
import { useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useMemberTeam } from "../../domain/leaderboard/contracts";
import { useCompetition, useTeam, useTeamsStats } from "../../domain/leaderboard/graph"
import { getTeamRegistrationUrl, getTeamUrl } from "../../domain/leaderboard/urls";
import { useChainId, useDebounce } from "../../lib/legacy";
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";
import "./TeamLeaderboard.css";

export function TeamLeaderboard({ competitionIndex }) {
  const { chainId } = useChainId()
  const { library, account } = useWeb3React();
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const { data: allStats, loading: allStatsLoading } = useTeamsStats(chainId, competitionIndex);
  const { data: details, loading: detailsLoading } = useCompetition(chainId, competitionIndex)
  const { exists: isLeader, loading: teamLoading } = useTeam(chainId, library, competitionIndex, account)
  const { data: userTeam, hasTeam, loading: memberTeamLoading } = useMemberTeam(chainId, library, competitionIndex, account)

  const page = 1
  const perPage = 15

  if (allStatsLoading) {
    return <Loader/>
  }

  const displayedStats = () => {
    return allStats.filter(stat => {
      return stat.label.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1
    }).slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  }

  const handleSearchInput = ({ target }) => {
    setSearch(target.value)
  }

  return (
    <div>
      <div className="team-leaderboard-header">
        <div className="input-wrapper w-1/4">
          <input type="text" placeholder="Search for a team..." className="text-input input-small" value={search} onInput={handleSearchInput}/>
          <FiSearch className="input-logo"/>
        </div>
        {(detailsLoading || teamLoading || memberTeamLoading || !account) ? "" : (
          <>
            {details.registrationActive && !isLeader && !hasTeam && (
              <Link className="transparent-btn" to={getTeamRegistrationUrl()}>
                <FiPlus/>
                <span className="ml-small">Register your team</span>
              </Link>
            )}
            {(isLeader || hasTeam) && (
              <Link className="transparent-btn" to={getTeamUrl(isLeader ? account : userTeam)}>
                View your team
              </Link>
            )}
          </>
        )}
      </div>
      <LeaderboardTable stats={displayedStats()} resolveLink={(stat) => getTeamUrl(stat.id)} isTeamLeaderboard={true} />
    </div>
  )
}
