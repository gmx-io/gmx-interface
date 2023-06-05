import { useMemo, useRef, useState } from "react";
import { Trans, t } from "@lingui/macro";
import { FiPlus, FiTwitter } from "react-icons/fi";
import { useCopyToClipboard } from "react-use";
import { IoWarningOutline } from "react-icons/io5";
import { BiCopy, BiErrorCircle } from "react-icons/bi";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import { shortenAddress } from "lib/legacy";
import EmptyMessage from "./EmptyMessage";
import ReferralInfoCard from "./ReferralInfoCard";
import {
  getReferralCodeTradeUrl,
  getTierIdDisplay,
  getTwitterShareUrl,
  getUSDValue,
  isRecentReferralCodeNotExpired,
  tierRebateInfo,
} from "./referralsHelper";
import { AffiliateCodeForm } from "./AddAffiliateCode";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import { ARBITRUM, AVALANCHE, getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { bigNumberify, formatAmount } from "lib/numbers";
import { getNativeToken, getToken } from "config/tokens";
import { formatDate } from "lib/dates";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import usePagination from "./usePagination";
import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

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

  const {
    [chainId]: currentReferralsData,
    [ARBITRUM]: arbitrumData,
    [AVALANCHE]: avalancheData,
    total,
  } = referralsData || {};
  const { affiliateTotalStats, rebateDistributions, affiliateTierInfo } = currentReferralsData;
  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination(rebateDistributions);

  const currentRebateData = getCurrentRebateData();
  const allReferralCodes = affiliateTotalStats.map((c) => c.referralCode.trim());
  const finalAffiliatesTotalStats = useMemo(
    () =>
      recentlyAddedCodes.filter(isRecentReferralCodeNotExpired).reduce((acc, cv) => {
        if (!allReferralCodes.includes(cv.referralCode)) {
          acc = acc.concat(cv);
        }
        return acc;
      }, affiliateTotalStats),
    [allReferralCodes, affiliateTotalStats, recentlyAddedCodes]
  );

  const {
    currentPage: currentAffiliatesPage,
    getCurrentData: getCurrentAffiliatesData,
    setCurrentPage: setCurrentAffiliatesPage,
    pageCount: affiliatesPageCount,
  } = usePagination(finalAffiliatesTotalStats);

  const currentAffiliatesData = getCurrentAffiliatesData();
  const tierId = affiliateTierInfo?.tierId;

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <ReferralInfoCard
          value={currentReferralsData?.cumulativeStats?.registeredReferralsCount || 0}
          label={t`Traders Referred`}
          labelTooltipText={t`Amount of traders you referred.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Traders Referred on Arbitrum`}
                value={arbitrumData.cumulativeStats.registeredReferralsCount}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Traders Referred on Avalanche`}
                value={avalancheData.cumulativeStats.registeredReferralsCount}
                showDollar={false}
              />
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={total?.registeredReferralsCount} showDollar={false} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.cumulativeStats?.volume)}`}
          label={t`Trading Volume`}
          labelTooltipText={t`Volume traded by your referred traders.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Trading Volume on Arbitrum`}
                value={getUSDValue(arbitrumData?.cumulativeStats.volume)}
              />
              <StatsTooltipRow
                label={t`Trading Volume on Avalanche`}
                value={getUSDValue(avalancheData?.cumulativeStats.volume)}
              />
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.affiliatesVolume)} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.cumulativeStats?.affiliateRebates)}`}
          label={t`Rebates`}
          labelTooltipText={t`Rebates earned by this account as an affiliate.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Rebates on Arbitrum`}
                value={getUSDValue(arbitrumData?.cumulativeStats.affiliateRebates)}
              />
              <StatsTooltipRow
                label={t`Rebates on Avalanche`}
                value={getUSDValue(avalancheData?.cumulativeStats.affiliateRebates)}
              />
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.affiliateRebates)} />
            </>
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
                  {affiliateTierInfo && t`Tier ${getTierIdDisplay(tierId)} (${tierRebateInfo[tierId]}% rebate)`}
                </span>
              </p>
              <Button variant="secondary" onClick={open}>
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
                  let affiliateRebate = bigNumberify(0);
                  if (stat && stat.totalRebateUsd && stat.discountUsd) {
                    affiliateRebate = stat.totalRebateUsd.sub(stat.discountUsd);
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
                      <td data-label="Total Volume">${getUSDValue(stat.volume)}</td>
                      <td data-label="Traders Referred">{stat.registeredReferralsCount}</td>
                      <td data-label="Total Rebates">${getUSDValue(affiliateRebate, 4)}</td>
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
          tooltipText={t`Rebates are airdropped weekly.`}
          message={t`No rebates distribution history yet.`}
        />
      )}
    </div>
  );
}

export default AffiliatesStats;
