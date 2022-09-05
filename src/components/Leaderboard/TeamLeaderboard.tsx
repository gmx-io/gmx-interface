import { useWeb3React } from "@web3-react/core";
import { useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useCompetitionDetails, useUserTeam } from "../../domain/leaderboard/contracts";
import { useTeamsStats } from "../../domain/leaderboard/graph"
import { getTeamRegistrationUrl, getTeamUrl } from "../../domain/leaderboard/urls";
import { useDebounce } from "../../lib/legacy";
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";
import "./TeamLeaderboard.css";

export function TeamLeaderboard({ competitionIndex }) {
  const { chainId, library, account } = useWeb3React();
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const { data: allStats, loading: allStatsLoading } = useTeamsStats(chainId);
  const { data: details, loading: detailsLoading } = useCompetitionDetails(chainId, library, competitionIndex)
  const { data: userTeam, loading: userTeamLoading } = useUserTeam(chainId, library, competitionIndex, account)

  const page = 1
  const perPage = 15

  if (detailsLoading || allStatsLoading || userTeamLoading) {
    return <Loader/>
  }

  const displayedStats = () => {
    return allStats.filter(stat => {
      return stat.label.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1
    }).slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  }

  const resolveLink = (stat) => {
    return `/leaderboard/team/${competitionIndex}/${stat.id}`;
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
        {details.registrationActive && !userTeam && (
          <Link className="transparent-btn" to={getTeamRegistrationUrl()}>
            <FiPlus/>
            <span className="ml-small">Register your team</span>
          </Link>
        )}
        {userTeam && (
          <Link className="transparent-btn" to={getTeamUrl(account)}>
            View your team
          </Link>
        )}
      </div>
      <LeaderboardTable stats={displayedStats()} resolveLink={resolveLink} isTeamLeaderboard={true} />
    </div>
  )
}
