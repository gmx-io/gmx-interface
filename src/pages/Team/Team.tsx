import { useWeb3React } from "@web3-react/core";
import { Link, useHistory, useParams } from "react-router-dom";
import { useCompetition, useTeam } from "../../domain/leaderboard/contracts";
import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle, useChainId } from "../../lib/legacy";
import Loader from "./../../components/Common/Loader";
import { CURRENT_COMPETITION_INDEX } from "../../domain/leaderboard/constants";
import "./Team.css";
import TeamPositions from "../../components/Team/TeamPositions";
import TeamStats from "../../components/Team/TeamStats";
import TeamManagement from "../../components/Team/TeamManagement";
import { TeamMembers } from "../../components/Team/TeamMembers";
import { FiChevronLeft } from "react-icons/fi";
import { getLeaderboardUrl } from "../../domain/leaderboard/urls";

type Props = {
  pendingTxns: any,
  setPendingTxns: any,
}

export default function Team({ pendingTxns, setPendingTxns }: Props) {
  const history = useHistory()
  const params = useParams<any>();
  const { chainId } = useChainId()
  const { library, account } = useWeb3React();
  const { data: team, exists: teamExists, loading: teamLoading } = useTeam(chainId, library, CURRENT_COMPETITION_INDEX, params.leaderAddress);
  const { data: competition, loading: competitionLoading } = useCompetition(chainId, library, CURRENT_COMPETITION_INDEX)
  const { exists: accountHasTeam } = useTeam(chainId, library, CURRENT_COMPETITION_INDEX, account)

  const isLoading = () => teamLoading || competitionLoading
  const isTeamMember = () => account && team.members.includes(account)
  const isTeamLeader = () => account && account === team.leaderAddress;

  const showTeamManagement = () => account && (isTeamLeader() || isTeamMember() || !accountHasTeam)

  if (!teamLoading && !teamExists) {
    history.replace("/404")
  }

  return (
    <SEO title={getPageTitle("Team")}>
      <div className="default-container page-layout Leaderboard">
        <Link to={getLeaderboardUrl()} className="back-btn default-btn disabled">
          <FiChevronLeft/>
          <span>Back to leaderboard</span>
        </Link>
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

            {showTeamManagement() && <TeamManagement
              team={team}
              competition={competition}
              pendingTxns={pendingTxns}
              setPendingTxns={setPendingTxns}
            />}

            {competition.active && <TeamPositions
              chainId={chainId}
              positions={team.positions}
            />}

            <TeamMembers team={team} pendingTxns={pendingTxns} setPendingTxns={setPendingTxns}/>
          </>
        )}
      </div>
    </SEO>
  );
}
