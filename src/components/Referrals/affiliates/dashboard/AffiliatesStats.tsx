import { msg, t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { lightFormat } from "date-fns";
import { useCallback, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";

import { TotalReferralsStats, useReferralPromoClosed, useTiers } from "domain/referrals";
import { useAffiliateReferralStats } from "domain/referrals/hooks/useAffiliateReferralStats";
import { TimeRangeInfo, useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getTwitterIntentURL } from "lib/legacy";
import { formatBigUsd, formatUsd } from "lib/numbers";
import { userAnalytics } from "lib/userAnalytics";
import { ReferralCreateCodeEvent, ReferralShareEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Faq } from "components/Faq/Faq";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tooltip from "components/Tooltip/Tooltip";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import CopyIcon from "img/ic_copy.svg?react";
import PlusIcon from "img/ic_plus.svg?react";
import ShareIcon from "img/ic_share.svg?react";
import referralCodePromoFg from "img/referral_code_promo_fg.png";

import { ClaimableRebatesCard } from "../../shared/cards/ClaimableRebatesCard";
import { PromoCard } from "../../shared/cards/PromoCard";
import { ReferralsDocsCard } from "../../shared/cards/ReferralsDocsCard";
import { getReferralCodeTradeUrl, getSharePercentage, getTierIdDisplay } from "../../shared/utils/referralsHelper";
import { AffiliateCodeFormContainer } from "../createCode/AddAffiliateCode";
import { AFFILIATE_POST_WIZARD_FAQS } from "../faq";
import {
  NumberOfTradesChartCard,
  RebatesChartCard,
  TradersReferredChartCard,
  TradingVolumeChartCard,
} from "./AffiliatesOverviewChartCards";
import { ReferralCodeWarnings } from "./ReferralCodeWarnings";

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
  account?: string;
  referralsData?: TotalReferralsStats;
  handleCreateReferralCode: (code: string) => Promise<unknown>;
};

export function AffiliatesStats({ account, referralsData, handleCreateReferralCode }: Props) {
  const { chainId } = useChainId();
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const addNewModalRef = useRef<HTMLDivElement>(null);

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
  const currentRebatePercentage = getSharePercentage(tierId, BigInt(discountShare ?? 0n), totalRebate, true);

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
  const { data: referralStats, isLoading: isReferralStatsLoading } = useAffiliateReferralStats({
    chainId,
    affiliate: account,
    from: periodStart,
    to: periodEnd,
  });
  const { isClosed: isAffiliatePromoClosed, close: closeAffiliatePromo } = useReferralPromoClosed("affiliate", account);

  const lastUpdated = referralStats?.to
    ? `${lightFormat(referralStats.to * 1000, "yyyy-MM-dd HH:mm:ss")} UTC`
    : undefined;

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
        {!isAffiliatePromoClosed && (
          <PromoCard
            title={<Trans>Enter the referral code and save up to 10% on fees</Trans>}
            subtitle={
              <Trans>
                Activate someone's referral code to receive a permanent discount on all opening and closing <br /> fees.
                Your savings apply automatically on every trade.{" "}
                <ExternalLink href="https://docs.gmx.io/docs/referrals" variant="icon-arrow" className="text-blue-300">
                  <Trans>Learn more</Trans>
                </ExternalLink>
              </Trans>
            }
            onClose={closeAffiliatePromo}
          >
            <img src={referralCodePromoFg} className="user-select-none absolute -bottom-22 right-28 z-10 w-[104px]" />
          </PromoCard>
        )}
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
            <TradingVolumeChartCard
              stats={referralStats}
              isLoading={isReferralStatsLoading}
              timeRangeInfo={timeRangeInfo}
              referralCode={affiliateReferralCodesStats?.[0]?.referralCode}
              totalDiscountsUsd={referralsData?.chains?.[chainId]?.affiliateTotalStats?.discountUsd}
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
            <RebatesChartCard stats={referralStats} isLoading={isReferralStatsLoading} timeRangeInfo={timeRangeInfo} />
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
        <div className="flex items-center justify-between px-20 pt-20">
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
                              value={formatUsd(stat?.v1Data.volume, { fallbackToZero: true })}
                              valueClassName="numbers"
                            />
                            <StatsTooltipRow
                              label={t`V2 volume`}
                              value={formatUsd(stat?.v2Data.volume, { fallbackToZero: true })}
                              valueClassName="numbers"
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
                            />
                            <StatsTooltipRow
                              label={t`V2 rebates`}
                              value={formatUsd(stat.v2Data.affiliateRebateUsd, { fallbackToZero: true })}
                              valueClassName="numbers"
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
                        <TrackingLink onClick={trackShareTwitter}>
                          <Button
                            variant="ghost"
                            size="small"
                            to={getTwitterIntentURL(
                              [
                                "Trying out trading on @GMX_IO, up to 100x leverage on $BTC, $ETH 📈",
                                "For fee discounts use:",
                              ],
                              getReferralCodeTradeUrl(stat.referralCode)
                            )}
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

      <ModalWithPortal
        className="Connect-wallet-modal"
        isVisible={isAddReferralCodeModalOpen}
        setIsVisible={close}
        label={t`Create referral code`}
        onAfterOpen={() => addNewModalRef.current?.focus()}
      >
        <div className="w-[31rem]">
          <AffiliateCodeFormContainer handleCreateReferralCode={handleCreateReferralCode} callAfterSuccess={close} />
        </div>
      </ModalWithPortal>
    </div>
  );

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">{mainContent}</div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <ClaimableRebatesCard />
        <ReferralsDocsCard />
        <Faq items={AFFILIATE_POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </div>
  );
}
