import { useMemo, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useCopyToClipboard } from "react-use";
import { IoWarningOutline } from "react-icons/io5";
import { BiCopy, BiErrorCircle } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import { getNativeToken, getToken } from "../../data/Tokens";
import {
  AVALANCHE,
  bigNumberify,
  formatAmount,
  formatDate,
  getExplorerUrl,
  helperToast,
  REFERRAL_CODE_QUERY_PARAM,
  shortenAddress,
} from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { getTierIdDisplay, getUSDValue, isRecentReferralCodeNotExpired, tierRebateInfo } from "./referralsHelper";
import { AffiliateCodeForm } from "./AddAffiliateCode";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";

function AffiliatesStats({
  referralsData,
  handleCreateReferralCode,
  chainId,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
}) {
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef(null);

  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => setIsAddReferralCodeModalOpen(false);

  const { cumulativeStats, referrerTotalStats, rebateDistributions, referrerTierInfo } = referralsData;
  const allReferralCodes = referrerTotalStats.map((c) => c.referralCode.trim());
  const finalAffiliatesTotalStats = useMemo(
    () =>
      recentlyAddedCodes.filter(isRecentReferralCodeNotExpired).reduce((acc, cv) => {
        if (!allReferralCodes.includes(cv.referralCode)) {
          acc = acc.concat(cv);
        }
        return acc;
      }, referrerTotalStats),
    [allReferralCodes, referrerTotalStats, recentlyAddedCodes]
  );

  const tierId = referrerTierInfo?.tierId;
  let referrerRebates = bigNumberify(0);
  if (cumulativeStats && cumulativeStats.totalRebateUsd && cumulativeStats.discountUsd) {
    referrerRebates = cumulativeStats.totalRebateUsd.sub(cumulativeStats.discountUsd);
  }

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Traders Referred"
          tooltipText="Amount of traders you referred."
          data={cumulativeStats?.registeredReferralsCount || "0"}
        />
        <InfoCard
          label="Total Trading Volume"
          tooltipText="Volume traded by your referred traders."
          data={getUSDValue(cumulativeStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as an affiliate."
          data={getUSDValue(referrerRebates, 4)}
        />
      </div>
      <div className="list">
        <Modal
          className="Connect-wallet-modal"
          isVisible={isAddReferralCodeModalOpen}
          setIsVisible={close}
          label="Create Referral Code"
          onAfterOpen={() => addNewModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <AffiliateCodeForm
              handleCreateReferralCode={handleCreateReferralCode}
              recentlyAddedCodes={recentlyAddedCodes}
              setRecentlyAddedCodes={setRecentlyAddedCodes}
              callAfterSuccess={close}
            />
          </div>
        </Modal>
        <Card
          title={
            <div className="referral-table-header">
              <p className="title">
                Referral Codes{" "}
                <span className="sub-title">
                  {referrerTierInfo && `Tier ${getTierIdDisplay(tierId)} (${tierRebateInfo[tierId]}% rebate)`}
                </span>
              </p>
              <button className="transparent-btn" onClick={open}>
                <FiPlus /> <span className="ml-small">Create</span>
              </button>
            </div>
          }
        >
          <div className="table-wrapper">
            <table className="referral-table">
              <thead>
                <tr>
                  <th className="table-head" scope="col">
                    Referral Code
                  </th>
                  <th className="table-head" scope="col">
                    Total Volume
                  </th>
                  <th className="table-head" scope="col">
                    Traders Referred
                  </th>
                  <th className="table-head" scope="col">
                    Total Rebates
                  </th>
                </tr>
              </thead>
              <tbody>
                {finalAffiliatesTotalStats.map((stat, index) => {
                  const ownerOnOtherChain = stat?.ownerOnOtherChain;
                  let referrerRebate = bigNumberify(0);
                  if (stat && stat.totalRebateUsd && stat.discountUsd) {
                    referrerRebate = stat.totalRebateUsd.sub(stat.discountUsd);
                  }
                  return (
                    <tr key={index}>
                      <td data-label="Referral Code">
                        <div className="table-referral-code">
                          <div
                            onClick={() => {
                              copyToClipboard(`https://gmx.io?${REFERRAL_CODE_QUERY_PARAM}=${stat.referralCode}`);
                              helperToast.success("Referral link copied to your clipboard");
                            }}
                            className="referral-code copy-icon"
                          >
                            <span>{stat.referralCode}</span>
                            <BiCopy />
                          </div>
                          {ownerOnOtherChain && !ownerOnOtherChain?.isTaken && (
                            <div className="info">
                              <TooltipWithPortal
                                position="right"
                                handle={<IoWarningOutline color="#ffba0e" size={16} />}
                                renderContent={() => (
                                  <div>
                                    This code is not yet registered on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                    there.
                                    <br />
                                    <br />
                                    Switch your network to create this code on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}.
                                  </div>
                                )}
                              />
                            </div>
                          )}
                          {ownerOnOtherChain && ownerOnOtherChain?.isTaken && !ownerOnOtherChain?.isTakenByCurrentUser && (
                            <div className="info">
                              <TooltipWithPortal
                                position="right"
                                handle={<BiErrorCircle color="#e82e56" size={16} />}
                                renderContent={() => (
                                  <div>
                                    This code has been taken by someone else on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                    from traders using this code on {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}.
                                  </div>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="Total Volume">{getUSDValue(stat.volume)}</td>
                      <td data-label="Traders Referred">{stat.registeredReferralsCount}</td>
                      <td data-label="Total Rebates">{getUSDValue(referrerRebate, 4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {rebateDistributions?.length > 0 ? (
        <div className="reward-history">
          <Card title="Rewards Distribution History" tooltipText="Rewards are airdropped weekly.">
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
                  {rebateDistributions.map((rebate, index) => {
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td className="table-head" data-label="Date">
                          {formatDate(rebate.timestamp)}
                        </td>
                        <td className="table-head" data-label="Amount">
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
                        </td>
                        <td className="table-head" data-label="Transaction">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={explorerURL + `tx/${rebate.transactionHash}`}
                          >
                            {shortenAddress(rebate.transactionHash, 13)}
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
        <EmptyMessage tooltipText="Rebates are airdropped weekly." message="No rebates distribution history yet." />
      )}
    </div>
  );
}

export default AffiliatesStats;
