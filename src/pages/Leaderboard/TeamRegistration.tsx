import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle } from "../../lib/legacy";
import { useCompetitionDetails } from "../../domain/leaderboard/contracts";
import { useWeb3React } from "@web3-react/core";
import Loader from "../../components/Common/Loader";
import TeamRegistrationForm from "../../components/Leaderboard/TeamRegistrationForm";
import { useParams } from "react-router-dom";

export default function TeamRegistration({ connectWallet, setPendingTxns, pendingTxns }) {
  const { chainId, library } = useWeb3React();
  const params = useParams<any>();
  const { data: times, loading } = useCompetitionDetails(chainId, library, params.competitionIndex);

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
        {loading ? <Loader /> : <TeamRegistrationForm
          pendingTxns={pendingTxns}
          competitionIndex={params.competitionIndex}
          connectWallet={connectWallet}
          times={times}
          setPendingTxns={setPendingTxns}
        />}
      </div>
    </SEO>
  );
}
