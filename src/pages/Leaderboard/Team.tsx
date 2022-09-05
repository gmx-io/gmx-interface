import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";
import { useCompetitionDetails, useTeam } from "../../domain/leaderboard/contracts";
import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle } from "../../lib/legacy";
import Loader from "./../../components/Common/Loader";
import { CURRENT_COMPETITION_INDEX } from "../../domain/leaderboard/constants";
import "./Team.css";
import TeamPositions from "../../components/Leaderboard/TeamPositions";
import TeamStats from "../../components/Leaderboard/TeamStats";

export default function Team() {
  const params = useParams<any>();
  const { chainId, library } = useWeb3React();
  const { data: team, loading: teamLoading } = useTeam(chainId, library, CURRENT_COMPETITION_INDEX, params.leaderAddress);
  const { data: competition, loading: competitionLoading } = useCompetitionDetails(chainId, library, CURRENT_COMPETITION_INDEX)

  const isLoading = () => teamLoading || competitionLoading

  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              {isLoading() ? "" : <em>{team.name}</em>} Team stats <img alt="Chain Icon" src={getChainIcon(chainId)} />
            </div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
              referral program details.
            </div>
          </div>
        </div>
        {isLoading() && <Loader/>}
        {isLoading() || (
          <>
            <TeamStats team={team} />
            {competition.active && <TeamPositions chainId={chainId} positions={team.positions}/>}
          </>
        )}
      </div>
    </SEO>
  );
}
