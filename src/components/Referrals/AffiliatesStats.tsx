import { t, Trans } from "@lingui/macro";
import { useCallback, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, ContractsChainId, getExplorerUrl, SourceChainId } from "config/chains";
import { isDevelopment } from "config/env";
import { RebateDistributionType, ReferralCodeStats, TotalReferralsStats, useTiers } from "domain/referrals";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { formatDate } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { shortenAddress } from "lib/legacy";
import { formatBalanceAmount, formatBigUsd, formatUsd } from "lib/numbers";
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

import CopyIcon from "img/ic_copy.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import WarnIcon from "img/ic_warn.svg?react";
import TwitterIcon from "img/ic_x.svg?react";

import { AffiliateCodeFormContainer } from "./AddAffiliateCode";
import { ClaimAffiliatesModal } from "./ClaimAffiliatesModal/ClaimAffiliatesModal";
import EmptyMessage from "./EmptyMessage";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";
import ReferralInfoCard from "./ReferralInfoCard";
import {
  getReferralCodeTradeUrl,
  getSharePercentage,
  getTierIdDisplay,
  getTwitterShareUrl,
  getUsdValue,
  isRecentReferralCodeNotExpired,
} from "./referralsHelper";
import usePagination, { DEFAULT_PAGE_SIZE } from "./usePagination";
import Card from "../Card/Card";
import Modal from "../Modal/Modal";

import "./AffiliatesStats.scss";

type Props = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  setRecentlyAddedCodes: (codes: ReferralCodeStats[]) => void;
  recentlyAddedCodes?: ReferralCodeStats[];
};

function AffiliatesStats({
  chainId,
  srcChainId,
  referralsData,
  recentlyAddedCodes,
  handleCreateReferralCode,
  setRecentlyAddedCodes,
}: Props) {
  const { signer } = useWallet();
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef<HTMLDivElement>(null);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
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
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-4 max-lg:grid-cols-1">
        <ReferralInfoCard
          value={String(currentReferralsData?.affiliateTotalStats.registeredReferralsCount || 0)}
          label={t`Traders referred`}
          labelTooltipText={t`Number of traders using your referral code`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`Traders referred on Arbitrum`}
                value={arbitrumData.affiliateTotalStats.registeredReferralsCount}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`Traders referred on Avalanche`}
                value={avalancheData.affiliateTotalStats.registeredReferralsCount}
                showDollar={false}
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`Traders referred on Avalanche Fuji`}
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
          value={formatBigUsd(currentReferralsData?.affiliateTotalStats?.volume)}
          label={t`Trading volume`}
          labelTooltipText={t`Total trading volume from your referrals`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUsdValue(arbitrumData?.affiliateTotalStats.v1Data.volume)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUsdValue(avalancheData?.affiliateTotalStats.v1Data.volume)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.affiliateTotalStats.v1Data.volume)}
                  valueClassName="numbers"
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUsdValue(arbitrumData?.affiliateTotalStats.v2Data.volume)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUsdValue(avalancheData?.affiliateTotalStats.v2Data.volume)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.affiliateTotalStats.v2Data.volume)}
                  valueClassName="numbers"
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow label={t`Total`} value={getUsdValue(total?.affiliateVolume)} valueClassName="numbers" />
            </>
          }
        />
        <ReferralInfoCard
          value={formatBigUsd(currentReferralsData?.affiliateTotalStats?.affiliateRebateUsd)}
          label={t`Rebates`}
          labelTooltipText={t`Your affiliate earnings from referrals`}
          tooltipContent={
            <>
              <StatsTooltipRow
                label={t`V1 Arbitrum`}
                value={getUsdValue(arbitrumData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V1 Avalanche`}
                value={getUsdValue(avalancheData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V1 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.affiliateTotalStats.v1Data.affiliateRebateUsd)}
                  valueClassName="numbers"
                />
              )}
              <StatsTooltipRow
                label={t`V2 Arbitrum`}
                value={getUsdValue(arbitrumData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
                valueClassName="numbers"
              />
              <StatsTooltipRow
                label={t`V2 Avalanche`}
                value={getUsdValue(avalancheData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
                valueClassName="numbers"
              />
              {isDevelopment() && (
                <StatsTooltipRow
                  label={t`V2 Avalanche Fuji`}
                  value={getUsdValue(fujiData?.affiliateTotalStats.v2Data.affiliateRebateUsd)}
                  valueClassName="numbers"
                />
              )}
              <div className="Tooltip-divider" />
              <StatsTooltipRow
                label={t`Total`}
                value={getUsdValue(total?.affiliateRebateUsd)}
                valueClassName="numbers"
              />
            </>
          }
        />
        <ReferralInfoCard
          label={t`Claimable rebates`}
          value={<span className="numbers">{formatUsd(totalClaimableRewardsUsd, { displayDecimals: 4 })}</span>}
          labelTooltipText={t`Available to claim now`}
          className="AffiliateStats-claimable-rewards-card"
        >
          <div className="AffiliateStats-claimable-rewards-container flex flex-col gap-6">
            {(totalClaimableRewardsUsd > 0 && (
              <Button variant="secondary" onClick={() => setIsClaiming(true)}>
                Claim
              </Button>
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
          label={t`Create referral code`}
          onAfterOpen={() => addNewModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <AffiliateCodeFormContainer
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
                <Trans>Referral codes</Trans>{" "}
                <span className="rounded-full bg-cold-blue-900 px-8 py-4 text-12 font-medium leading-[1.25] text-typography-secondary">
                  {affiliateTierInfo && t`Tier ${getTierIdDisplay(tierId)}: ${currentRebatePercentage}% rebate`}
                </span>
              </p>
              <Button variant="secondary" onClick={open} size="small">
                <Trans>Create new code</Trans>
                <PlusIcon />
              </Button>
            </div>
          }
          divider={true}
          bodyPadding={false}
        >
          <TableScrollFadeContainer>
            <table className="w-full">
              <thead>
                <TableTheadTr>
                  <TableTh scope="col">
                    <Trans>REFERRAL CODE</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TOTAL VOLUME</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TRADERS REFERRED</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TOTAL REBATES</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {currentAffiliatesData.map((stat, index) => {
                  return (
                    <TableTr key={index}>
                      <TableTd data-label="Referral Code">
                        <div className="flex items-center gap-8">
                          <span className="referral-text ">{stat.referralCode}</span>
                          <div
                            onClick={() => {
                              trackCopyCode();
                              copyToClipboard(getReferralCodeTradeUrl(stat.referralCode));
                              helperToast.success("Referral link copied to your clipboard");
                            }}
                            className="referral-code-icon size-14 text-typography-secondary hover:text-typography-primary"
                          >
                            <CopyIcon className="size-14" />
                          </div>
                          <TrackingLink onClick={trackShareTwitter}>
                            <a
                              href={getTwitterShareUrl(stat.referralCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="referral-code-icon size-14 text-typography-secondary hover:text-typography-primary"
                            >
                              <TwitterIcon />
                            </a>
                          </TrackingLink>
                          <ReferralCodeWarnings allOwnersOnOtherChains={stat?.allOwnersOnOtherChains} />
                        </div>
                      </TableTd>
                      <TableTd data-label="Total Volume">
                        <Tooltip
                          handle={formatBigUsd(stat.volume)}
                          handleClassName="numbers"
                          position="bottom-start"
                          className="whitespace-nowrap"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                label={t`V1 volume`}
                                value={getUsdValue(stat?.v1Data.volume)}
                                valueClassName="numbers"
                              />
                              <StatsTooltipRow
                                label={t`V2 volume`}
                                value={getUsdValue(stat?.v2Data.volume)}
                                valueClassName="numbers"
                              />
                            </>
                          )}
                        />
                      </TableTd>
                      <TableTd data-label="Traders Referred" className="numbers">
                        {stat.registeredReferralsCount}
                      </TableTd>
                      <TableTd data-label="Total Rebates">
                        <Tooltip
                          handle={formatBigUsd(stat.affiliateRebateUsd)}
                          handleClassName="numbers"
                          position="bottom-start"
                          className="whitespace-nowrap"
                          renderContent={() => (
                            <>
                              <StatsTooltipRow
                                label={t`V1 rebates`}
                                value={getUsdValue(stat.v1Data.affiliateRebateUsd)}
                                valueClassName="numbers"
                              />
                              <StatsTooltipRow
                                label={t`V2 rebates`}
                                value={getUsdValue(stat.v2Data.affiliateRebateUsd)}
                                valueClassName="numbers"
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
        <Card
          title={
            <span className="text-body-large">
              <Trans>Rebates distribution history</Trans>
            </span>
          }
          tooltipText={t`Distribution history for claimed rebates and airdrops`}
          bodyPadding={false}
          divider={true}
        >
          <TableScrollFadeContainer>
            <table className="w-full min-w-max">
              <thead>
                <TableTheadTr>
                  <TableTh scope="col">
                    <Trans>DATE</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TYPE</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>AMOUNT</Trans>
                  </TableTh>
                  <TableTh scope="col">
                    <Trans>TRANSACTION</Trans>
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
                      rebateType = t`V1 airdrop`;
                    }
                  } else if (rebate.typeId === RebateDistributionType.Claim) {
                    rebateType = t`V2 claim`;
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
                    <TableTr key={index}>
                      <TableTd data-label="Date">{formatDate(rebate.timestamp)}</TableTd>
                      <TableTd data-label="Type">{rebateType}</TableTd>
                      <TableTd data-label="Amount">
                        <Tooltip
                          className="whitespace-nowrap"
                          handle={
                            <div className="Rebate-amount-value numbers">
                              {tokensWithoutPrices.length > 0 && (
                                <>
                                  <WarnIcon className="size-20 text-yellow-300" />
                                  &nbsp;
                                </>
                              )}
                              {formatBigUsd(totalUsd)}
                            </div>
                          }
                          renderContent={() => (
                            <>
                              {tokensWithoutPrices.length > 0 && (
                                <>
                                  <Trans>
                                    USD value may be inaccurate. Price data unavailable for{" "}
                                    {tokensWithoutPrices.map((address) => getToken(chainId, address).symbol).join(", ")}
                                    .
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
                                      value={formatBalanceAmount(
                                        amountsByTokens[tokenAddress],
                                        token.decimals,
                                        undefined,
                                        { isStable: token.isStable }
                                      )}
                                      valueClassName="numbers"
                                    />
                                  </>
                                );
                              })}
                            </>
                          )}
                        />
                      </TableTd>
                      <TableTd data-label="Transaction">
                        <ExternalLink
                          className="text-typography-secondary hover:text-typography-primary"
                          variant="icon"
                          href={explorerURL + `tx/${rebate.transactionHash}`}
                        >
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
      ) : (
        <EmptyMessage
          tooltipText={t`Distribution history for claimed rebates and airdrops`}
          message={t`No rebates distribution history yet`}
        />
      )}

      {isClaiming && <ClaimAffiliatesModal onClose={() => setIsClaiming(false)} />}
    </div>
  );
}

export default AffiliatesStats;
