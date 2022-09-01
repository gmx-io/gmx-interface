import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";
import { useTeam } from "../../domain/leaderboard";
import SEO from "../../components/Common/SEO";
import { formatAmount, getChainIcon, getPageTitle, USD_DECIMALS } from "../../lib/legacy";
import Loader from "./../../components/Common/Loader";
import "./../Referrals/Referrals.css";

export default function Team() {
  const params = useParams();
  const { chainId, library } = useWeb3React();
  const team = useTeam(chainId, library);

  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              Team stats <img src={getChainIcon(chainId)} />
            </div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
              referral program details.
            </div>
          </div>
        </div>
        {!team ? (
          <Loader />
        ) : (
          <>
            <div className="referral-body-container">
              <div class="referral-stats">
                <div className="info-card">
                  <div className="card-details">
                    <h3 className="label">Competition Rank</h3>
                    <div className="data">{team ? "#" + team.rank : "..."}</div>
                  </div>
                </div>
                <div className="info-card">
                  <div className="card-details">
                    <h3 className="label">Realized PnL</h3>
                    <div className="data">
                      {team ? "$" + formatAmount(team.realizedPnl, USD_DECIMALS, 0, true) : "..."}
                    </div>
                  </div>
                </div>
                <div className="info-card">
                  <div className="card-details">
                    <h3 className="label">Total members</h3>
                    <div className="data">{team ? team.members.length : "..."}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="Tab-title-section">
              <div class="Page-title">
                Positions <img src={getChainIcon(chainId)} />
              </div>
              <div className="Page-description">Platform and GLP index tokens.</div>
            </div>
            <table className="Exchange-list Orders App-box large">
              <tbody>
                <tr className="Exchange-list-header">
                  <th>Type</th>
                  <th>Order</th>
                  <th>Price</th>
                  <th>Mark Price</th>
                </tr>
                {!team || team.positions.length === 0 ? (
                  <tr>
                    <td colSpan="4">No open positions</td>
                  </tr>
                ) : (
                  ""
                )}
              </tbody>
            </table>
            <table className="Exchange-list small">
              {!team || team.positions.length === 0 ? (
                <div>
                  <div className="Exchange-empty-positions-list-note App-card">No open positions</div>
                </div>
              ) : (
                ""
              )}
            </table>
          </>
        )}
      </div>
    </SEO>
  );
}
