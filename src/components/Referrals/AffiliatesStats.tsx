import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useRef, useState } from "react";
import { BiCopy } from "react-icons/bi";
import { FiPlus, FiTwitter } from "react-icons/fi";
import { IoWarningOutline } from "react-icons/io5";
import { useCopyToClipboard } from "react-use";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getExplorerUrl, ContractsChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { RebateDistributionType, ReferralCodeStats, TotalReferralsStats, useTiers } from "domain/referrals";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { formatDate } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralCreateCodeEvent, ReferralShareEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getNativeToken, getToken, getTokenBySymbol } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import { AffiliateCodeForm } from "./AddAffiliateCode";
import Card from "../Common/Card";
import Modal from "../Modal/Modal";
import { ClaimAffiliatesModal } from "./ClaimAffiliatesModal/ClaimAffiliatesModal";
import EmptyMessage from "./EmptyMessage";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";
import ReferralInfoCard from "./ReferralInfoCard";
import {
  getReferralCodeTradeUrl,
  getSharePercentage,
  getTierIdDisplay,
  getTwitterShareUrl,
  getUSDValue,
  isRecentReferralCodeNotExpired,
} from "./referralsHelper";
import usePagination, { DEFAULT_PAGE_SIZE } from "./usePagination";
import "./AffiliatesStats.scss";

type Props = {
  chainId: ContractsChainId;
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
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
  const { signer } = useWallet();
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef<HTMLDivElement>(null);

  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const { affiliateRewardsData } = useAffiliateRewards(chainId);

  const esGmxAddress = getTokenBySymbol(chainId, "esGMX").address;

  const [isClaiming, setIsClaiming] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const open = useCallback(() => {
    userAnalytics.pushEvent<ReferralCreateCodeEvent>({
      event: "ReferralCodeAction",
      data: {
        action: "CreateCode",
      },
    });
    setIsAddReferralCodeModalOpen(true);
  }, []);
  const close = useCallback(() => setIsAddReferralCodeModalOpen(false), []);

  const { total, chains } = referralsData || {};
  const {
    [chainId]: currentReferralsData,
    [ARBITRUM]: arbitrumData,
    [AVALANCHE]: avalancheData,
    [AVALANCHE_FUJI]: fujiData,
  } = chains || {};

  const { affiliateDistributions, affiliateTierInfo, affiliateReferralCodesStats } = currentReferralsData || {};

  const {
    currentPage: currentRebatePage,
    getCurrentData: getCurrentRebateData,
    setCurrentPage: setCurrentRebatePage,
    pageCount: rebatePageCount,
  } = usePagination("Rebates", affiliateDistributions);

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
  } = usePagination("Affiliates", finalAffiliatesTotalStats);

  const currentAffiliatesData = getCurrentAffiliatesData();
  const tierId = affiliateTierInfo?.tierId;
  const discountShare = affiliateTierInfo?.discountShare;
  const { totalRebate } = useTiers(signer, chainId, tierId);
  const currentRebatePercentage = getSharePercentage(tierId, BigInt(discountShare ?? 0n), totalRebate, true);

  const totalClaimableRewardsUsd = useMemo(() => {
    if (!affiliateRewardsData || !marketsInfoData) {
      return 0n;
    }

    return getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData);
  }, [affiliateRewardsData, marketsInfoData]);

  const trackCopyCode = useCallback(() => {
    userAnalytics.pushEvent<ReferralShareEvent>(
      {
        event: "ReferralCodeAction",
        data: {
          action: "CopyCode",
        },
      },
      { instantSend: true }
    );
  }, []);

  const trackShareTwitter = useCallback(() => {
    userAnalytics.pushEvent<ReferralShareEvent>(
      {
        event: "ReferralCodeAction",
        data: {
          action: "ShareTwitter",
        },
      },
      { instantSend: true }
    );
  }, []);

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <ReferralInfoCard
          value={String(currentReferralsData?.affiliateTotalStats.registeredReferralsCount || 0)}
          label={t`Traders Referred`}
          labelTooltipText={t`Amount of traders you referred.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Traders Referred on Arbitrum`}
                value={arbitrumData.affiliateTotalStats.registeredReferralsCount}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Traders Referred on Avalanche`}
                value={avalancheData.affiliateTotalStats.registeredReferralsCount}
                showDollar={false}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`Traders Referred on Avalanche Fuji`}
                  value={fujiData.affiliateTotalStats.registeredReferralsCount}
                  showDollar={false}
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={total?.registeredReferralsCount} showDollar={false} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.affiliateTotalStats?.volume)}`}
          label={t`Trading Volume`}
          labelTooltipText={t`Volume traded by your referred traders.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUSDValue(arbitrumData?.affiliateTotalStats.v1Data.volume)}
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUSDValue(avalancheData?.affiliateTotalStats.v1Data.volume)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.affiliateTotalStats.v1Data.volume)}
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUSDValue(arbitrumData?.affiliateTotalStats.v2Data.volume)}
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUSDValue(avalancheData?.affiliateTotalStats.v2Data.volume)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.affiliateTotalStats.v2Data.volume)}
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.affiliateVolume)} />
            </>
          }
        />
        <ReferralInfoCard
          value={`$${getUSDValue(currentReferralsData?.affiliateTotalStats?.affiliateRebateUsd)}`}
          label={t`Rebates`}
          labelTooltipText={t`Rebates earned by this account as an affiliate.`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUSDValue(arbitrumData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUSDValue(avalancheData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUSDValue(arbitrumData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUSDValue(avalancheData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUSDValue(fujiData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUSDValue(total?.affiliateRebateUsd)} />
            </>
          }
        />
        <ReferralInfoCard
          label={t`Claimable Rebates`}
          labelTooltipText={t`Claim V2 Rebates from your referred Traders.`}
          className="AffiliateStats-claimable-rewards-card"
        >
          <div className="AffiliateStats-claimable-rewards-container">
            ${getUSDValue(totalClaimableRewardsUsd, 4)}
            {(totalClaimableRewardsUsd > 0 && (
              <div onClick={() => setIsClaiming(true)} className="AffiliateStats-claim-button">
                Claim
              </div>
            )) ||
              null}
          </div>
        </ReferralInfoCard>
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
          slimHeader
          title={
            <div className="referral-table-header">
              <p className="title text-body-large">
                <Trans>Referral Codes</Trans>{" "}
                <span className="sub-title">
                  {affiliateTierInfo && t`Tier ${getTierIdDisplay(tierId)} (${currentRebatePercentage}% rebate)`}
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
          divider={false}
          bodyPadding={false}
        >
          <TableScrollFadeContainer>
            <table className="w-full">
              <thead>
                <TableTheadTr bordered>
                  <TableTh scope="col">
                    <Trans>Referral Code</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Total Volume</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Traders Referred</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>Total Rebates</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {currentAffiliatesData.map((stat, index) => {
                  return (
                    <TableTr key={index} hoverable={false} bordered={false}>
                      <TableTd data-label="Referral Code">
                        <div className="table-referral-code">
                          <span className="referral-text ">{stat.referralCode}</span>
                          <div
                            onClick={() => {
                              trackCopyCode();
                              copyToClipboard(getReferralCodeTradeUrl(stat.referralCode));
                              helperToast.success("Referral link copied to your clipboard");
                            }}
                            className="referral-code-icon"
                          >
                            <BiCopy />
                          </div>
                          <TrackingLink onClick={trackShareTwitter}>
                            <a
                              href={getTwitterShareUrl(stat.referralCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="referral-code-icon"
                            >
                              <FiTwitter />
                            </a>
                          </TrackingLink>
                          <ReferralCodeWarnings allOwnersOnOtherChains={stat?.allOwnersOnOtherChains} />
                        </div>
                      </TableTd>
                      <TableTd data-label="Total Volume">
                        <Tooltip
                          handle={`$${getUSDValue(stat.volume)}`}
                          position="bottom-start"
                          className="whitespace-nowrap"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow label={t`Volume on V1`} value={getUSDValue(stat?.v1Data.volume)} />
                              <StatsTooltipRow label={t`Volume on V2`} value={getUSDValue(stat?.v2Data.volume)} />
                            </>
                          )}
                        />
                      </TableTd>
                      <TableTd data-label="Traders Referred">{stat.registeredReferralsCount}</TableTd>
                      <TableTd data-label="Total Rebates">
                        <Tooltip
                          handle={`$${getUSDValue(stat.affiliateRebateUsd)}`}
                          position="bottom-start"
                          className="whitespace-nowrap"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                label={t`Rebates on V1`}
                                value={getUSDValue(stat.v1Data.affiliateRebateUsd)}
                              />
                              <StatsTooltipRow
                                label={t`Rebates on V2`}
                                value={getUSDValue(stat.v2Data.affiliateRebateUsd)}
                              />
                            </>
                          )}
                        />
                      </TableTd>
                    </TableTr>
                  );
                })}
                {currentAffiliatesData.length > 0 && currentAffiliatesData.length < DEFAULT_PAGE_SIZE && (
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  <tr style={{ height: 43 * (DEFAULT_PAGE_SIZE - currentAffiliatesData.length) }}></tr>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination
            page={currentAffiliatesPage}
            pageCount={affiliatesPageCount}
            onPageChange={setCurrentAffiliatesPage}
          />
        </Card>
      </div>
      {currentRebateData.length > 0 ? (
        <div className="reward-history">
          <Card
            title={
              <span className="text-body-large">
                <Trans>Rebates Distribution History</Trans>
              </span>
            }
            tooltipText={t`V1 Rebates and V1/V2 esGMX are airdropped weekly. V2 Rebates are claimed manually.`}
            bodyPadding={false}
            divider={false}
          >
            <TableScrollFadeContainer>
              <table className="w-full min-w-max">
                <thead>
                  <TableTheadTr bordered>
                    <TableTh scope="col">
                      <Trans>Date</Trans>
                    </TableTh>
                    <TableTh scope="col">
                      <Trans>Type</Trans>
                    </TableTh>
                    <TableTh scope="col">
                      <Trans>Amount</Trans>
                    </TableTh>
                    <TableTh scope="col">
                      <Trans>Transaction</Trans>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {currentRebateData.map((rebate, index) => {
                    let rebateType = "-";

                    if (rebate.typeId === RebateDistributionType.Rebate) {
                      if (rebate.tokens[0] === esGmxAddress) {
                        rebateType = t`V1 esGMX`;
                      } else {
                        rebateType = t`V1 Airdrop`;
                      }
                    } else if (rebate.typeId === RebateDistributionType.Claim) {
                      rebateType = t`V2 Claim`;
                    }

                    const amountsByTokens = rebate.tokens.reduce(
                      (acc, tokenAddress, i) => {
                        let token;
                        try {
                          token = getToken(chainId, tokenAddress);
                        } catch (error) {
                          token = getNativeToken(chainId);
                        }
                        acc[token.address] = acc[token.address] ?? 0n;
                        acc[token.address] = acc[token.address] + rebate.amounts[i];
                        return acc;
                      },
                      {} as { [address: string]: bigint }
                    );

                    const tokensWithoutPrices: string[] = [];

                    const totalUsd = rebate.amountsInUsd.reduce((acc, usdAmount, i) => {
                      if (usdAmount == 0n && rebate.amounts[i] != 0n) {
                        tokensWithoutPrices.push(rebate.tokens[i]);
                      }

                      return acc + usdAmount;
                    }, 0n);

                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <TableTr key={index} hoverable={false} bordered={false}>
                        <TableTd data-label="Date">{formatDate(rebate.timestamp)}</TableTd>
                        <TableTd data-label="Type">{rebateType}</TableTd>
                        <TableTd data-label="Amount">
                          <Tooltip
                            className="whitespace-nowrap"
                            handle={
                              <div className="Rebate-amount-value">
                                {tokensWithoutPrices.length > 0 && (
                                  <>
                                    <IoWarningOutline color="#ffba0e" size={16} />
                                    &nbsp;
                                  </>
                                )}
                                ${getUSDValue(totalUsd)}
                              </div>
                            }
                            renderContent={() => (
                              <>
                                {tokensWithoutPrices.length > 0 && (
                                  <>
                                    <Trans>
                                      USD Value may not be accurate since the data does not contain prices for{" "}
                                      {tokensWithoutPrices
                                        .map((address) => getToken(chainId, address).symbol)
                                        .join(", ")}
                                    </Trans>
                                    <br />
                                    <br />
                                  </>
                                )}
                                {Object.keys(amountsByTokens).map((tokenAddress) => {
                                  const token = getToken(chainId, tokenAddress);

                                  return (
                                    <>
                                      <StatsTooltipRow
                                        key={tokenAddress}
                                        showDollar={false}
                                        label={token.symbol}
                                        value={formatBalanceAmount(amountsByTokens[tokenAddress], token.decimals)}
                                      />
                                    </>
                                  );
                                })}
                              </>
                            )}
                          />
                        </TableTd>
                        <TableTd data-label="Transaction">
                          <ExternalLink href={explorerURL + `tx/${rebate.transactionHash}`}>
                            {shortenAddress(rebate.transactionHash, 13)}
                          </ExternalLink>
                        </TableTd>
                      </TableTr>
                    );
                  })}
                  {currentRebateData.length < DEFAULT_PAGE_SIZE && (
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    <tr style={{ height: 42.5 * (DEFAULT_PAGE_SIZE - currentRebateData.length) }}></tr>
                  )}
                </tbody>
              </table>
            </TableScrollFadeContainer>
            <BottomTablePagination
              page={currentRebatePage}
              pageCount={rebatePageCount}
              onPageChange={setCurrentRebatePage}
            />
          </Card>
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
