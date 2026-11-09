import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import { useCopyToClipboard } from "react-use";

import { useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { helperToast } from "lib/helperToast";

import { Faq } from "components/Faq/Faq";
import { UsdValue } from "components/NumericValue/UsdValue";
import { OverviewChartCard } from "components/Referrals/shared/cards/ReferralsOverviewChartCard";
import { TraderReferralChartContainer } from "components/Referrals/shared/charts/TraderReferralChartContainer";
import { REFERRALS_TIME_RANGE_INFOS, TimeRangeFilter } from "components/Referrals/shared/TimeRangeFilter";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";

import { SolanaTradersPromoCard } from "./SolanaPromoCards";
import { SOLANA_TRADER_POST_WIZARD_FAQS } from "./solanaReferralsFaq";
import {
  getSolanaReferralLink,
  SOLANA_TRADER_DISCOUNT_PERCENT,
  type SolanaReferralsData,
} from "./solanaReferralsTypes";
import { buildSolanaTraderStats } from "./solanaTraderStats";

export function SolanaTradersDashboard({
  data,
  appliedCode,
  hasOwnAffiliateCode,
}: {
  data: SolanaReferralsData;
  appliedCode: string;
  hasOwnAffiliateCode: boolean;
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { timeRangeInfo, setTimeRange, periodStart, periodEnd } = useTimeRange(
    "solana-referrals-traders-time-range",
    REFERRALS_TIME_RANGE_INFOS
  );

  const traderStats = useMemo(
    () =>
      buildSolanaTraderStats({
        trader: data.account,
        points: data.traderPoints,
        periodStart,
        periodEnd,
        days: timeRangeInfo.days,
      }),
    [data.account, data.traderPoints, periodStart, periodEnd, timeRangeInfo.days]
  );

  return (
    <>
      <div className="flex grow flex-col gap-8">
        <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-adaptive">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="text-body-large font-medium text-typography-primary">
              <Trans>Overview</Trans>
            </div>
            <div className="shrink-0">
              <TimeRangeFilter
                timeRange={timeRangeInfo.slug}
                setTimeRange={setTimeRange}
                timeRangeInfos={REFERRALS_TIME_RANGE_INFOS}
              />
            </div>
          </div>
          <SolanaTradersPromoCard account={data.account} hasOwnCode={hasOwnAffiliateCode} />
          <div className="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
            <OverviewChartCard
              label={<Trans>Your trading volume</Trans>}
              value={<UsdValue usd={traderStats?.summary.volumeUsd ?? 0n} />}
              valueChange={
                traderStats?.summary.volumeUsdDelta !== undefined ? (
                  <UsdValue usd={traderStats.summary.volumeUsdDelta} displayPlus />
                ) : undefined
              }
              isValueChangePositive={
                traderStats?.summary.volumeUsdDelta !== undefined ? traderStats.summary.volumeUsdDelta >= 0n : undefined
              }
            >
              <TraderReferralChartContainer
                chartType="volume"
                stats={traderStats}
                isLoading={data.isLoading}
                timeRangeInfo={timeRangeInfo}
              />
            </OverviewChartCard>
            <OverviewChartCard
              label={<Trans>Your discounts</Trans>}
              value={<UsdValue usd={traderStats?.summary.discountsUsd ?? 0n} />}
              valueChange={
                traderStats?.summary.discountsUsdDelta !== undefined ? (
                  <UsdValue usd={traderStats.summary.discountsUsdDelta} displayPlus />
                ) : undefined
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
                isLoading={data.isLoading}
                timeRangeInfo={timeRangeInfo}
              />
            </OverviewChartCard>
          </div>
        </div>
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <div className="rounded-8 bg-slate-900 p-adaptive">
          <div className="text-body-medium mb-8 font-medium text-typography-secondary">
            <Trans>Active referral code</Trans>
          </div>
          <div className="mb-12 flex items-center justify-between gap-8">
            <button
              type="button"
              className="flex min-w-0 items-center gap-4 text-left text-typography-primary"
              onClick={() => {
                copyToClipboard(getSolanaReferralLink(appliedCode));
                helperToast.success(t`Referral link copied to clipboard`);
              }}
            >
              <span className="truncate text-24 font-medium">{appliedCode}</span>
              <CopyStrokeIcon className="size-20 shrink-0 text-typography-secondary" />
            </button>
          </div>
          <Card>
            <div className="text-body-medium mb-2 font-medium text-typography-primary">
              <Trans>You're now receiving a permanent {SOLANA_TRADER_DISCOUNT_PERCENT}% discount on your trades!</Trans>
            </div>
            <div className="text-body-small text-typography-secondary">
              <Trans>The reduced rate applies to every open and close fee.</Trans>
            </div>
          </Card>
        </div>
        <Faq items={SOLANA_TRADER_POST_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 p-12", className)}>{children}</div>
  );
}
