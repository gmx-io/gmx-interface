import { useWeb3React } from "@web3-react/core"
import { Link, useHistory } from "react-router-dom";
import { useTeam } from "../../Api/competition";
import Loader from "../../components/Common/Loader";
import SEO from "../../components/Common/SEO";
import { RegisterTeamForm } from "../../components/Competition/RegisterTeamForm";
import { useChainId } from "../../Helpers";
import "./RegisterTeam.css";

export default function RegisterTeam({ setPendingTxns, connectWallet })
{
  const { chainId } = useChainId()
  const { active, library, account } = useWeb3React()
  const team = useTeam(chainId, library, account)
  const history = useHistory()

  const RegistrationCard = () => (
    <div className="RegisterTeam-card mt-medium section-center">
      {active ? (
        <RegisterTeamForm
          chainId={chainId}
          library={library}
          account={account}
          setPendingTxns={setPendingTxns}
        />
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
            <div className="Page-title">Competition Team</div>
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
