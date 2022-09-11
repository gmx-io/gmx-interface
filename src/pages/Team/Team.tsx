import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";
import { useCompetitionDetails, useTeam } from "../../domain/leaderboard/contracts";
import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle } from "../../lib/legacy";
import Loader from "./../../components/Common/Loader";
import { CURRENT_COMPETITION_INDEX } from "../../domain/leaderboard/constants";
import "./Team.css";
import TeamPositions from "../../components/Team/TeamPositions";
import TeamStats from "../../components/Team/TeamStats";
import TeamManagement from "../../components/Team/TeamManagement";

type Props = {
  pendingTxns: any,
  setPendingTxns: any,
}

export default function Team({ pendingTxns, setPendingTxns }: Props) {
  const params = useParams<any>();
  const { chainId, library, account } = useWeb3React();
  const { data: team, loading: teamLoading } = useTeam(chainId, library, CURRENT_COMPETITION_INDEX, params.leaderAddress);
  const { data: competition, loading: competitionLoading } = useCompetitionDetails(chainId, library, CURRENT_COMPETITION_INDEX)

  const isLoading = () => teamLoading || competitionLoading

  return (
    <SEO title={getPageTitle("Team")}>
      <div className="default-container page-layout Leaderboard">
        <div className="team-section-title-block section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              {isLoading() ? "" : <em>{team.name}</em>} Team <img alt="Chain Icon" src={getChainIcon(chainId)} />
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
            <TeamStats team={team} competition={competition}/>

            {competition.registrationActive && <TeamManagement
              team={team}
              competitionIndex={CURRENT_COMPETITION_INDEX}
              pendingTxns={pendingTxns}
              setPendingTxns={setPendingTxns}
            />}

            {competition.active && <TeamPositions
              chainId={chainId}
              positions={team.positions}
            />}
          </>
        )}
      </div>
    </SEO>
  );
}
