import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { scrollToLandingSection } from "landing/utils/scrollToLandingSection";
import { useMemo } from "react";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplier,
  formatMultiplierAdjustment,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";
import {
  applyFactor,
  expandDecimals,
  formatAmount,
  formatAmountHuman,
  formatUsd,
  PRECISION,
  USD_DECIMALS,
} from "lib/numbers";
import { MARKETS } from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import IcPlusCircle from "img/ic_plus_circle.svg?react";
import referralCoins from "img/rewards-landing/referral-coins.webp";

import { RewardsValue } from "./RewardsValue";

const TIER_IDS = ["Tier1", "Tier2", "Tier3", "Tier4", "Tier5"] as const;

export function RewardsMultipliers({
  config,
  loading,
}: {
  config: IncentivesConfig | null | undefined;
  loading: boolean;
}) {
  const stakingNames: Record<StakingTierId, string> = {
    Tier1: t`Supporter`,
    Tier2: t`Advocate`,
    Tier3: t`Guardian`,
    Tier4: t`Steward`,
    Tier5: t`Titan`,
  };
  const volumeNames: Record<VolumeTierId, string> = {
    Tier1: t`Ranked`,
    Tier2: t`Certified`,
    Tier3: t`Veteran`,
    Tier4: t`Legendary`,
    Tier5: t`Apex`,
  };
  const stakingTiers =
    config?.stakingTiers ?? TIER_IDS.map((tier) => ({ tier, threshold: undefined, multiplier: undefined }));
  const volumeTiers =
    config?.volumeTiers ?? TIER_IDS.map((tier) => ({ tier, threshold: undefined, multiplier: undefined }));
  const boost = (id: string) => (
    <RewardsValue loading={loading}>
      {config
        ? formatMultiplierAdjustment(
            config.boosts.find(({ boost }) => boost === id)?.multiplier ?? 0n,
            config.multiplierDecimals
          )
        : undefined}
    </RewardsValue>
  );
  const featuredMarkets = config?.featuredMarketTokens
    .flatMap((address) => {
      const market = MARKETS[ARBITRUM]?.[address];
      if (!market) return [];
      const token = getToken(ARBITRUM, market.indexTokenAddress);
      return `$${token.symbol}`;
    })
    .join(" · ");
  const feeShare = (
    <RewardsValue loading={loading}>{config ? formatFactorPercentage(config.feeShareFactor) : undefined}</RewardsValue>
  );
  const perMultiplierRate = (
    <RewardsValue loading={loading}>
      {config
        ? formatFactorPercentage(applyFactor(config.feeShareFactor, config.esGmxShareFactor + config.gtShareFactor))
        : undefined}
    </RewardsValue>
  );
  const exampleMultiplierValue = config ? bigMath.min(7n * config.multiplierDecimals, config.maxMultiplier) : undefined;
  const exampleMultiplier = (
    <RewardsValue loading={loading} width="2ch">
      {config && exampleMultiplierValue !== undefined
        ? formatMultiplier(exampleMultiplierValue, config.multiplierDecimals)
        : undefined}
    </RewardsValue>
  );
  const exampleRate = (
    <RewardsValue loading={loading}>
      {config && exampleMultiplierValue !== undefined
        ? formatFactorPercentage(getMaxRewardRateFactor({ ...config, maxMultiplier: exampleMultiplierValue }))
        : undefined}
    </RewardsValue>
  );
  const referralShare = (
    <RewardsValue loading={loading}>
      {config ? formatFactorPercentage(config.referralRewardShareFactor) : undefined}
    </RewardsValue>
  );
  const referralExample = (
    <RewardsValue loading={loading} width="4ch">
      {config
        ? formatUsd(applyFactor(expandDecimals(1000, USD_DECIMALS), config.referralRewardShareFactor), {
            displayDecimals: 0,
          })
        : undefined}
    </RewardsValue>
  );
  const referralShareStyle = useMemo(
    () => ({
      gridTemplateColumns: `minmax(0, 1fr) minmax(0, ${config ? Number(config.referralRewardShareFactor) / Number(PRECISION) : 0.5}fr)`,
    }),
    [config]
  );

  return (
    <section
      className={cx(
        "rewards-multipliers rewards-light relative overflow-clip pb-[200px] pl-0 pr-0 pt-[120px] text-slate-900 [--rewards-skeleton-base:#090a140d]",
        "[--rewards-skeleton-highlight:#090a141a] [background:#f4f5f9]",
        "max-mobile:px-0 max-mobile:py-40",
        "[&>.rewards-container]:flex [&>.rewards-container]:flex-col [&>.rewards-container]:gap-48 [&>.rewards-container]:[z-index:1]",
        "max-mobile:[&>.rewards-container]:gap-24",
        "max-mobile:[&_h2]:text-[40px] max-mobile:[&_h2]:leading-[48px] max-mobile:[&_h2]:tracking-[-0.03em]"
      )}
      id="multipliers"
    >
      <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
        <h2>
          <Trans>
            How your rewards
            <br />
            are calculated
          </Trans>
        </h2>
        <div
          className={cx(
            "rewards-formula rounded-20 px-40 py-32 shadow-[0_6px_8px_-6px_#bec0da] [background:#fff]",
            "max-mobile:p-16",
            "[&>p]:text-center [&>p]:leading-[1.02] [&>p]:tracking-[0.072em]",
            "max-mobile:[&>p]:text-12 max-mobile:[&>p]:normal-case max-mobile:[&>p]:leading-[15px] max-mobile:[&>p]:tracking-[0.002em]"
          )}
        >
          <div
            className={cx(
              "rewards-formula-equation mb-24 flex items-center justify-center gap-16",
              "max-mobile:[&_strong]:text-18 max-mobile:[&_strong]:leading-[1.36]",
              "max-tablet:gap-12",
              "max-mobile:mb-8 max-mobile:flex-col max-mobile:gap-0",
              "[&>div]:rounded-12 [&>div]:px-20 [&>div]:py-16 [&>div]:shadow-[inset_0_0_0_1px_#f4f5f9] [&>div]:[background:#fff]",
              "max-mobile:[&>div]:max-w-full max-mobile:[&>div]:px-20 max-mobile:[&>div]:py-16 max-mobile:[&>div]:text-center",
              "[&>span]:text-[40px] [&>span]:font-medium [&>span]:leading-[48px] [&>span]:text-slate-500",
              "max-mobile:[&>span]:text-[40px] max-mobile:[&>span]:leading-[48px]",
              "[&_strong]:block [&_strong]:text-[28px] [&_strong]:font-medium [&_strong]:leading-[32px] [&_strong]:tracking-[-0.032em]",
              "max-tablet:[&_strong]:text-[21px]"
            )}
          >
            <div>
              <strong>
                <Trans>{feeShare} of your fees</Trans>
              </strong>
            </div>
            <span aria-hidden="true">×</span>
            <div>
              <strong>
                <Trans>Staking tier + Volume tier + Boosts</Trans>
              </strong>
            </div>
          </div>
          <p className="rewards-eyebrow text-12 font-medium uppercase leading-[15px] tracking-[0.002em] text-slate-500">
            <Trans>
              Every 1x returns {perMultiplierRate} of your fees. At {exampleMultiplier}, that's {exampleRate} back.
            </Trans>
          </p>
        </div>
        <div
          className={cx(
            "rewards-card-grid rewards-tiers grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-24",
            "[&_tbody_th]:text-18 [&_tbody_th]:px-0 [&_tbody_th]:py-7 [&_tbody_th]:leading-[24px]",
            "[&_td:last-child]:text-18 [&_td:last-child]:w-64 [&_td:last-child]:font-medium [&_td:last-child]:text-blue-400",
            "max-mobile:[&_tbody_th]:text-18 max-mobile:[&_tbody_th]:leading-[1.36] max-mobile:[&_tbody_th]:tracking-[-0.032em]",
            "max-mobile:grid-cols-[1fr] max-mobile:gap-24",
            "max-mobile:[&_table:last-child_thead_th:nth-child(2)]:w-[120px]",
            "[&_table]:table [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:rounded-20 [&_table]:p-24 [&_table]:text-left",
            "[&_table]:[background:#fff]",
            "max-mobile:[&_table]:p-24",
            "[&_tbody_tr:first-child>*]:pt-16",
            "[&_tbody_tr:last-child>*]:pb-0",
            "max-mobile:[&_td:last-child]:w-40",
            "max-mobile:[&_td:not(:last-child)]:pr-16",
            "[&_td]:px-0 [&_td]:py-7 [&_td]:text-right [&_td]:leading-[24px] [&_td]:text-slate-600",
            "max-mobile:[&_td]:pl-0 max-mobile:[&_td]:pr-0",
            "[&_th:not(:first-child)]:text-right",
            "max-mobile:[&_th:not(:last-child)]:pr-16",
            "[&_th]:font-medium",
            "max-mobile:[&_th]:pl-0 max-mobile:[&_th]:pr-0",
            "[&_thead]:text-12 [&_thead]:uppercase [&_thead]:leading-[15px] [&_thead]:tracking-[0.002em]",
            "max-mobile:[&_thead]:text-12 max-mobile:[&_thead]:leading-[15px]",
            "max-mobile:[&_thead_th:last-child]:w-40 max-mobile:[&_thead_th:last-child]:whitespace-nowrap",
            "[&_thead_th:not(:first-child)]:text-slate-500",
            "max-mobile:[&_thead_th:nth-child(2)]:w-96",
            "[&_thead_th]:pb-16 [&_thead_th]:[border-bottom:1px_solid_#f4f5f9]",
            "max-mobile:[&_thead_th]:pt-0 max-mobile:[&_thead_th]:tracking-[inherit] max-mobile:[&_thead_th]:[font-size:inherit]",
            "max-mobile:[&_thead_th]:[overflow-wrap:anywhere]"
          )}
        >
          <table>
            <caption className="sr-only">
              <Trans>Staking tiers</Trans>
            </caption>
            <thead>
              <tr>
                <th>
                  <Trans>Staking tiers</Trans>
                </th>
                <th>
                  <Trans>Staked GMX + esGMX</Trans>
                </th>
                <th>
                  <Trans>Boost</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {stakingTiers.map((tier) => (
                <tr key={tier.tier}>
                  <th scope="row">{stakingNames[tier.tier]}</th>
                  <td>
                    <RewardsValue loading={loading} width="6ch">
                      {tier.threshold !== undefined
                        ? formatAmount(tier.threshold, ES_GMX_DECIMALS, 0, true)
                        : undefined}
                    </RewardsValue>
                  </td>
                  <td>
                    <RewardsValue loading={loading}>
                      {config && tier.multiplier !== undefined
                        ? formatMultiplierAdjustment(tier.multiplier, config.multiplierDecimals)
                        : undefined}
                    </RewardsValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <caption className="sr-only">
              <Trans>Volume tiers</Trans>
            </caption>
            <thead>
              <tr>
                <th>
                  <Trans>Volume tiers</Trans>
                </th>
                <th>
                  <Trans>Weekly volume</Trans>
                </th>
                <th>
                  <Trans>Boost</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {volumeTiers.map((tier) => (
                <tr key={tier.tier}>
                  <th scope="row">{volumeNames[tier.tier]}</th>
                  <td>
                    <RewardsValue loading={loading} width="6ch">
                      {tier.threshold !== undefined
                        ? formatAmountHuman(tier.threshold, USD_DECIMALS, true, 0).toUpperCase()
                        : undefined}
                    </RewardsValue>
                  </td>
                  <td>
                    <RewardsValue loading={loading}>
                      {config && tier.multiplier !== undefined
                        ? formatMultiplierAdjustment(tier.multiplier, config.multiplierDecimals)
                        : undefined}
                    </RewardsValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className={cx(
            "rewards-boost-cards grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-24",
            "max-tablet:gap-16",
            "max-mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] max-mobile:gap-8",
            "[&_article>p:last-child]:text-14 [&_article>p:last-child]:leading-[1.36] [&_article>p:last-child]:tracking-[-0.016em]",
            "[&_article>p:last-child]:text-slate-600",
            "max-mobile:[&_article>p:last-child]:text-[13px] max-mobile:[&_article>p:last-child]:leading-[16px]",
            "max-mobile:[&_article>p:last-child]:tracking-[0.002em]",
            "[&_article]:flex [&_article]:min-h-[217px] [&_article]:flex-col [&_article]:items-start [&_article]:gap-16 [&_article]:rounded-20",
            "[&_article]:p-20 [&_article]:[background:#fff]",
            "max-tablet:[&_article]:p-16",
            "max-mobile:[&_article]:min-h-[212px] max-mobile:[&_article]:p-16 max-mobile:[&_article]:[overflow-wrap:anywhere]",
            "[&_h4]:m-0 [&_h4]:leading-[28px]",
            "max-mobile:[&_h4]:text-16 max-mobile:[&_h4]:leading-[24px]"
          )}
        >
          <article>
            <strong className="rewards-boost-badge text-18 inline-grid h-60 min-w-60 place-items-center rounded-12 p-8 font-medium text-blue-400 [background:#f4f5f9]">
              {boost("ManualAllocation")}
            </strong>
            <h4>
              <Trans>Comeback boost</Trans>
            </h4>
            <p>
              <Trans>Early user? GMX rewards you with a boost on all your perp trades.</Trans>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge text-18 inline-grid h-60 min-w-60 place-items-center rounded-12 p-8 font-medium text-blue-400 [background:#f4f5f9]">
              {boost("FeaturedMarkets")}
            </strong>
            <h4>
              <Trans>Featured markets</Trans>
            </h4>
            <p>
              <Trans>Open and close on the current set:</Trans>{" "}
              <RewardsValue loading={loading} width="12ch">
                {config ? featuredMarkets || <Trans>See the current markets in the app.</Trans> : undefined}
              </RewardsValue>{" "}
              <Trans>this epoch.</Trans>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge text-18 inline-grid h-60 min-w-60 place-items-center rounded-12 p-8 font-medium text-blue-400 [background:#f4f5f9]">
              {boost("BalancingTrades")}
            </strong>
            <h4>
              <Trans>Balancing trades</Trans>
            </h4>
            <p>
              <Trans>
                Open trades of at least{" "}
                {config ? (
                  formatAmountHuman(config.balancingTradesThreshold, USD_DECIMALS, true, 0).toUpperCase()
                ) : (
                  <RewardsValue loading={loading} width="4ch" />
                )}{" "}
                on the under-utilised side and get paid for balancing the market.
              </Trans>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge text-18 inline-grid h-60 min-w-60 place-items-center rounded-12 p-8 font-medium text-blue-400 [background:#f4f5f9]">
              {boost("LifetimeTrading")}
            </strong>
            <h4>
              <Trans>Lifetime volume</Trans>
            </h4>
            <p>
              <Trans>
                Past{" "}
                {config ? (
                  formatAmountHuman(config.lifetimeVolumeThreshold, USD_DECIMALS, true, 0).toUpperCase()
                ) : (
                  <RewardsValue loading={loading} width="4ch" />
                )}{" "}
                lifetime volume the boost is yours for good — it never resets.
              </Trans>
            </p>
          </article>
        </div>
        <div className="rewards-referral flex flex-col gap-24 max-mobile:gap-16 [&>h3]:leading-[1.2] max-mobile:[&>h3]:text-[28px] max-mobile:[&>h3]:leading-[32px] max-mobile:[&>h3]:tracking-[-0.032em]">
          <h3>
            <Trans>Earn {referralShare} of all rewards your referrals earn</Trans>
          </h3>
          <div
            className={cx(
              "rewards-referral-example rounded-20 p-32 [background:#fff]",
              "max-mobile:p-16",
              "[&>p]:mt-8 [&>p]:text-14 [&>p]:leading-[19px] [&>p]:tracking-[0.002em] [&>p]:text-slate-500",
              "max-mobile:[&>p]:mt-16 max-mobile:[&>p]:pt-16 max-mobile:[&>p]:[border-top:1px_solid_#f4f5f9]"
            )}
          >
            <div
              className={cx(
                "rewards-referral-comparison grid gap-2 rounded-16 p-4 [background:#bec0da33]",
                "[&_strong>span]:text-18 [&_strong>span]:leading-[1]",
                "max-mobile:flex max-mobile:flex-col max-mobile:gap-16 max-mobile:p-0 max-mobile:[background:none]",
                "[&>div>span]:flex [&>div>span]:items-center [&>div>span]:gap-4 [&>div>span]:text-16 [&>div>span]:leading-[24px]",
                "max-mobile:[&>div>span]:max-w-full max-mobile:[&>div>span]:rounded-12 max-mobile:[&>div>span]:px-8 max-mobile:[&>div>span]:py-4",
                "max-mobile:[&>div>span]:text-16 max-mobile:[&>div>span]:leading-[24px]",
                "[&>div]:flex [&>div]:min-w-0 [&>div]:flex-col [&>div]:justify-center [&>div]:gap-4 [&>div]:rounded-12 [&>div]:px-24 [&>div]:py-12",
                "max-mobile:[&>div]:items-start max-mobile:[&>div]:gap-2 max-mobile:[&>div]:p-0 max-mobile:[&>div]:text-slate-900",
                "max-mobile:[&>div]:[background:none]",
                "max-mobile:[&_strong>span]:leading-[inherit] max-mobile:[&_strong>span]:[font-size:inherit]",
                "[&_strong]:text-24 [&_strong]:font-medium [&_strong]:leading-[28px] [&_strong]:tracking-[-0.032em]",
                "max-tablet:[&_strong]:text-[20px]",
                "max-mobile:[&_strong]:pl-8 max-mobile:[&_strong]:pr-8 max-mobile:[&_strong]:text-16 max-mobile:[&_strong]:leading-[24px]"
              )}
              style={referralShareStyle}
            >
              <div
                className={cx(
                  "rewards-referral-earned",
                  "[background:repeating-linear-gradient(105deg,_transparent_0_7px,_#bec0da1a_7px_8px),_linear-gradient(90deg,_#bec0da00,_#bec0da99)]",
                  "[&>span]:text-slate-600",
                  "max-mobile:[&>span]:w-full",
                  "max-mobile:[&>span]:[background:repeating-linear-gradient(105deg,_transparent_0_7px,_#bec0da1a_7px_8px),_linear-gradient(90deg,_#bec0da00,_#bec0da99)]"
                )}
              >
                <span>
                  <Trans>Your referral earns</Trans>
                </span>
                <strong>
                  <Trans>
                    $1,000 <span>in</span> esGMX + GT
                  </Trans>
                </strong>
              </div>
              <div
                className={cx(
                  "rewards-referral-bonus text-white [--rewards-skeleton-base:#ffffff26] [--rewards-skeleton-highlight:#ffffff4d]",
                  "[background:linear-gradient(110deg,_#2d42fc,_#2632df)]",
                  "[&>span]:text-blue-100",
                  "max-mobile:[&>span]:[background:linear-gradient(110deg,_#2d42fc,_#2632df)]",
                  "[&_svg]:h-16 [&_svg]:w-16 [&_svg]:shrink-0 [&_svg]:rounded-full [&_svg]:text-blue-400 [&_svg]:[background:#a4c3f9]",
                  "max-mobile:[&_svg]:hidden"
                )}
              >
                <span>
                  <IcPlusCircle aria-hidden="true" />
                  <Trans>You earn on top — {referralShare}</Trans>
                </span>
                <strong>
                  <Trans>
                    +{referralExample} <span>in</span> esGMX + GT
                  </Trans>
                </strong>
              </div>
            </div>
            <p>
              <Trans>Every epoch · paid in both tokens</Trans>
            </p>
          </div>
        </div>
        <a
          className={cx(
            "rewards-button rewards-invite-button inline-flex min-h-60 items-center justify-center gap-8 self-center rounded-8 px-24 py-14 text-center",
            "text-16 font-medium leading-[24px] tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
            "[&:active]:shadow-none [&:active]:[transform:translateY(0)_scale(0.98)]",
            "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]",
            "[&:focus-visible]:shadow-[0_4px_20px_#2d42fc40]",
            "[@media(hover:hover)]:[&:hover]:shadow-[0_4px_20px_#2d42fc40] [@media(hover:hover)]:[&:hover]:[transform:translateY(-2px)]"
          )}
          href="#invite"
          onClick={(event) => {
            if (!document.getElementById("invite")?.closest('[data-checked="true"]')) {
              event.preventDefault();
              scrollToLandingSection("rewards-address", 24);
            }
          }}
        >
          <Trans>Invite Traders</Trans>
        </a>
      </div>
      <div
        className={cx(
          "rewards-referral-coins pointer-events-none absolute bottom-[-592.455px] left-[calc(50%_-_129.443px)] h-[981.009px] w-[804.775px]",
          "overflow-clip [transform:translateX(-50%)_rotate(-57.83deg)]",
          "max-mobile:bottom-[-412.24px] max-mobile:left-[calc(50%_-_90.07px)] max-mobile:h-[682.64px] max-mobile:w-[560px]",
          "[&>img]:absolute [&>img]:left-[71.43%] [&>img]:top-[190.63%] [&>img]:h-auto [&>img]:w-[258%] [&>img]:max-w-none",
          "[&>img]:[filter:brightness(0.84)_contrast(1.81)_saturate(0.84)] [&>img]:[transform-origin:0_0] [&>img]:[transform:rotate(-135deg)]"
        )}
        aria-hidden="true"
      >
        <img src={referralCoins} alt="" width={4096} height={2283} loading="lazy" />
      </div>
    </section>
  );
}
