import { useWeb3React } from "@web3-react/core";
import { useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useCompetitionDetails } from "../../domain/leaderboard/contracts";
import { useTeamsStats } from "../../domain/leaderboard/graph"
import { useDebounce } from "../../lib/legacy";
import Loader from "../Common/Loader";
import LeaderboardTable from "./LeaderboardTable";
import "./TeamLeaderboard.css";

export function TeamLeaderboard({ competitionIndex }) {
  const { chainId, library } = useWeb3React();
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const { data: allStats, loading: teamLoading } = useTeamsStats(chainId);
  const { data: details, loading: detailsLoading } = useCompetitionDetails(chainId, library, competitionIndex)

  const perPage = 5

  const displayedStats = () => {
    return allStats.filter(stat => {
      return stat.label.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1
    }).slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  }

  const resolveLink = (stat) => {
    return `/leaderboard/team/${competitionIndex}/${stat.id}`;
  }

  if (detailsLoading || teamLoading) {
    return <Loader/>
  }

  const handleSearchInput = ({ target }) => {
    setSearch(target.value)
  }

  return (
    <div>
      <div className="team-leaderboard-header">
        <div className="input-wrapper w-1/4">
          <input type="search" placeholder="Search for a team..." className="text-input input-small" value={search} onInput={handleSearchInput}/>
          <FiSearch className="input-logo"/>
        </div>
        {details.registrationActive && (
          <Link className="transparent-btn" to={`/leaderboard/register-team/${competitionIndex}`}>
            <FiPlus/>
            <span className="ml-small">Register your team</span>
          </Link>
        )}
      </div>
      <LeaderboardTable stats={displayedStats()} resolveLink={resolveLink} isTeamLeaderboard={true} />
    </div>
  )
}
