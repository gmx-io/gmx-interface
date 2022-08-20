import { useLeaderboardStats } from "../../Api";
import SEO from "../../components/Common/SEO";
import { beautifyAddress, formatAmount, getAccountUrl, getPageTitle, shortenAddress, USD_DECIMALS, useChainId } from "../../Helpers";
import Loader from "../../components/Common/Loader"
import "./Leaderboard.css"
import { useEffect, useState } from "react";
import Tab from "../../components/Tab/Tab";
import { useWeb3React } from "@web3-react/core";

export default function Leaderboard() {
  const { chainId } = useChainId()
  const [period, setPeriod] = useState("monthly")

  const stats = useLeaderboardStats(period)

  const periods = {
    "hourly": "Hourly",
    "daily": "Daily",
    "weekly": "Weekly",
    "monthly": "Monthly"
  }

  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">Leaderboard</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program.
              <br />
              For more information, please read the{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://gmxio.gitbook.io/gmx/referrals">
                referral program details
              </a>
              .
            </div>
          </div>
        </div>
        <div>
          <Tab
            className="Leaderboard-tabs"
            options={Object.keys(periods)}
            option={period}
            optionLabels={periods}
            setOption={setPeriod}
          />
        </div>
        {!stats && <Loader />}
        {stats && (
          <div className="App-card">
            <table className="Leaderboard-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(stat => (
                  <tr key={stat.id}>
                    <td>
                      <a href={getAccountUrl(chainId, stat.id)} target="_blank">
                        {shortenAddress(stat.id, 10)}
                      </a>
                    </td>
                    <td>{(stat.pnl.gt(0) ? "+" : "-") + formatAmount(stat.pnl, USD_DECIMALS, 0, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SEO>
  )
}
