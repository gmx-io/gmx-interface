import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { AVALANCHE, getExplorerUrl } from "config/chains";
import { getNativeToken, getToken, getTokenBySymbol } from "config/tokens";
import { ReferralCodeStats, ReferralsStatsData, RewardDistributionType } from "domain/referrals";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { BigNumber } from "ethers";
import { formatDate } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { bigNumberify, formatTokenAmount } from "lib/numbers";
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

type Props = {
  chainId: number;
  referralsData?: ReferralsStatsData;
  handleCreateReferralCode: (code: string) => void;
  setRecentlyAddedCodes: (codes: ReferralCodeStats[]) => void;
  recentlyAddedCodes?: ReferralCodeStats[];
};

function AffiliatesStats({
  chainId,
  referralsData,
  recentlyAddedCodes,
  handleCreateReferralCode,
  setRecentlyAddedCodes,
}: Props) {
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef<HTMLDivElement>(null);

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { affiliateRewardsData } = useAffiliateRewards(chainId);

  const esGmxAddress = getTokenBySymbol(chainId, "esGMX").address;

  const [isClaiming, setIsClaiming] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => setIsAddReferralCodeModalOpen(false);

  const { affiliateTotalStats, affiliateReferralCodesStats, affiliateDistributions, affiliateTierInfo } =
    referralsData || {};

  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination(affiliateDistributions);

  const currentRebateData = getCurrentRebateData();
  const allReferralCodes = affiliateReferralCodesStats?.map((c) => c.referralCode.trim());
  const finalAffiliatesTotalStats = useMemo(
    () =>
      recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).reduce((acc, cv) => {
        if (!allReferralCodes?.includes(cv.referralCode)) {
          acc = acc.concat(cv);
        }
        return acc;
      }, affiliateReferralCodesStats || []),
    [allReferralCodes, affiliateReferralCodesStats, recentlyAddedCodes]
  );

  const {
    currentPage: currentAffiliatesPage,
    getCurrentData: getCurrentAffiliatesData,
    setCurrentPage: setCurrentAffiliatesPage,
    pageCount: affiliatesPageCount,
  } = usePagination(finalAffiliatesTotalStats);

  const currentAffiliatesData = getCurrentAffiliatesData();
  const tierId = affiliateTierInfo?.tierId;

  const totalClaimableRewardsUsd = useMemo(() => {
    if (!affiliateRewardsData || !marketsInfoData) {
      return BigNumber.from(0);
    }

    return getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData);
  }, [affiliateRewardsData, marketsInfoData]);

  let totalRebates = bigNumberify(0);
  let totalRebatesV1 = bigNumberify(0);
  let totalRebatesV2 = bigNumberify(0);
  if (affiliateTotalStats && affiliateTotalStats.totalRebateUsd && affiliateTotalStats.discountUsd) {
    totalRebates = affiliateTotalStats.totalRebateUsd.sub(affiliateTotalStats.discountUsd);
    totalRebatesV1 = affiliateTotalStats.v1Data.totalRebateUsd.sub(affiliateTotalStats.v1Data.discountUsd);
    totalRebatesV2 = affiliateTotalStats.v2Data.totalRebateUsd.sub(affiliateTotalStats.v2Data.discountUsd);
  }

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard
          label={t`Total Traders Referred`}
          tooltipText={t`Amount of traders you referred.`}
          data={affiliateTotalStats?.registeredReferralsCount || "0"}
        />
        <InfoCard
          label={t`Total Trading Volume`}
          tooltipText={t`Volume traded by your referred traders.`}
          data={
            <Tooltip
              handle={getUSDValue(affiliateTotalStats?.volume)}
              position="left-bottom"
              renderContent={() => (
                <>
                  <StatsTooltipRow
                    label={t`Volume on V1`}
                    value={getUSDValue(affiliateTotalStats?.v1Data.volume)}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`Volume on V2`}
                    value={getUSDValue(affiliateTotalStats?.v2Data.volume)}
                    showDollar={false}
                  />
                </>
              )}
            />
          }
        />
        <InfoCard
          label={t`Total Rebates`}
          tooltipText={t`Rebates earned by this account as an affiliate.`}
          data={
            <Tooltip
              handle={getUSDValue(totalRebates)}
              position="left-bottom"
              renderContent={() => (
                <>
                  <StatsTooltipRow label={t`Rebates on V1`} value={getUSDValue(totalRebatesV1)} showDollar={false} />
                  <StatsTooltipRow label={t`Rebates on V2`} value={getUSDValue(totalRebatesV2)} showDollar={false} />
                </>
              )}
            />
          }
        />
        <InfoCard
          label={t`Claimable Rewards`}
          className="AffiliateStats-claimable-rewards-card"
          data={
            <div className="AffiliateStats-claimable-rewards-container">
              {getUSDValue(totalClaimableRewardsUsd, 4)}
              {totalClaimableRewardsUsd.gt(0) && (
                <div onClick={() => setIsClaiming(true)} className="AffiliateStats-claim-button">
                  Claim
                </div>
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
                  {affiliateTierInfo && t`Tier ${getTierIdDisplay(tierId)} (${tierRebateInfo[tierId]}% rebate)`}
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
                      <td data-label="Total Volume">
                        <Tooltip
                          handle={getUSDValue(stat.volume)}
                          position="left-bottom"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                label={t`Volume on V1`}
                                value={getUSDValue(stat?.v1Data.volume)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Volume on V2`}
                                value={getUSDValue(stat?.v2Data.volume)}
                                showDollar={false}
                              />
                            </>
                          )}
                        />
                      </td>
                      <td data-label="Traders Referred">{stat.registeredReferralsCount}</td>
                      <td data-label="Total Rebates">
                        <Tooltip
                          handle={getUSDValue(stat.affiliateRebateUsd)}
                          position="left-bottom"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                label={t`Rebates on V1`}
                                value={getUSDValue(stat.v1Data.affiliateRebateUsd)}
                                showDollar={false}
                              />
                              <StatsTooltipRow
                                label={t`Rebates on V2`}
                                value={getUSDValue(stat.v2Data.affiliateRebateUsd)}
                                showDollar={false}
                              />
                            </>
                          )}
                        />
                      </td>
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
                      <Trans>Type</Trans>
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
                    let rebateType = "-";

                    if (rebate.typeId === RewardDistributionType.Rebate) {
                      if (rebate.tokens[0] === esGmxAddress) {
                        rebateType = t`V1 esGMX`;
                      } else {
                        rebateType = t`V1 AIRDROP`;
                      }
                    } else if (rebate.typeId === RewardDistributionType.Claim) {
                      rebateType = t`V2 CLAIM`;
                    }

                    const amountsByTokens = rebate.tokens.reduce((acc, tokenAddress, i) => {
                      let token;
                      try {
                        token = getToken(chainId, tokenAddress);
                      } catch {
                        token = getNativeToken(chainId);
                      }
                      acc[token.address] = acc[token.address] || BigNumber.from(0);
                      acc[token.address] = acc[token.address].add(rebate.amounts[i]);
                      return acc;
                    }, {} as { [address: string]: BigNumber });

                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td className="table-head" data-label="Date">
                          {formatDate(rebate.timestamp)}
                        </td>
                        <td className="table-head" data-label="Type">
                          {rebateType}
                        </td>
                        <td className="table-head" data-label="Amount">
                          {Object.keys(amountsByTokens).map((tokenAddress) => {
                            const token = getToken(chainId, tokenAddress);
                            return (
                              <>
                                <div key={tokenAddress}>
                                  {formatTokenAmount(amountsByTokens[tokenAddress], token.decimals, token.symbol, {
                                    displayDecimals: 6,
                                    useCommas: true,
                                  })}
                                </div>
                              </>
                            );
                          })}
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

      {isClaiming && <ClaimAffiliatesModal onClose={() => setIsClaiming(false)} />}
    </div>
  );
}

export default AffiliatesStats;
