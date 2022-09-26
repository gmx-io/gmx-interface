import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useMemberTeam } from "../../domain/leaderboard/contracts";
import { useCompetition, useTeam, useTeamsStats } from "../../domain/leaderboard/graph"
import { getTeamRegistrationUrl, getTeamUrl } from "../../domain/leaderboard/urls";
import { useChainId, useDebounce } from "../../lib/legacy";
import LeaderboardTable from "./LeaderboardTable";
import "./TeamLeaderboard.css";

export function TeamLeaderboard({ competitionIndex }) {
  const { chainId } = useChainId()
  const { library, account } = useWeb3React();
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const perPage = 10
  const { data: allStats, loading: allStatsLoading } = useTeamsStats(chainId, competitionIndex);
  const { data: competition, loading: competitionLoading } = useCompetition(chainId, competitionIndex)
  const { exists: isLeader, loading: teamLoading } = useTeam(chainId, library, competitionIndex, account)
  const { data: userTeam, hasTeam, loading: memberTeamLoading } = useMemberTeam(chainId, library, competitionIndex, account)

  const filteredStats = () => {
    return allStats.filter(stat => {
      return stat.label.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1
          || stat.id.toLowerCase().indexOf(debouncedSearch.toLowerCase()) !== -1
    })
  }

  const displayedStats = () => {
    return filteredStats().slice((page - 1) * perPage, (page - 1) * perPage + perPage)
  }

  const handleSearchInput = ({ target }) => {
    setSearch(target.value)
  }

  const pageCount = () => {
    return Math.ceil(filteredStats().length / perPage)
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  return (
    <div>
      <div className="simple-table-top-header">
        <div className="input-wrapper w-1/4">
          <input type="text" placeholder="Search for a team..." className="leaderboard-search-input text-input input-small" value={search} onInput={handleSearchInput}/>
          <FiSearch className="input-logo"/>
        </div>
        {(competitionLoading || teamLoading || memberTeamLoading || !account) ? "" : (
          <>
            {competition.registrationActive && !isLeader && !hasTeam && (
              <Link className="icon-btn transparent-btn" to={getTeamRegistrationUrl()}>
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
      <LeaderboardTable loading={allStatsLoading} stats={displayedStats()} resolveLink={(stat) => getTeamUrl(stat.id)} isTeamLeaderboard={true} />
      <div className="simple-table-pagination">
        <button className="default-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
        <button className="default-btn" onClick={() => setPage(p => p + 1)} disabled={page >= pageCount()}>Next</button>
      </div>
    </div>
  )
}
