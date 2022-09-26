import { useWeb3React } from "@web3-react/core";
import { Link, useHistory, useParams } from "react-router-dom";
import { useCompetition, useTeam } from "../../domain/leaderboard/graph"
import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle, useChainId } from "../../lib/legacy";
import Loader from "./../../components/Common/Loader";
import { getCurrentCompetitionIndex } from "../../domain/leaderboard/constants";
import "./Team.css";
import TeamPositions from "../../components/Team/TeamPositions";
import TeamStats from "../../components/Team/TeamStats";
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
  const { library } = useWeb3React();
  const { data: team, exists: teamExists, loading: teamLoading, revalidate: revalidateTeam } = useTeam(chainId, library, getCurrentCompetitionIndex(chainId), params.leaderAddress);
  const { data: competition, loading: competitionLoading } = useCompetition(chainId, getCurrentCompetitionIndex(chainId))

  const isLoading = () => teamLoading || competitionLoading

  if (!teamLoading && !teamExists) {
    history.replace(getLeaderboardUrl())
  }

  return (
    <SEO title={getPageTitle("Team")}>
      <div className="default-container page-layout Leaderboard">
        <Link to={getLeaderboardUrl()} className="back-btn transparent-btn">
          <FiChevronLeft/>
          <span>Back to leaderboard</span>
        </Link>
        <div className="team-section-title-block section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              {isLoading() ? "" : <em>{team.name}</em>} Team <img alt="Chain Icon" src={getChainIcon(chainId)} />
            </div>
          </div>
        </div>
        {isLoading() && <Loader/>}
        {!isLoading() && (
          <>
            <TeamStats team={team} competition={competition}/>
            {competition.active && <TeamPositions team={team}/>}
            <TeamMembers onMembersChange={revalidateTeam} team={team} pendingTxns={pendingTxns} setPendingTxns={setPendingTxns}/>
          </>
        )}
      </div>
    </SEO>
  );
}
