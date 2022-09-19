import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle } from "../../lib/legacy";
import { useWeb3React } from "@web3-react/core";
import Loader from "../../components/Common/Loader";
import TeamCreationForm from "../../components/Team/TeamCreationForm";
import { CURRENT_COMPETITION_INDEX } from "../../domain/leaderboard/constants";
import { useHistory } from "react-router-dom";
import { getTeamUrl } from "../../domain/leaderboard/urls";
import { useCompetition, useTeam } from "../../domain/leaderboard/graph";

type Props = {
  connectWallet: any,
  setPendingTxns: any,
  pendingTxns: any,
}

export default function TeamCreation({ connectWallet, setPendingTxns, pendingTxns }: Props) {
  const history = useHistory()
  const { chainId, library, account } = useWeb3React();
  const { data: competition, loading: competitionLoading } = useCompetition(chainId, CURRENT_COMPETITION_INDEX);
  const { data: userTeam, exists: userHasTeam, loading: userTeamLoading } = useTeam(chainId, library, CURRENT_COMPETITION_INDEX, account)

  if (competitionLoading || userTeamLoading) {
    return <Loader/>
  }

  if (userHasTeam) {
    history.replace(getTeamUrl(userTeam.leaderAddress))
  }

  return (
    <SEO title={getPageTitle("Team Registration")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              Team Registration <img alt="Chain Icon" src={getChainIcon(chainId)}/>
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
