import { useWeb3React } from "@web3-react/core"
import { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { useLocalStorage } from "react-use";
import { useTeam } from "../../Api/competition";
import { useUserCodesOnAllChain } from "../../Api/referrals";
import Loader from "../../components/Common/Loader";
import SEO from "../../components/Common/SEO";
import { RegisterTeamForm } from "../../components/Competition/RegisterTeamForm";
import { REFERRALS_SELECTED_TAB_KEY, useChainId } from "../../Helpers";
import { AFFILIATES } from "../Referrals/Referrals";
import "./RegisterTeam.css";

export default function RegisterTeam({ setPendingTxns, connectWallet })
{
  const { chainId } = useChainId()
  const { active, library, account } = useWeb3React()
  const team = useTeam(chainId, library, account)
  const history = useHistory()
  const [activeReferralTab,setActiveReferralTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, AFFILIATES)

  const handleCreateCodeClick = () => {
    if (activeReferralTab !== AFFILIATES) {
      setActiveReferralTab(AFFILIATES)
    }
    history.push("/referrals")
  }

  const RegistrationCard = () => (
    <div className="RegisterTeam-card mt-medium section-center">
      {active ? (
        <>
          <RegisterTeamForm
            chainId={chainId}
            library={library}
            account={account}
            setPendingTxns={setPendingTxns}
          />
          <div className="mt-medium">
            <div className="create-code-link" onClick={handleCreateCodeClick}>Create a referral code</div>
          </div>
        </>
      ) : (
        <button className="App-cta Exchange-swap-button" type="submit" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  )

  return (
    <SEO>
      <div className="default-container page-layout RegisterTeam">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">Team Registration</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program.<br/>For more information, please read the <a target="_blank" rel="noopener noreferrer" href="https://gmxio.gitbook.io/gmx/referrals">referral program details</a>.
            </div>
          </div>
        </div>
        {team.loading && <Loader/>}
        {team.loading || (
          <>
            {team.data ? (
              <div>
                You already have a team
                <Link to={"/competition/"+team.data.leader}>Go to team page</Link>
              </div>
            ) : <RegistrationCard/>}
          </>
        )}
      </div>
    </SEO>
  )
}
