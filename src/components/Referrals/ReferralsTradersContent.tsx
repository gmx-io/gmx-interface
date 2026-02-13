import { msg, t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useMemo } from "react";
import { useCopyToClipboard } from "react-use";

import { USD_DECIMALS } from "config/factors";
import {
  TotalReferralsStats,
  useAffiliateTier,
  useCodeOwner,
  useReferrerDiscountShare,
  useTiers,
  useUserReferralCode,
} from "domain/referrals";
import { TimeRangeInfo, useTimeRange } from "domain/synthetics/markets/useTimeRange";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { formatUsd, numberToBigint } from "lib/numbers";

import Button from "components/Button/Button";
import { Faq } from "components/Faq/Faq";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import { PromoCard } from "components/Referrals/PromoCard";
import { ReferralsDocsCard } from "components/Referrals/ReferralsDocsCard";
import { POST_WIZARD_FAQS } from "components/Referrals/ReferralsTradersFaq";
import { TradersVolumeChartContainer } from "components/Referrals/TradersVolumeChartContainer";
import Tooltip from "components/Tooltip/Tooltip";

import affiliateCodePromoFg from "img/affiliate_code_promo_fg.png";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import EditIcon from "img/ic_edit.svg?react";

import { getSharePercentage } from "./referralsHelper";

type ReferralsTradersContentProps = {
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReferralsTradersContent({ account, referralsData }: ReferralsTradersContentProps) {
  const { chainId } = useChainId();
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(chainId, account);
  const { codeOwner } = useCodeOwner(chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(chainId, codeOwner);
  const [, copyToClipboard] = useCopyToClipboard();
  const { totalRebate } = useTiers(chainId, traderTier);
  const { timeRangeInfo, periodStart, periodEnd, setTimeRange } = useTimeRange(
    "referrals-traders-time-range",
    TIME_RANGE_INFOS
  );

  const currentTierDiscount = getSharePercentage(traderTier, discountShare ?? 0n, totalRebate);

  return (
    <>
      <div className="flex grow flex-col gap-8">
        <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
          <div className="flex items-center justify-between">
            <div className="text-body-large font-medium text-typography-primary">Overview</div>
            <PoolsTimeRangeFilter
              timeRange={timeRangeInfo.slug}
              setTimeRange={setTimeRange}
              timeRangeInfos={TIME_RANGE_INFOS}
            />
          </div>
          <PromoCard
            title={<Trans>Create your referral code and earn rebates from your referrals</Trans>}
            subtitle={
              <Trans>
                Generate your own referral code and earn rebates whenever users trade with it. Rewards scale <br /> with
                your tier and the activity of your referred traders. Learn more
              </Trans>
            }
          >
            <img src={affiliateCodePromoFg} className="user-select-none absolute -bottom-34 right-28 z-10 w-[104px]" />
          </PromoCard>
          <div className="flex gap-12">
            <Card className="flex-1">
              <div className="text-body-small mb-4 font-medium text-typography-secondary">
                <Tooltip
                  variant="iconStroke"
                  position="right"
                  content={<Trans>Volume traded by this account with an active referral code.</Trans>}
                >
                  <Trans>Trading Volume</Trans>
                </Tooltip>
              </div>
              <div className="mb-24 flex items-center gap-4">
                <div className="text-24 font-medium text-typography-primary numbers">
                  {formatUsd(numberToBigint(3089.28, USD_DECIMALS))}
                </div>
                <div
                  className={cx("rounded-full px-4 py-2 text-12 font-medium numbers", {
                    "bg-green-900 text-green-500": true,
                  })}
                >
                  {formatUsd(numberToBigint(97.06, USD_DECIMALS), { displayPlus: true })}
                </div>
              </div>
              <TradersVolumeChartContainer
                periodStart={periodStart}
                periodEnd={periodEnd}
                timeRangeInfo={timeRangeInfo}
              />
            </Card>
            <Card className="flex-1">
              <div className="text-body-small mb-4 font-medium text-typography-secondary">
                <Tooltip
                  variant="iconStroke"
                  position="right"
                  content={<Trans>Discounts earned by this account as a trader.</Trans>}
                >
                  <Trans>Your Savings</Trans>
                </Tooltip>
              </div>
              <div className="mb-24 flex items-center gap-4">
                <div className="text-24 font-medium text-typography-primary numbers">
                  {formatUsd(numberToBigint(3089.28, USD_DECIMALS))}
                </div>
                <div
                  className={cx("rounded-full px-4 py-2 text-12 font-medium numbers", {
                    "bg-green-900 text-green-500": true,
                  })}
                >
                  {formatUsd(numberToBigint(97.06, USD_DECIMALS), { displayPlus: true })}
                </div>
              </div>
              <TradersVolumeChartContainer
                periodStart={periodStart}
                periodEnd={periodEnd}
                timeRangeInfo={timeRangeInfo}
              />
            </Card>
          </div>
          <div className="text-body-small font-medium text-typography-secondary">
            <span className="text-slate-500">Last Updated:</span> 2025-08-18 15:04:04 UTC
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
            <Button variant="secondary">
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
    </>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 p-12", className)}>{children}</div>
  );
}
