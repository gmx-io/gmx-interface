import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { scrollToLandingSection } from "landing/utils/scrollToLandingSection";
import { useMemo, useState } from "react";

import icBenefitCustody from "img/trader_affiliate_benefit_custody.svg";
import icBenefitDashboard from "img/trader_affiliate_benefit_dashboard.svg";
import icBenefitFee from "img/trader_affiliate_benefit_fee.svg";
import icBenefitManager from "img/trader_affiliate_benefit_manager.svg";
import icBenefitMarketing from "img/trader_affiliate_benefit_marketing.svg";
import calcBg from "img/trader_affiliate_calc_bg.svg";
import icSparkle from "img/trader_affiliate_sparkle.svg";

import { ArrowButton } from "./ArrowButton";
import {
  AFFILIATE_VOLUME_TIERS,
  DEFAULT_AFFILIATE_VOLUME_INDEX,
  DEFAULT_TRADER_VOLUME_INDEX,
  EFFECTIVE_FEE_RATE,
  FEE_SHARE_RATE,
  GRADIENT_TEXT_CLASS,
  TRADER_VOLUME_TIERS,
} from "./constants";

type TabKey = "trader" | "affiliate";

type Benefit = {
  icon: string;
  title: string;
  description: string;
};

type TabContent = {
  badge: string;
  heading: React.ReactNode;
  subtext: string;
  benefits: Benefit[];
  calcTitle: string;
  volumeLabel: string;
  incomeLabel: string;
  disclaimer: React.ReactNode;
  cta: string;
};

function useTabContent(tab: TabKey): TabContent {
  return useMemo(() => {
    if (tab === "trader") {
      return {
        badge: t`You save`,
        heading: t`Keep more of every trade`,
        subtext: t`If you're moving serious size on GMX, you shouldn't be paying list price. The desk cuts your fees and gives you a direct line to a person — not a ticket queue.`,
        benefits: [
          {
            icon: icBenefitFee,
            title: t`Fee discounts up to 25%`,
            description: t`The more you trade, the more you keep`,
          },
          {
            icon: icBenefitManager,
            title: t`A dedicated account manager`,
            description: t`Your own contact on Telegram`,
          },
          {
            icon: icBenefitCustody,
            title: t`Self-custodial, always`,
            description: t`Trade from your own wallet — no deposits`,
          },
        ],
        calcTitle: t`Estimate your savings`,
        volumeLabel: t`Monthly volume`,
        incomeLabel: t`Your savings (at 25%)`,
        disclaimer: (
          <Trans>
            Assumes a ~0.05% effective round-trip fee on GMX perps.
            <br className="hidden sm:block" />
            Illustrative only — your exact rate is confirmed by the desk on signup.
          </Trans>
        ),
        cta: t`Lock in this rate`,
      };
    }

    return {
      badge: t`You earn`,
      heading: (
        <Trans>
          Turn your audience
          <br />
          into on-chain income
        </Trans>
      ),
      subtext: t`Refer traders to GMX with your unique link and earn a share of the fees they generate`,
      benefits: [
        {
          icon: icBenefitFee,
          title: t`Up to 25% earnings`,
          description: t`Earn on every trade they make`,
        },
        {
          icon: icBenefitDashboard,
          title: t`Real-time referral dashboard`,
          description: t`Track volume and payouts live`,
        },
        {
          icon: icBenefitMarketing,
          title: t`Marketing kit + co-marketing`,
          description: t`Banners, links and a partner manager`,
        },
      ],
      calcTitle: t`Estimate your income`,
      volumeLabel: t`Referred monthly volume`,
      incomeLabel: t`Your income (at 25%)`,
      disclaimer: (
        <Trans>
          Illustrative, based on a ~0.05% effective fee.
          <br className="hidden sm:block" />
          Real earnings depend on referral tier and each trader's activity.
        </Trans>
      ),
      cta: t`Become an affiliate`,
    };
  }, [tab]);
}

function formatVolumeShort(value: number): string {
  if (value >= 1_000_000) {
    return `$${value / 1_000_000}m`;
  }
  return `$${value / 1_000}k`;
}

const incomeFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function TraderAffiliateWidget() {
  const [tab, setTab] = useState<TabKey>("trader");
  const [volumeIndexByTab, setVolumeIndexByTab] = useState<Record<TabKey, number>>({
    trader: DEFAULT_TRADER_VOLUME_INDEX,
    affiliate: DEFAULT_AFFILIATE_VOLUME_INDEX,
  });

  const content = useTabContent(tab);
  const volumeTiers = tab === "trader" ? TRADER_VOLUME_TIERS : AFFILIATE_VOLUME_TIERS;
  const volumeIndex = volumeIndexByTab[tab];
  const volume = volumeTiers[volumeIndex];
  const income = volume * EFFECTIVE_FEE_RATE * FEE_SHARE_RATE;

  const setVolumeIndex = (index: number) => {
    setVolumeIndexByTab((prev) => ({ ...prev, [tab]: index }));
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="flex justify-center">
        <div className="bg-white flex rounded-16 border-1/2 border-slate-400 p-4">
          <button
            type="button"
            onClick={() => setTab("trader")}
            className={cx(
              "flex h-52 w-[140px] items-center justify-center rounded-12 text-16 font-medium -tracking-[0.512px] transition-colors sm:w-[188px]",
              tab === "trader" ? "bg-slate-900 text-white" : "text-slate-700"
            )}
          >
            <Trans>I'm a trader</Trans>
          </button>
          <button
            type="button"
            onClick={() => setTab("affiliate")}
            className={cx(
              "flex h-52 w-[160px] items-center justify-center gap-8 rounded-12 text-16 font-medium -tracking-[0.512px] transition-colors sm:w-[188px]",
              tab === "affiliate" ? "bg-slate-900" : "text-slate-700"
            )}
          >
            <img src={icSparkle} alt="" className="size-20" />
            <span className={cx(tab === "affiliate" && GRADIENT_TEXT_CLASS)}>
              <Trans>I'm an affiliate</Trans>
            </span>
          </button>
        </div>
      </div>

      <h2 className="text-heading-2 text-slate-900 mt-24 text-center">{content.heading}</h2>
      <p className="leading-body-sm text-slate-600 mx-auto mt-16 max-w-[560px] text-center text-16 -tracking-[0.512px]">
        {content.subtext}
      </p>

      <div className="mt-56 grid grid-cols-1 items-center gap-16 lg:grid-cols-[384px_1fr] lg:gap-20">
        <div className="bg-white rounded-20 border-1/2 border-slate-400 px-24 pb-24 pt-24">
          <span className="bg-blue-300/20 text-blue-400 inline-flex h-24 items-center rounded-full px-4 text-16 -tracking-[0.512px]">
            {content.badge}
          </span>
          <div className="mt-24 flex flex-col">
            {content.benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={cx({
                  "border-b-1/2 border-slate-400/50 pb-20": index < content.benefits.length - 1,
                  "pt-20": index > 0,
                })}
              >
                <div className="flex h-60 items-center gap-20">
                  <img src={benefit.icon} alt="" className="size-60 flex-shrink-0" />
                  <div className="flex flex-col gap-4">
                    <div className="text-18 text-slate-900 font-medium leading-[24px] -tracking-[0.576px]">
                      {benefit.title}
                    </div>
                    <div className="text-slate-600 text-16 leading-[19px] -tracking-[0.512px]">
                      {benefit.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 relative overflow-hidden rounded-20 p-24">
          <img src={calcBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative">
            <div className="text-18 text-white font-medium -tracking-[0.576px]">{content.calcTitle}</div>
            <div className="text-12 text-slate-500 mt-20 uppercase tracking-[0.864px]">{content.volumeLabel}</div>
            <div className="mt-8 flex flex-wrap gap-12">
              {volumeTiers.map((tierVolume, index) => (
                <button
                  key={tierVolume}
                  type="button"
                  onClick={() => setVolumeIndex(index)}
                  className={cx(
                    "duration-180 text-white flex h-36 items-center rounded-8 px-16 text-16 font-medium -tracking-[0.512px] transition-colors",
                    index === volumeIndex ? "bg-blue-400" : "bg-slate-600/50 hover:bg-slate-600/70"
                  )}
                >
                  {formatVolumeShort(tierVolume)}
                </button>
              ))}
            </div>
            <div className={cx("text-12 mt-24 w-fit tracking-[0.024px]", GRADIENT_TEXT_CLASS)}>
              {content.incomeLabel}
            </div>
            <div className="mt-12 flex items-baseline gap-8">
              <span className={cx("text-[68px] font-medium leading-[1] -tracking-[3.4px]", GRADIENT_TEXT_CLASS)}>
                {incomeFormatter.format(income)}
              </span>
              <span className={cx("text-18 whitespace-nowrap -tracking-[0.576px]", GRADIENT_TEXT_CLASS)}>
                <Trans>/ mo</Trans>
              </span>
            </div>
            <p className="text-12 mt-4 leading-[15px] tracking-[0.024px] text-[#646A8F]">{content.disclaimer}</p>
            <ArrowButton
              label={content.cta}
              variant="primary"
              onClick={() => scrollToLandingSection("contact", 24)}
              className="mt-16 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
