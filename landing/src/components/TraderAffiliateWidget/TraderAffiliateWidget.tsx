import { t, Trans } from "@lingui/macro";
import cx from "classnames";
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
  DEFAULT_VOLUME_INDEX,
  EFFECTIVE_FEE_RATE,
  FEE_SHARE_RATE,
  GRADIENT_TEXT_CLASS,
  TRADER_VOLUME_TIERS,
  VIP_CONTACT_FORM_URL,
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
  volumeLabel: string;
  disclaimer: React.ReactNode;
  cta: string;
};

function useTabContent(tab: TabKey): TabContent {
  return useMemo(() => {
    if (tab === "trader") {
      return {
        badge: t`You save`,
        heading: t`Keep more of every trade.`,
        subtext: t`If you're moving serious size on GMX, you shouldn't be paying list price. The desk cuts your fees and gives you a direct line to a person — not a ticket queue.`,
        benefits: [
          {
            icon: icBenefitFee,
            title: t`Fee discounts up to 25%`,
            description: t`The more you trade, the more you keep.`,
          },
          {
            icon: icBenefitManager,
            title: t`A dedicated account manager`,
            description: t`Your own contact on Telegram.`,
          },
          {
            icon: icBenefitCustody,
            title: t`Self-custodial, always`,
            description: t`Trade from your own wallet — no deposits.`,
          },
        ],
        volumeLabel: t`MONTHLY VOLUME`,
        disclaimer: (
          <Trans>
            Assumes a ~0.06% effective round-trip fee on GMX perps.
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
          into on-chain income.
        </Trans>
      ),
      subtext: t`Refer traders to GMX with your unique link and earn a share of the fees they generate.`,
      benefits: [
        {
          icon: icBenefitFee,
          title: t`Up to 25% earnings`,
          description: t`Earn on every trade they make.`,
        },
        {
          icon: icBenefitDashboard,
          title: t`Real-time referral dashboard`,
          description: t`Track volume and payouts live.`,
        },
        {
          icon: icBenefitMarketing,
          title: t`Marketing Kit + Co-marketing`,
          description: t`Banners, links and a partner manager.`,
        },
      ],
      volumeLabel: t`REFERRED MONTHLY VOLUME`,
      disclaimer: (
        <Trans>
          Illustrative, based on a ~0.06% effective fee.
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
    trader: DEFAULT_VOLUME_INDEX,
    affiliate: DEFAULT_VOLUME_INDEX,
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
        <div className="flex rounded-16 border-1/2 border-slate-400 bg-white p-4">
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

      <h2 className="text-heading-2 mt-28 text-center text-slate-900">{content.heading}</h2>
      <p className="leading-body-sm mx-auto mt-16 max-w-[560px] text-center text-16 -tracking-[0.512px] text-slate-600">
        {content.subtext}
      </p>

      <div className="mt-[57px] grid grid-cols-1 items-center gap-16 lg:grid-cols-[384px_1fr] lg:gap-20">
        <div className="rounded-20 border-1/2 border-slate-400 bg-white px-28 pb-28 pt-28">
          <span className="inline-flex h-24 items-center rounded-full bg-blue-300/20 px-6 text-16 -tracking-[0.512px] text-blue-400">
            {content.badge}
          </span>
          <div className="mt-24 flex flex-col">
            {content.benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={cx({
                  "border-b-1/2 border-slate-400/50 pb-[21.5px]": index < content.benefits.length - 1,
                  "pt-22": index > 0,
                })}
              >
                <div className="flex h-60 items-center gap-20">
                  <img src={benefit.icon} alt="" className="size-60 flex-shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="text-18 font-medium leading-[24px] -tracking-[0.576px] text-slate-900">
                      {benefit.title}
                    </div>
                    <div className="text-16 leading-[19px] -tracking-[0.512px] text-slate-600">
                      {benefit.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-20 bg-slate-900 p-28">
          <img src={calcBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative">
            <div className="text-18 font-medium -tracking-[0.576px] text-white">
              <Trans>Estimate your savings</Trans>
            </div>
            <div className="mt-20 text-12 uppercase tracking-[0.864px] text-slate-500">{content.volumeLabel}</div>
            <div className="mt-8 flex flex-wrap gap-12">
              {volumeTiers.map((tierVolume, index) => (
                <button
                  key={tierVolume}
                  type="button"
                  onClick={() => setVolumeIndex(index)}
                  className={cx(
                    "duration-180 flex h-36 items-center rounded-8 px-16 text-16 font-medium -tracking-[0.512px] text-white transition-colors",
                    index === volumeIndex ? "bg-blue-400" : "bg-slate-600/50 hover:bg-slate-600/70"
                  )}
                >
                  {formatVolumeShort(tierVolume)}
                </button>
              ))}
            </div>
            <div className={cx("mt-24 w-fit text-12 tracking-[0.024px]", GRADIENT_TEXT_CLASS)}>
              <Trans>Your income (at 20%)</Trans>
            </div>
            <div className="mt-12 flex items-baseline gap-8">
              <span className={cx("text-[68px] font-medium leading-[1] -tracking-[3.4px]", GRADIENT_TEXT_CLASS)}>
                {incomeFormatter.format(income)}
              </span>
              <span className={cx("text-18 whitespace-nowrap -tracking-[0.576px]", GRADIENT_TEXT_CLASS)}>
                <Trans>/ mo</Trans>
              </span>
            </div>
            <p className="mt-4 text-12 leading-[15px] tracking-[0.024px] text-[#646A8F]">{content.disclaimer}</p>
            <ArrowButton label={content.cta} variant="primary" href={VIP_CONTACT_FORM_URL} className="mt-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
