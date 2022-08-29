import { useWeb3React } from "@web3-react/core";
import { useCompetitionTimes, useTeamLeaderboardStats } from "../../Api/leaderboard";
import SEO from "../../components/Common/SEO";
import LeaderboardTable from "../../components/Leaderboard/LeaderboardTable";
import { getPageTitle } from "../../Helpers";
import Loader from "../../components/Common/Loader";
import { Link } from "react-router-dom";
import "./Leaderboard.css";

export default function Leaderboard() {
  const { chainId, library } = useWeb3React();
  const competitionTimes = useCompetitionTimes(chainId, library);
  const teamStats = useTeamLeaderboardStats(chainId, library);

  const resolveTeamLink = (stat) => {
    return `/leaderboard/teams/${stat.id}`;
  };

  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">Leaderboard</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
              referral program details.
            </div>
          </div>
        </div>
        <div className="Leaderboard-table-actions">
          {competitionTimes && competitionTimes.registrationActive && (
            <Link className="default-btn" to="/leaderboard/register-team">
              Register your team
            </Link>
          )}
        </div>
        {!teamStats ? <Loader /> : <LeaderboardTable resolveLink={resolveTeamLink} stats={teamStats} />}
      </div>
    </SEO>
  );
}
