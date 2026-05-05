import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { lightFormat } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useCallback, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { TotalReferralsStats, useTiers } from "domain/referrals";
import { useAffiliateReferralStats } from "domain/referrals/hooks/useAffiliateReferralStats";
import { type ReferralCodeStats } from "domain/referrals/types";
import { getReferralCodeTradeUrl, getSharePercentage, getTierIdDisplay } from "domain/referrals/utils/referralsHelper";
import { useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatBigUsd, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralCreateCodeEvent, ReferralShareEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { GridCell, GridHeaderCell, GridRow } from "components/Referrals/distributions/table/Grid";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import ShareIcon from "img/ic_share.svg?react";

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
import { AffiliatesPromoCard } from "./AffiliatesPromoCard";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";

type Props = {
  account?: string;
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
};

export function AffiliatesStats({ account, referralsData, handleCreateReferralCode }: Props) {
  const { chainId } = useChainId();
  const { isMobile } = useBreakpoints();
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
    <div className="flex gap-8 max-md:flex-col max-md:pb-[100px]">
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
            <div className="flex flex-wrap items-center justify-between px-adaptive pt-adaptive">
              <div className="flex flex-wrap items-center gap-8">
                <div className="text-body-large max-md:text-body-medium">
                  <Trans>Referral codes</Trans>
                </div>
                {affiliateTierInfo && tierId !== undefined && (
                  <div className="rounded-full bg-cold-blue-900 px-8 py-[2.5px] text-12 font-medium leading-[1.25] text-blue-300">
                    {t`Tier ${getTierIdDisplay(tierId)}: ${currentRebatePercentage}% rebate`}
                  </div>
                )}
              </div>
              <button
                className="text-body-medium flex items-center gap-4 font-medium text-blue-300 transition-colors hover:text-typography-primary"
                onClick={open}
              >
                {!isMobile ? <Trans>Create new code</Trans> : <Trans>Create</Trans>}
                <PlusIcon className="size-16" />
              </button>
            </div>
            {isMobile ? (
              <ReferralCodesMobileTable
                data={currentAffiliatesData}
                trackCopyCode={trackCopyCode}
                trackShare={trackShare}
                copyToClipboard={copyToClipboard}
                setShareModalState={setShareModalState}
              />
            ) : (
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
            )}
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
        <div className="max-md:order-1 max-md:contents">
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

const DETAIL_ROW_VARIANTS = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1 },
} as const;

const DETAIL_ROW_TRANSITION = { duration: 0.22, ease: "easeInOut" } as const;

function ReferralCodesMobileTable({
  data,
  trackCopyCode,
  trackShare,
  copyToClipboard,
  setShareModalState,
}: {
  data: ReferralCodeStats[];
  trackCopyCode: () => void;
  trackShare: () => void;
  copyToClipboard: (text: string) => void;
  setShareModalState: (state: {
    isVisible: boolean;
    referralCode: string;
    totalDiscountsUsd?: bigint;
    hasReferredUsers?: boolean;
  }) => void;
}) {
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);

  const toggleSelectedCode = useCallback((code: string) => {
    setSelectedCode((prev) => (prev === code ? undefined : code));
  }, []);

  return (
    <div role="table" className="grid grid-cols-[1fr_1fr_auto] gap-y-4 px-4">
      <GridRow>
        <GridHeaderCell>
          <Trans>Code</Trans>
        </GridHeaderCell>
        <GridHeaderCell className="col-span-2 text-right">
          <Trans>Total Volume</Trans>
        </GridHeaderCell>
        <GridHeaderCell />
      </GridRow>

      {data.map((stat) => (
        <Fragment key={stat.referralCode}>
          <GridRow className="text-typography-primary" onClick={() => toggleSelectedCode(stat.referralCode)}>
            <GridCell>
              <div className="flex items-center gap-4">
                <span className="font-mono">{stat.referralCode}</span>
                <ReferralCodeWarnings allOwnersOnOtherChains={stat?.allOwnersOnOtherChains} />
              </div>
            </GridCell>
            <GridCell className="text-right numbers">{formatBigUsd(stat.volume)}</GridCell>
            <GridCell className="flex items-center justify-end">
              <ChevronDownIcon
                className={cx("size-16 text-typography-secondary", {
                  "rotate-180": selectedCode === stat.referralCode,
                })}
              />
            </GridCell>
          </GridRow>

          <AnimatePresence initial={false}>
            {selectedCode === stat.referralCode && (
              <motion.div
                className="col-span-full overflow-hidden rounded-b-8 px-adaptive text-[13px]"
                variants={DETAIL_ROW_VARIANTS}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={DETAIL_ROW_TRANSITION}
              >
                <div className="text-body-small flex items-center justify-between py-4">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Traders Referred</Trans>
                  </span>
                  <span className="numbers">{stat.registeredReferralsCount}</span>
                </div>

                <div className="text-body-small flex items-center justify-between py-4">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Total Rebates</Trans>
                  </span>
                  <span className="numbers">{formatBigUsd(stat.affiliateRebateUsd)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-12 pt-8">
                  <Button
                    variant="secondary"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
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
                    variant="secondary"
                    className="gap-4"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
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
              </motion.div>
            )}
          </AnimatePresence>
        </Fragment>
      ))}
    </div>
  );
}
