import SEO from "../../components/Common/SEO";
import { getPageTitle } from "../../Helpers";
import { useCompetitionTimes } from "../../Api/leaderboard";
import { useWeb3React } from "@web3-react/core";
import Loader from "./../../components/Common/Loader";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import RegisterTeamForm from "../../components/Leaderboard/RegisterTeamForm";

export default function RegisterTeam() {
  const { chainId, library } = useWeb3React();
  const times = useCompetitionTimes(chainId, library);
  const history = useHistory();

  const getButtonText = () => {
    return "Register";
  };

  return (
    <SEO title={getPageTitle("Team Registration")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">Team Registration</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
              referral program details.
            </div>
          </div>
        </div>
        {!times ? <Loader /> : <RegisterTeamForm times={times} />}
      </div>
    </SEO>
  );
}
