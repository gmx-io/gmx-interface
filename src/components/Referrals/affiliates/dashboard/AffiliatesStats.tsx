import { t, Trans } from "@lingui/macro";
import { lightFormat } from "date-fns";
import { useCallback, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { TotalReferralsStats, useTiers } from "domain/referrals";
import { useAffiliateReferralStats } from "domain/referrals/hooks/useAffiliateReferralStats";
import { getReferralCodeTradeUrl, getSharePercentage, getTierIdDisplay } from "domain/referrals/utils/referralsHelper";
import { useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatBigUsd, formatUsd } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralCreateCodeEvent, ReferralShareEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";

import CopyIcon from "img/ic_copy.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import ShareIcon from "img/ic_share.svg?react";

import { AffiliatesPromoCard } from "./AffiliatesPromoCard";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";
import { ClaimableRebatesCard } from "../../shared/cards/ClaimableRebatesCard";
import { ReferralsDocsCard } from "../../shared/cards/ReferralsDocsCard";
import { ShareReferralCardModal } from "../../shared/cards/ShareReferralCardModal";
import { REFERRALS_TIME_RANGE_INFOS, TimeRangeFilter } from "../../shared/TimeRangeFilter";
import { AffiliateCodeFormContainer } from "../createCode/AddAffiliateCode";
import { AFFILIATE_POST_WIZARD_FAQS } from "../faq";
import {
  NumberOfTradesChartCard,
  RebatesChartCard,
  TradersReferredChartCard,
  TradingVolumeChartCard,
} from "./AffiliatesOverviewChartCards";

type Props = {
  account?: string;
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
};

export function AffiliatesStats({ account, referralsData, handleCreateReferralCode }: Props) {
  const { chainId } = useChainId();
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const [shareModalState, setShareModalState] = useState<{
    isVisible: boolean;
    referralCode: string;
    totalDiscountsUsd?: bigint;
    hasReferredUsers?: boolean;
  }>({
    isVisible: false,
    referralCode: "",
  });
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

  const affiliateTierInfo = referralsData?.chains[chainId]?.affiliateTierInfo;
  const affiliateReferralCodesStats = referralsData?.chains[chainId]?.affiliateReferralCodesStats;

  const {
    currentPage: currentAffiliatesPage,
    getCurrentData: getCurrentAffiliatesData,
    setCurrentPage: setCurrentAffiliatesPage,
    pageCount: affiliatesPageCount,
  } = usePagination("Affiliates", affiliateReferralCodesStats);

  const currentAffiliatesData = getCurrentAffiliatesData();
  const tierId = affiliateTierInfo?.tierId;
  const discountShare = affiliateTierInfo?.discountShare;
  const { totalRebate } = useTiers(chainId, tierId);
  const currentRebatePercentage = getSharePercentage(tierId, discountShare, totalRebate, true);
  const currentTraderDiscountPercentage = getSharePercentage(tierId, discountShare, totalRebate);

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

  const trackShare = useCallback(() => {
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

  const { timeRangeInfo, periodStart, periodEnd, setTimeRange } = useTimeRange(
    "referrals-affiliates-time-range",
    REFERRALS_TIME_RANGE_INFOS
  );
  const { data: referralStats, isLoading: isReferralStatsLoading } = useAffiliateReferralStats({
    chainId,
    affiliate: account,
    from: periodStart,
    to: periodEnd,
  });
  const lastUpdated = referralStats?.to
    ? `${lightFormat(referralStats.to * 1000, "yyyy-MM-dd HH:mm:ss")} UTC`
    : undefined;

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8 max-md:order-2">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-adaptive">
            <div className="flex items-center justify-between">
              <div className="text-body-large font-medium text-typography-primary">
                <Trans>Overview</Trans>
              </div>
              <div className="flex items-center gap-8">
                <TimeRangeFilter
                  timeRange={timeRangeInfo.slug}
                  setTimeRange={setTimeRange}
                  timeRangeInfos={REFERRALS_TIME_RANGE_INFOS}
                />
              </div>
            </div>
            <AffiliatesPromoCard account={account} />
            <div className="flex flex-col gap-12">
              <div className="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
                <TradingVolumeChartCard
                  stats={referralStats}
                  isLoading={isReferralStatsLoading}
                  timeRangeInfo={timeRangeInfo}
                  referralCode={affiliateReferralCodesStats?.[0]?.referralCode}
                  traderDiscountPercentage={currentTraderDiscountPercentage}
                  totalDiscountsUsd={referralsData?.chains?.[chainId]?.affiliateTotalStats?.discountUsd}
                  hasReferredUsers={
                    (referralsData?.chains?.[chainId]?.affiliateTotalStats?.registeredReferralsCount ?? 0) > 0
                  }
                />
                <NumberOfTradesChartCard
                  stats={referralStats}
                  isLoading={isReferralStatsLoading}
                  timeRangeInfo={timeRangeInfo}
                />
                <TradersReferredChartCard
                  stats={referralStats}
                  isLoading={isReferralStatsLoading}
                  timeRangeInfo={timeRangeInfo}
                />
                <RebatesChartCard
                  stats={referralStats}
                  isLoading={isReferralStatsLoading}
                  timeRangeInfo={timeRangeInfo}
                />
              </div>
            </div>
            <div className="text-body-small font-medium text-typography-secondary">
              <span className="text-slate-500">
                <Trans>Last Updated:</Trans>
              </span>{" "}
              {lastUpdated ?? "—"}
            </div>
          </div>

          <div className="flex w-full flex-col gap-8 rounded-8 bg-slate-900 pb-4">
            <div className="flex items-center justify-between px-adaptive pt-adaptive">
              <p className="title text-body-large flex items-center gap-8">
                <Trans>Referral codes</Trans>
                {affiliateTierInfo && tierId !== undefined && (
                  <span className="rounded-full bg-cold-blue-900 px-8 py-4 text-12 font-medium leading-[1.25] text-blue-300">
                    {t`Tier ${getTierIdDisplay(tierId)}: ${currentRebatePercentage}% rebate`}
                  </span>
                )}
              </p>
              <button
                className="text-body-medium flex items-center gap-4 font-medium text-blue-300 transition-colors hover:text-typography-primary"
                onClick={open}
              >
                <Trans>Create new code</Trans>
                <PlusIcon className="size-16" />
              </button>
            </div>
            <TableScrollFadeContainer>
              <table className="w-full min-w-full">
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
                    <TableTh scope="col" className="w-0">
                      <span className="sr-only">
                        <Trans>Actions</Trans>
                      </span>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {currentAffiliatesData.map((stat, index) => {
                    return (
                      <TableTr key={index}>
                        <TableTd>
                          <div className="flex items-center gap-4">
                            <span className="font-mono">{stat.referralCode}</span>
                            <ReferralCodeWarnings allOwnersOnOtherChains={stat?.allOwnersOnOtherChains} />
                          </div>
                        </TableTd>
                        <TableTd>
                          <Tooltip
                            handle={formatBigUsd(stat.volume)}
                            handleClassName="numbers"
                            position="bottom-start"
                            className="whitespace-nowrap"
                            content={
                              <>
                                <StatsTooltipRow
                                  label={t`V1 volume`}
                                  value={formatBigUsd(stat?.v1Data.volume ?? 0n)}
                                  valueClassName="numbers"
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`V2 volume`}
                                  value={formatBigUsd(stat?.v2Data.volume ?? 0n)}
                                  valueClassName="numbers"
                                  showDollar={false}
                                />
                              </>
                            }
                          />
                        </TableTd>
                        <TableTd className="numbers">{stat.registeredReferralsCount}</TableTd>
                        <TableTd>
                          <Tooltip
                            handle={formatBigUsd(stat.affiliateRebateUsd)}
                            handleClassName="numbers"
                            position="bottom-start"
                            className="whitespace-nowrap"
                            content={
                              <>
                                <StatsTooltipRow
                                  label={t`V1 rebates`}
                                  value={formatUsd(stat.v1Data.affiliateRebateUsd, { fallbackToZero: true })}
                                  valueClassName="numbers"
                                  showDollar={false}
                                />
                                <StatsTooltipRow
                                  label={t`V2 rebates`}
                                  value={formatUsd(stat.v2Data.affiliateRebateUsd, { fallbackToZero: true })}
                                  valueClassName="numbers"
                                  showDollar={false}
                                />
                              </>
                            }
                          />
                        </TableTd>
                        <TableTd className="whitespace-nowrap">
                          <div className="flex items-center justify-end gap-4">
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => {
                                trackCopyCode();
                                copyToClipboard(getReferralCodeTradeUrl(stat.referralCode));
                                helperToast.success(t`Referral link copied to your clipboard`);
                              }}
                              className="gap-4"
                            >
                              <Trans>Copy</Trans>
                              <CopyIcon className="size-16" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="small"
                              className="gap-4"
                              onClick={() => {
                                trackShare();
                                setShareModalState({
                                  isVisible: true,
                                  referralCode: stat.referralCode,
                                  totalDiscountsUsd: stat.discountUsd,
                                  hasReferredUsers: stat.registeredReferralsCount > 0,
                                });
                              }}
                            >
                              <Trans>Share</Trans>
                              <ShareIcon className="size-16" />
                            </Button>
                          </div>
                        </TableTd>
                      </TableTr>
                    );
                  })}
                </tbody>
              </table>
            </TableScrollFadeContainer>
            <BottomTablePagination
              page={currentAffiliatesPage}
              pageCount={affiliatesPageCount}
              onPageChange={setCurrentAffiliatesPage}
            />
          </div>

          <ModalWithPortal
            className="Connect-wallet-modal"
            isVisible={isAddReferralCodeModalOpen}
            setIsVisible={close}
            label={t`Create referral code`}
          >
            <div className="w-[31rem]">
              <AffiliateCodeFormContainer
                handleCreateReferralCode={handleCreateReferralCode}
                callAfterSuccess={close}
              />
            </div>
          </ModalWithPortal>
          <ShareReferralCardModal
            isVisible={shareModalState.isVisible}
            setIsVisible={(isVisible) => setShareModalState((prev) => ({ ...prev, isVisible }))}
            referralCode={shareModalState.referralCode}
            traderDiscountPercentage={currentTraderDiscountPercentage}
            totalDiscountsUsd={shareModalState.totalDiscountsUsd}
            hasReferredUsers={shareModalState.hasReferredUsers}
          />
        </div>
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:contents">
        <div className="max-md:order-1">
          <ClaimableRebatesCard />
        </div>
        <div className="max-md:order-3">
          <ReferralsDocsCard />
        </div>
        <div className="max-md:order-4">
          <Faq items={AFFILIATE_POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
        </div>
      </div>
    </div>
  );
}
