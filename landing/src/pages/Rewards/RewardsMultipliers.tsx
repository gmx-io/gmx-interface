import { t, Trans } from "@lingui/macro";
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
      return token.symbol;
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
    <section className="rewards-multipliers rewards-light" id="multipliers">
      <div className="rewards-container">
        <h2>
          <Trans>
            How your rewards
            <br />
            are calculated
          </Trans>
        </h2>
        <div className="rewards-formula">
          <div className="rewards-formula-equation">
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
          <p className="rewards-eyebrow">
            <Trans>
              Every 1x returns {perMultiplierRate} of your fees. At {exampleMultiplier}, that's {exampleRate} back.
            </Trans>
          </p>
        </div>
        <div className="rewards-card-grid rewards-tiers">
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
        <div className="rewards-boost-cards">
          <article>
            <strong className="rewards-boost-badge">{boost("ManualAllocation")}</strong>
            <h4>
              <Trans>Comeback boost</Trans>
            </h4>
            <p>
              <Trans>Early user? Check your wallet for a boost on your trades, until your bonus budget runs out.</Trans>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge">{boost("FeaturedMarkets")}</strong>
            <h4>
              <Trans>Featured markets</Trans>
            </h4>
            <p>
              <Trans>Open and close on the current set:</Trans>{" "}
              <RewardsValue loading={loading} width="12ch">
                {config ? featuredMarkets || <Trans>See the current markets in the app.</Trans> : undefined}
              </RewardsValue>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge">{boost("BalancingTrades")}</strong>
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
                on the under-traded side and get rewarded for balancing the market.
              </Trans>
            </p>
          </article>
          <article>
            <strong className="rewards-boost-badge">{boost("LifetimeTrading")}</strong>
            <h4>
              <Trans>Lifetime volume</Trans>
            </h4>
            <p>
              <Trans>
                Reach{" "}
                {config ? (
                  formatAmountHuman(config.lifetimeVolumeThreshold, USD_DECIMALS, true, 0).toUpperCase()
                ) : (
                  <RewardsValue loading={loading} width="4ch" />
                )}{" "}
                in lifetime volume. The boost is yours for good — it never resets.
              </Trans>
            </p>
          </article>
        </div>
        <div className="rewards-referral">
          <h3>
            <Trans>Earn {referralShare} of all rewards your referrals earn</Trans>
          </h3>
          <div className="rewards-referral-example">
            <div className="rewards-referral-comparison" style={referralShareStyle}>
              <div className="rewards-referral-earned">
                <span>
                  <Trans>Your referral earns</Trans>
                </span>
                <strong>
                  <Trans>
                    $1,000 <span>in</span> esGMX + GT
                  </Trans>
                </strong>
              </div>
              <div className="rewards-referral-bonus">
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
        <a className="rewards-button rewards-invite-button" href="#invite">
          <Trans>Invite Traders</Trans>
        </a>
      </div>
      <div className="rewards-referral-coins" aria-hidden="true">
        <img src={referralCoins} alt="" width={4096} height={2283} loading="lazy" />
      </div>
    </section>
  );
}
