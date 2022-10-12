import SEO from "components/Common/SEO";
import { getPageTitle } from "../../lib/legacy";
import { useWeb3React } from "@web3-react/core";
import Loader from "components/Common/Loader";
import TeamCreationForm from "components/Team/TeamCreationForm";
import { getCurrentCompetitionIndex } from "domain/leaderboard/constants";
import { Link, useHistory } from "react-router-dom";
import { getLeaderboardUrl, getTeamUrl } from "domain/leaderboard/urls";
import { useCompetition, useTeam } from "domain/leaderboard/graph";
import { FiChevronLeft } from "react-icons/fi";
import { useChainId } from "lib/chains";
import { getChainIcon } from "config/chains";

type Props = {
  connectWallet: any;
  setPendingTxns: any;
  pendingTxns: any;
};

export default function TeamCreation({ connectWallet, setPendingTxns, pendingTxns }: Props) {
  const history = useHistory();
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const {
    data: competition,
    loading: competitionLoading,
    exists: competitionExists,
  } = useCompetition(chainId, getCurrentCompetitionIndex(chainId));
  const {
    data: userTeam,
    exists: userHasTeam,
    loading: userTeamLoading,
  } = useTeam(chainId, library, getCurrentCompetitionIndex(chainId), account);

  if (competitionLoading || userTeamLoading) {
    return <Loader />;
  }

  if (userHasTeam) {
    history.replace(getTeamUrl(userTeam.leaderAddress));
  }

  if (!competitionLoading && (!competitionExists || (competitionExists && !competition.registrationActive))) {
    history.replace(getLeaderboardUrl());
  }

  return (
    <SEO title={getPageTitle("Team Registration")}>
      <div className="default-container page-layout Leaderboard">
        <Link to={getLeaderboardUrl()} className="back-btn transparent-btn">
          <FiChevronLeft />
          <span>Back to leaderboard</span>
        </Link>
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              Team Registration <img alt="Chain Icon" src={getChainIcon(chainId)} />
            </div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
              referral program details.
            </div>
          </div>
        </div>
        <TeamCreationForm
          pendingTxns={pendingTxns}
          connectWallet={connectWallet}
          competition={competition}
          setPendingTxns={setPendingTxns}
        />
      </div>
    </SEO>
  );
}
