import { useRef, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import { getNativeToken, getToken } from "../../data/Tokens";
import { formatAmount, formatDate, getExplorerUrl, shortenAddress } from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./referralsHelper";
import { ReferralCodeForm } from "./JoinReferralCode";

function TradersStats({ referralsData, traderTier, chainId, userReferralCodeString, setPendingTxns, pendingTxns }) {
  const { referralTotalStats, discountDistributions } = referralsData;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editModalRef = useRef(null);

  const open = () => setIsEditModalOpen(true);
  const close = () => setIsEditModalOpen(false);
  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Trading Volume"
          tooltipText="Volume traded by this account with an active referral code."
          data={getUSDValue(referralTotalStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as a trader."
          data={getUSDValue(referralTotalStats?.discountUsd, 4)}
        />
        <InfoCard
          label="Active Referral Code"
          data={
            <div className="active-referral-code">
              <div className="edit">
                <span>{userReferralCodeString}</span>
                <BiEditAlt onClick={open} />
              </div>
              {traderTier && (
                <div className="tier">
                  <Tooltip
                    handle={`Tier ${getTierIdDisplay(traderTier)} (${tierDiscountInfo[traderTier]}% discount)`}
                    position="right-bottom"
                    renderContent={() =>
                      `You will receive a ${tierDiscountInfo[traderTier]}% discount on your opening and closing fees, this discount will be airdropped to your account every Wednesday`
                    }
                  />
                </div>
              )}
            </div>
          }
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={isEditModalOpen}
          setIsVisible={close}
          label="Edit Referral Code"
          onAfterOpen={() => editModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <ReferralCodeForm
              userReferralCodeString={userReferralCodeString}
              setPendingTxns={setPendingTxns}
              pendingTxns={pendingTxns}
              type="edit"
              callAfterSuccess={() => setIsEditModalOpen(false)}
            />
          </div>
        </Modal>
      </div>
      {discountDistributions.length > 0 ? (
        <div className="reward-history">
          <Card title="Rebates Distribution History" tooltipText="Rebates are airdropped weekly.">
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      Date
                    </th>
                    <th className="table-head" scope="col">
                      Amount
                    </th>
                    <th className="table-head" scope="col">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {discountDistributions.map((rebate, index) => {
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                        <td data-label="Amount">
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
                        </td>
                        <td data-label="Transaction">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={explorerURL + `tx/${rebate.transactionHash}`}
                          >
                            {shortenAddress(rebate.transactionHash, 20)}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyMessage message="No rebates distribution history yet." tooltipText="Rebates are airdropped weekly." />
      )}
    </div>
  );
}

export default TradersStats;
