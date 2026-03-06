import { msg, t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { lightFormat } from "date-fns";
import { useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";

import {
  useAffiliateTier,
  useCodeOwner,
  useReferralPromoClosed,
  useReferrerDiscountShare,
  useTraderReferralStats,
  useTiers,
  useUserReferralCode,
} from "domain/referrals";
import { TimeRangeInfo, useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Faq } from "components/Faq/Faq";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import { PromoCard } from "components/Referrals/shared/cards/PromoCard";
import { ReferralsDocsCard } from "components/Referrals/shared/cards/ReferralsDocsCard";
import { OverviewChartCard } from "components/Referrals/shared/cards/ReferralsOverviewChartCard";
import { TraderReferralChartContainer } from "components/Referrals/shared/charts/TraderReferralChartContainer";
import { getSharePercentage } from "components/Referrals/shared/utils/referralsHelper";
import { POST_WIZARD_FAQS } from "components/Referrals/traders/faq";
import { ReferralCodeEditFormContainer } from "components/Referrals/traders/joinCode/ReferralCodeEditFormContainer";

import affiliateCodePromoFg from "img/affiliate_code_promo_fg.png";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import EditIcon from "img/ic_edit.svg?react";

type ReferralsTradersContentProps = {
  account: string | undefined;
};

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
    TIME_RANGE_INFOS
  );
  const { data: traderStats, isLoading: isTraderStatsLoading } = useTraderReferralStats({
    chainId,
    trader: account,
    from: periodStart,
    to: periodEnd,
  });
  const { isClosed: isTraderPromoClosed, close: closeTraderPromo } = useReferralPromoClosed("trader", account);

  const currentTierDiscount = getSharePercentage(traderTier, discountShare ?? 0n, totalRebate);
  const lastUpdated = traderStats?.to ? `${lightFormat(traderStats.to * 1000, "yyyy-MM-dd HH:mm:ss")} UTC` : "--";

  return (
    <>
      <div className="flex grow flex-col gap-8">
        <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
          <div className="flex items-center justify-between">
            <div className="text-body-large font-medium text-typography-primary">
              <Trans>Overview</Trans>
            </div>
            <PoolsTimeRangeFilter
              timeRange={timeRangeInfo.slug}
              setTimeRange={setTimeRange}
              timeRangeInfos={TIME_RANGE_INFOS}
            />
          </div>
          {!isTraderPromoClosed && (
            <PromoCard
              title={<Trans>Create your referral code and earn rebates from your referrals</Trans>}
              subtitle={
                <Trans>
                  Generate your own referral code and earn rebates whenever users trade with it. Rewards scale <br />{" "}
                  with your tier and the activity of your referred traders.{" "}
                  <ExternalLink
                    href="https://docs.gmx.io/docs/referrals"
                    variant="icon-arrow"
                    className="text-blue-300"
                  >
                    <Trans>Learn more</Trans>
                  </ExternalLink>
                </Trans>
              }
              onClose={closeTraderPromo}
            >
              <img
                src={affiliateCodePromoFg}
                className="user-select-none absolute -bottom-34 right-28 z-10 w-[104px]"
              />
            </PromoCard>
          )}
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
        <div className="rounded-8 bg-slate-900 p-20">
          <div className="text-body-medium mb-8 font-medium text-typography-secondary">
            <Trans>Active referral code</Trans>
          </div>
          <div className="mb-12 flex items-center justify-between">
            <div
              className="flex cursor-pointer items-center gap-4 text-24 font-medium text-typography-primary"
              onClick={() => {
                if (!userReferralCodeString) return;
                copyToClipboard(userReferralCodeString);
                helperToast.success(t`Referral code copied to clipboard`);
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
