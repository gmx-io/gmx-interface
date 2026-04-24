import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { lightFormat } from "date-fns";
import { useState } from "react";
import { useCopyToClipboard } from "react-use";

import {
  useAffiliateTier,
  useCodeOwner,
  useReferrerDiscountShare,
  useTiers,
  useTraderReferralStats,
  useUserReferralCode,
} from "domain/referrals";
import { getReferralCodeTradeUrl, getSharePercentage } from "domain/referrals/utils/referralsHelper";
import { useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { ReferralsDocsCard } from "components/Referrals/shared/cards/ReferralsDocsCard";
import { OverviewChartCard } from "components/Referrals/shared/cards/ReferralsOverviewChartCard";
import { TraderReferralChartContainer } from "components/Referrals/shared/charts/TraderReferralChartContainer";
import { REFERRALS_TIME_RANGE_INFOS, TimeRangeFilter } from "components/Referrals/shared/TimeRangeFilter";
import { POST_WIZARD_FAQS } from "components/Referrals/traders/faq";
import { ReferralCodeEditFormContainer } from "components/Referrals/traders/joinCode/ReferralCodeEditFormContainer";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import EditIcon from "img/ic_edit.svg?react";

import { TradersPromoCard } from "./TradersPromoCard";

type ReferralsTradersContentProps = {
  account: string | undefined;
};

export function ReferralsTradersContent({ account }: ReferralsTradersContentProps) {
  const { chainId } = useChainId();
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(chainId, account);
  const { codeOwner } = useCodeOwner(chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(chainId, codeOwner);
  const [, copyToClipboard] = useCopyToClipboard();
  const [isEditReferralCodeModalVisible, setIsEditReferralCodeModalVisible] = useState(false);
  const { totalRebate } = useTiers(chainId, traderTier);
  const { timeRangeInfo, setTimeRange, periodStart, periodEnd } = useTimeRange(
    "referrals-traders-time-range",
    REFERRALS_TIME_RANGE_INFOS
  );
  const { data: traderStats, isLoading: isTraderStatsLoading } = useTraderReferralStats({
    chainId,
    trader: account,
    from: periodStart,
    to: periodEnd,
  });
  const currentTierDiscount = getSharePercentage(traderTier, discountShare, totalRebate);
  const lastUpdated = traderStats?.to ? `${lightFormat(traderStats.to * 1000, "yyyy-MM-dd HH:mm:ss")} UTC` : "--";

  return (
    <>
      <div className="flex grow flex-col gap-8">
        <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-adaptive">
          <div className="flex items-center justify-between">
            <div className="text-body-large font-medium text-typography-primary">
              <Trans>Overview</Trans>
            </div>
            <TimeRangeFilter
              timeRange={timeRangeInfo.slug}
              setTimeRange={setTimeRange}
              timeRangeInfos={REFERRALS_TIME_RANGE_INFOS}
            />
          </div>
          <TradersPromoCard account={account} />
          <div className="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
            <OverviewChartCard
              label={<Trans>Trading volume</Trans>}
              tooltipContent={<Trans>Volume traded by this account with an active referral code.</Trans>}
              value={formatUsd(traderStats?.summary.volumeUsd ?? 0n)}
              valueChange={
                traderStats?.summary.volumeUsdDelta !== undefined
                  ? formatUsdDelta(traderStats.summary.volumeUsdDelta)
                  : undefined
              }
              isValueChangePositive={
                traderStats?.summary.volumeUsdDelta !== undefined ? traderStats.summary.volumeUsdDelta >= 0n : undefined
              }
            >
              <TraderReferralChartContainer
                chartType="volume"
                stats={traderStats}
                isLoading={isTraderStatsLoading}
                timeRangeInfo={timeRangeInfo}
              />
            </OverviewChartCard>
            <OverviewChartCard
              label={<Trans>Discounts</Trans>}
              tooltipContent={<Trans>Discounts earned by this account as a trader.</Trans>}
              value={formatUsd(traderStats?.summary.discountsUsd ?? 0n)}
              valueChange={
                traderStats?.summary.discountsUsdDelta !== undefined
                  ? formatUsdDelta(traderStats.summary.discountsUsdDelta)
                  : undefined
              }
              isValueChangePositive={
                traderStats?.summary.discountsUsdDelta !== undefined
                  ? traderStats.summary.discountsUsdDelta >= 0n
                  : undefined
              }
            >
              <TraderReferralChartContainer
                chartType="discounts"
                stats={traderStats}
                isLoading={isTraderStatsLoading}
                timeRangeInfo={timeRangeInfo}
              />
            </OverviewChartCard>
          </div>
          <div className="text-body-small font-medium text-typography-secondary">
            <span className="text-slate-500">
              <Trans>Last Updated:</Trans>
            </span>{" "}
            {lastUpdated}
          </div>
        </div>
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <div className="rounded-8 bg-slate-900 p-adaptive">
          <div className="text-body-medium mb-8 font-medium text-typography-secondary">
            <Trans>Active referral code</Trans>
          </div>
          <div className="mb-12 flex items-center justify-between">
            <div
              className="flex cursor-pointer items-center gap-4 text-24 font-medium text-typography-primary"
              onClick={() => {
                if (!userReferralCodeString) return;
                copyToClipboard(getReferralCodeTradeUrl(userReferralCodeString));
                helperToast.success(t`Referral link copied to clipboard`);
              }}
            >
              {userReferralCodeString} <CopyStrokeIcon className="size-20 text-typography-secondary" />
            </div>
            <Button variant="secondary" onClick={() => setIsEditReferralCodeModalVisible(true)}>
              <Trans>Edit</Trans> <EditIcon className="size-16" />
            </Button>
          </div>
          <Card>
            <Trans>
              <div className="text-body-medium mb-2 font-medium text-typography-primary">
                You're now receiving a {currentTierDiscount}% discount on your trades!
              </div>
              <div className="text-body-small text-typography-secondary">
                The reduced rate applies to every open and close fee.
              </div>
            </Trans>
          </Card>
        </div>
        <ReferralsDocsCard />
        <Faq items={POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
      <ModalWithPortal
        className="Connect-wallet-modal"
        isVisible={isEditReferralCodeModalVisible}
        setIsVisible={setIsEditReferralCodeModalVisible}
        label={t`Edit referral code`}
      >
        <div className="w-[31rem]">
          <ReferralCodeEditFormContainer
            type="edit"
            userReferralCodeString={userReferralCodeString}
            callAfterSuccess={() => setIsEditReferralCodeModalVisible(false)}
          />
        </div>
      </ModalWithPortal>
    </>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 p-12", className)}>{children}</div>
  );
}

function formatUsdDelta(value: bigint): string {
  return formatUsd(value, { displayPlus: value >= 0n }) ?? "";
}
