import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import { AVALANCHE, getExplorerUrl } from "config/chains";
import { getNativeToken, getToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { BigNumber } from "ethers";
import { formatDate } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { bigNumberify, formatAmount } from "lib/numbers";
import { useMemo, useRef, useState } from "react";
import { BiCopy, BiErrorCircle } from "react-icons/bi";
import { FiPlus, FiTwitter } from "react-icons/fi";
import { IoWarningOutline } from "react-icons/io5";
import { useCopyToClipboard } from "react-use";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import { AffiliateCodeForm } from "./AddAffiliateCode";
import "./AffiliatesStats.scss";
import { ClaimAffiliatesModal } from "./ClaimAffiliatesModal/ClaimAffiliatesModal";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import {
  getReferralCodeTradeUrl,
  getTierIdDisplay,
  getTwitterShareUrl,
  getUSDValue,
  isRecentReferralCodeNotExpired,
  tierRebateInfo,
} from "./referralsHelper";
import usePagination from "./usePagination";

function AffiliatesStats({
  referralsData,
  handleCreateReferralCode,
  chainId,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
}) {
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef(null);

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { affiliateRewardsData } = useAffiliateRewards(chainId);

  const [isClaiming, setIsClaiming] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => setIsAddReferralCodeModalOpen(false);

  const { cumulativeStats, referrerTotalStats, rebateDistributions, referrerTierInfo } = referralsData || {};
  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination(rebateDistributions);

  const currentRebateData = getCurrentRebateData();
  const allReferralCodes = referrerTotalStats?.map((c) => c.referralCode.trim());
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

  const {
    currentPage: currentAffiliatesPage,
    getCurrentData: getCurrentAffiliatesData,
    setCurrentPage: setCurrentAffiliatesPage,
    pageCount: affiliatesPageCount,
  } = usePagination(finalAffiliatesTotalStats);

  const currentAffiliatesData = getCurrentAffiliatesData();
  const tierId = referrerTierInfo?.tierId;

  const totalClaimableRewardsUsd = useMemo(() => {
    if (!affiliateRewardsData || !marketsInfoData) {
      return BigNumber.from(0);
    }

    return getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData);
  }, [affiliateRewardsData, marketsInfoData]);

  let referrerRebates = bigNumberify(0);
  if (cumulativeStats && cumulativeStats.totalRebateUsd && cumulativeStats.discountUsd) {
    referrerRebates = cumulativeStats.totalRebateUsd.sub(cumulativeStats.discountUsd);
  }
  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard
          label={t`Total Traders Referred`}
          tooltipText={t`Amount of traders you referred.`}
          data={cumulativeStats?.registeredReferralsCount || "0"}
        />
        <InfoCard
          label={t`Total Trading Volume`}
          tooltipText={t`Volume traded by your referred traders.`}
          data={getUSDValue(cumulativeStats?.volume)}
        />
        <InfoCard
          label={t`Total Rebates`}
          tooltipText={t`Rebates earned by this account as an affiliate.`}
          data={getUSDValue(referrerRebates, 4)}
        />
        <InfoCard
          label={t`Claimable Rewards`}
          data={
            <div className="AffiliateStats-claimable-rewards-container">
              {getUSDValue(totalClaimableRewardsUsd, 4)}
              {totalClaimableRewardsUsd.gt(-1) && (
                <button
                  className="App-button-option App-card-option AffiliateStats-claim-button"
                  onClick={() => setIsClaiming(true)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
            </div>
          }
        />
      </div>
      <div className="list">
        <Modal
          className="Connect-wallet-modal"
          isVisible={isAddReferralCodeModalOpen}
          setIsVisible={close}
          label={t`Create Referral Code`}
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
                <Trans>Referral Codes</Trans>{" "}
                <span className="sub-title">
                  {referrerTierInfo && t`Tier ${getTierIdDisplay(tierId)} (${tierRebateInfo[tierId]}% rebate)`}
                </span>
              </p>
              <Button variant="clear" onClick={open}>
                <FiPlus />{" "}
                <span className="ml-small">
                  <Trans>Create</Trans>
                </span>
              </Button>
            </div>
          }
        >
          <div className="table-wrapper">
            <table className="referral-table">
              <thead>
                <tr>
                  <th className="table-head" scope="col">
                    <Trans>Referral Code</Trans>
                  </th>
                  <th className="table-head" scope="col">
                    <Trans>Total Volume</Trans>
                  </th>
                  <th className="table-head" scope="col">
                    <Trans>Traders Referred</Trans>
                  </th>
                  <th className="table-head" scope="col">
                    <Trans>Total Rebates</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentAffiliatesData.map((stat, index) => {
                  const ownerOnOtherChain = stat?.ownerOnOtherChain;
                  let referrerRebate = bigNumberify(0);
                  if (stat && stat.totalRebateUsd && stat.discountUsd) {
                    referrerRebate = stat.totalRebateUsd.sub(stat.discountUsd);
                  }
                  return (
                    <tr key={index}>
                      <td data-label="Referral Code">
                        <div className="table-referral-code">
                          <span className="referral-text ">{stat.referralCode}</span>
                          <div
                            onClick={() => {
                              copyToClipboard(getReferralCodeTradeUrl(stat.referralCode));
                              helperToast.success("Referral link copied to your clipboard");
                            }}
                            className="referral-code-icon"
                          >
                            <BiCopy />
                          </div>
                          <a
                            href={getTwitterShareUrl(stat.referralCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="referral-code-icon"
                          >
                            <FiTwitter />
                          </a>
                          {ownerOnOtherChain && !ownerOnOtherChain?.isTaken && (
                            <div className="info">
                              <TooltipWithPortal
                                position="right"
                                handle={<IoWarningOutline color="#ffba0e" size={16} />}
                                renderContent={() => (
                                  <div>
                                    <Trans>
                                      This code is not yet registered on{" "}
                                      {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                      there.
                                      <br />
                                      <br />
                                      Switch your network to create this code on{" "}
                                      {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}.
                                    </Trans>
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
                                    <Trans>
                                      This code has been taken by someone else on{" "}
                                      {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                      from traders using this code on {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}
                                      .
                                    </Trans>
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
        <Pagination
          page={currentAffiliatesPage}
          pageCount={affiliatesPageCount}
          onPageChange={(page) => setCurrentAffiliatesPage(page)}
        />
      </div>
      {currentRebateData.length > 0 ? (
        <div className="reward-history">
          <Card title={t`Rewards Distribution History`} tooltipText={t`Rewards are airdropped weekly.`}>
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      <Trans>Date</Trans>
                    </th>
                    <th className="table-head" scope="col">
                      <Trans>Amount</Trans>
                    </th>
                    <th className="table-head" scope="col">
                      <Trans>Transaction</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRebateData.map((rebate, index) => {
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
                          <ExternalLink href={explorerURL + `tx/${rebate.transactionHash}`}>
                            {shortenAddress(rebate.transactionHash, 13)}
                          </ExternalLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            page={currentRebatePage}
            pageCount={rebatePageCount}
            onPageChange={(page) => setCurrentRebatePage(page)}
          />
        </div>
      ) : (
        <EmptyMessage
          tooltipText={t`V1 rebates are airdropped weekly, V2 rebates are automatically applied as fee discounts on each trade.`}
          message={t`No rebates distribution history yet.`}
        />
      )}

      {isClaiming && <ClaimAffiliatesModal onClose={() => setIsClaiming(false)} />}
    </div>
  );
}

export default AffiliatesStats;
