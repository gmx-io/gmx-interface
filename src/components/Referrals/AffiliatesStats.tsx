import { msg, t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { ReferralCodeStats, TotalReferralsStats, useTiers } from "domain/referrals";
import { useMarketsInfoRequest } from "domain/synthetics/markets";
import { TimeRangeInfo, useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatBigUsd, formatUsd } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralCreateCodeEvent, ReferralShareEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import CopyIcon from "img/ic_copy.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import ShareIcon from "img/ic_share.svg?react";

import { AffiliateCodeFormContainer } from "./AddAffiliateCode";
import {
  NumberOfTradesChartCard,
  RebatesChartCard,
  TradersReferredChartCard,
  TradingVolumeChartCard,
} from "./AffiliatesOverviewChartCards";
import Modal from "../Modal/Modal";
import { ClaimAffiliatesModal } from "./ClaimAffiliatesModal/ClaimAffiliatesModal";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";
import { AFFILIATE_POST_WIZARD_FAQS } from "./ReferralsAffiliatesFaq";
import {
  getReferralCodeTradeUrl,
  getSharePercentage,
  getTierIdDisplay,
  getTwitterShareUrl,
  getUsdValue,
  isRecentReferralCodeNotExpired,
} from "./referralsHelper";
import usePagination from "./usePagination";

import "./AffiliatesStats.scss";

const TIME_RANGE_INFOS: TimeRangeInfo[] = [
  { slug: "24h", days: 1, title: msg`${24}h` },
  { slug: "7d", days: 7, title: msg`${7}d` },
  { slug: "30d", days: 30, title: msg`${30}d` },
  { slug: "90d", days: 90, title: msg`${90}d` },
  { slug: "total", days: 0, title: msg`Total` },
];

function PoolsTimeRangeFilter({
  setTimeRange,
  timeRange,
  timeRangeInfos,
}: {
  setTimeRange: (timeRange: string) => void;
  timeRange: string;
  timeRangeInfos: TimeRangeInfo[];
}) {
  const { _ } = useLingui();
  const tabs = useMemo(
    () =>
      timeRangeInfos.map((item) => ({
        label: _(item.title),
        value: item.slug,
      })),
    [_, timeRangeInfos]
  );

  return (
    <PoolsTabs<string>
      tabs={tabs}
      selected={timeRange}
      setSelected={setTimeRange}
      itemClassName="bg-slate-700 text-typography-secondary"
    />
  );
}

type Props = {
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
  setRecentlyAddedCodes: (codes: ReferralCodeStats[]) => void;
  recentlyAddedCodes?: ReferralCodeStats[];
};

export function AffiliatesStats({
  referralsData,
  recentlyAddedCodes,
  handleCreateReferralCode,
  setRecentlyAddedCodes,
}: Props) {
  const { chainId, srcChainId } = useChainId();
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef<HTMLDivElement>(null);

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { affiliateRewardsData } = useAffiliateRewards(chainId);

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

  const { chains } = referralsData || {};
  const { [chainId]: currentReferralsData } = chains || {};

  const { affiliateTierInfo, affiliateReferralCodesStats } = currentReferralsData || {};
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
  const { totalRebate } = useTiers(chainId, tierId);
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

  const { timeRangeInfo, periodStart, periodEnd, setTimeRange } = useTimeRange(
    "referrals-affiliates-time-range",
    TIME_RANGE_INFOS
  );

  const mainContent = (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
        <div className="flex items-center justify-between">
          <div className="text-body-large font-medium text-typography-primary">
            <Trans>Overview</Trans>
          </div>
          <div className="flex items-center gap-8">
            <PoolsTimeRangeFilter
              timeRange={timeRangeInfo.slug}
              setTimeRange={setTimeRange}
              timeRangeInfos={TIME_RANGE_INFOS}
            />
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
            <TradingVolumeChartCard periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
            <NumberOfTradesChartCard periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
            <TradersReferredChartCard periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
            <RebatesChartCard periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
          </div>
        </div>
        <div className="text-body-small font-medium text-typography-secondary">
          <span className="text-slate-500">
            <Trans>Last Updated:</Trans>
          </span>{" "}
          2025-08-18 15:04:04 UTC
        </div>
      </div>

      <Modal
        className="Connect-wallet-modal"
        isVisible={isAddReferralCodeModalOpen}
        setIsVisible={close}
        label={t`Create Referral Code`}
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
      <div className="flex w-full flex-col gap-8 rounded-8 bg-slate-900">
        <div className="flex items-center justify-between px-20 pt-20">
          <p className="title text-body-large">
            <Trans>Referral Codes</Trans>{" "}
            <span className="rounded-full bg-cold-blue-900 px-8 py-4 text-12 font-medium leading-[1.25] text-blue-300">
              {affiliateTierInfo && t`Tier ${getTierIdDisplay(tierId)}: ${currentRebatePercentage}% rebate`}
            </span>
          </p>
          <Button variant="ghost" onClick={open} size="small">
            <Trans>Create new code</Trans>
            <PlusIcon />
          </Button>
        </div>
        <TableScrollFadeContainer>
          <table className="w-full min-w-full">
            <thead>
              <TableTheadTr>
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
                    <TableTd data-label="Referral Code">
                      <div className="flex items-center gap-8">
                        <span className="referral-text">{stat.referralCode}</span>
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
                              label={t`Volume on V1`}
                              value={getUsdValue(stat?.v1Data.volume)}
                              valueClassName="numbers"
                            />
                            <StatsTooltipRow
                              label={t`Volume on V2`}
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
                              label={t`Rebates on V1`}
                              value={getUsdValue(stat.v1Data.affiliateRebateUsd)}
                              valueClassName="numbers"
                            />
                            <StatsTooltipRow
                              label={t`Rebates on V2`}
                              value={getUsdValue(stat.v2Data.affiliateRebateUsd)}
                              valueClassName="numbers"
                            />
                          </>
                        )}
                      />
                    </TableTd>
                    <TableTd data-label="Actions" className="whitespace-nowrap">
                      <div className="flex items-center justify-end gap-4">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => {
                            trackCopyCode();
                            copyToClipboard(getReferralCodeTradeUrl(stat.referralCode));
                            helperToast.success("Referral link copied to your clipboard");
                          }}
                          className="gap-4"
                        >
                          <Trans>Copy</Trans>
                          <CopyIcon className="size-16" />
                        </Button>
                        <TrackingLink onClick={trackShareTwitter}>
                          <Button
                            variant="ghost"
                            size="small"
                            to={getTwitterShareUrl(stat.referralCode)}
                            newTab
                            className="gap-4"
                          >
                            <Trans>Share</Trans>
                            <ShareIcon className="size-16" />
                          </Button>
                        </TrackingLink>
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

      {isClaiming && <ClaimAffiliatesModal onClose={() => setIsClaiming(false)} />}
    </div>
  );

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">{mainContent}</div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <div className="rounded-8 bg-slate-900 p-20">
          <div className="text-body-medium mb-8 font-medium text-typography-secondary">
            <Trans>Claimable Rebates</Trans>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="text-24 font-medium text-typography-primary numbers">
              {formatUsd(totalClaimableRewardsUsd)}
            </div>
            <Button variant="primary" onClick={() => setIsClaiming(true)} disabled={totalClaimableRewardsUsd <= 0}>
              <Trans>Claim Rebates</Trans>
              <EarnIcon className="size-16" />
            </Button>
          </div>
        </div>
        <Faq items={AFFILIATE_POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </div>
  );
}
