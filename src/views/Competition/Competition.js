import { useWeb3React } from "@web3-react/core";
import { Link } from "react-router-dom";
import { useTeam, useTeams, useTimes } from "../../Api/competition";
import SEO from "../../components/Common/SEO";
import Loader from "../../components/Common/Loader";
import { useEffect, useState } from "react";
import Leaderboard from "./Leaderboard"
import "./Competition.css"

export default function Competition({ setPendingTxns, connectWallet })
{
  const { chainId, library, account, active } = useWeb3React()
  const times = useTimes(chainId, library)
  const team = useTeam(chainId, library, account)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(times.loading || team.loading)
  }, [times, team])

  const TeamButton = () => {
    return team.data
      ? <Link className="default-btn" to={"/competition/" + team.data.leader}>View your team</Link>
      : <Link className="default-btn" to={"/competition/register-team"}>Register your team</Link>
  }

  return (
    <SEO>
      <div className="default-container page-layout Competition">
        <div className="section-title-block Competition-section-title-block">
          <div className="section-title-content">
            <div className="Page-title">Trading Competition</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program.<br/>For more information, please read the <a target="_blank" rel="noopener noreferrer" href="https://gmxio.gitbook.io/gmx/referrals">referral program details</a>.
            </div>
          </div>
          {loading || !active || <TeamButton/>}
        </div>
        {active ? (
          <>{loading ? <Loader/> : <Leaderboard/>}</>
        ) : (
          <div className="App-card">
            <button className="App-cta Exchange-swap-button" onClick={connectWallet}>Connect Wallet</button>
          </div>
        )}
      </div>
    </SEO>
  )
}
