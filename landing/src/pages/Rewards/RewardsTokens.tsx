import { Trans } from "@lingui/macro";

import { ARBITRUM } from "config/chains";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useGtMintingStats } from "domain/synthetics/incentives/v2/useGtMintingStats";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { formatFactorPercentage } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatAmountHuman, formatUsd } from "lib/numbers";

import gmx from "img/logo-icon.svg";
import gt from "img/rewards-landing/gt.svg";
import mintingCurve from "img/rewards-landing/minting-curve.svg";

import { RewardsFlywheel } from "./RewardsFlywheel";
import { RewardsValue } from "./RewardsValue";

export function RewardsTokens({ config, loading }: { config: IncentivesConfig | null | undefined; loading: boolean }) {
  const price = useLatestGtPrice(ARBITRUM);
  const stats = useGtMintingStats();
  const hasError = Boolean(price.error || stats.error);

  return (
    <section className="rewards-tokens" id="tokens">
      <div className="rewards-container">
        <h2>
          <Trans>
            Rewards are paid
            <br />
            in two tokens
          </Trans>
        </h2>
        <div className="rewards-card-grid">
          <article className="rewards-token-card rewards-esgmx-card">
            <header>
              <h3>
                <img src={gmx} alt="" />
                esGMX
              </h3>
              <span className="rewards-token-tag">
                <Trans>
                  {config ? formatFactorPercentage(config.esGmxShareFactor) : <RewardsValue loading={loading} />} of
                  every payout
                </Trans>
              </span>
            </header>
            <div className="rewards-token-option">
              <h4>
                <Trans>Stake it</Trans>
              </h4>
              <p>
                <Trans>
                  Counts towards your Staking Tier just like staking GMX, raising your multiplier on every future trade.
                  Staked esGMX earns the same GMX rewards as staked GMX.
                </Trans>
              </p>
            </div>
            <div className="rewards-token-option">
              <h4>
                <Trans>Vest it</Trans>
              </h4>
              <p>
                <Trans>
                  Converts to GMX over one year. Vesting reserves staked GMX or esGMX against the amount you vest.
                </Trans>
              </p>
              <a href="https://docs.gmx.io/docs/tokenomics/rewards/" target="_blank" rel="noopener noreferrer">
                <Trans>How vesting works ↗</Trans>
              </a>
            </div>
          </article>
          <article className="rewards-token-card">
            <header>
              <h3>
                <img src={gt} alt="" />
                GT
              </h3>
              <span className="rewards-token-tag">
                <Trans>
                  +{config ? formatFactorPercentage(config.gtShareFactor) : <RewardsValue loading={loading} />} on top
                </Trans>
              </span>
            </header>
            <p>
              <Trans>
                Your claim on the TGE of GMTrade.xyz, GMX's sister protocol on Solana. Minting gets 2.1% harder every
                210,000 GT — the same trade earns fewer GT as the minting cost increases.
              </Trans>
            </p>
            <dl className="rewards-gt-stats">
              <div>
                <dt>
                  <Trans>Genesis</Trans>
                </dt>
                <dd>$0.01</dd>
              </div>
              <div>
                <dt>
                  <Trans>Today</Trans>
                </dt>
                <dd>
                  <RewardsValue loading={price.loading || price.isValidating} width="7ch">
                    {price.data ? formatUsd(price.data.priceUsd, { displayDecimals: 4 }) : undefined}
                  </RewardsValue>
                </dd>
              </div>
              <div>
                <dt>
                  <Trans>Next step</Trans>
                </dt>
                <dd>
                  <RewardsValue loading={stats.isLoading || stats.isValidating} width="9ch">
                    {stats.data?.remainingToNextStep !== undefined
                      ? `${formatAmount(stats.data.remainingToNextStep, GT_DECIMALS, 0, true)} GT`
                      : undefined}
                  </RewardsValue>
                </dd>
              </div>
              <div>
                <dt>
                  <Trans>Minted</Trans>
                </dt>
                <dd>
                  <RewardsValue loading={stats.isLoading || stats.isValidating} width="7ch">
                    {stats.data?.totalMinted !== undefined
                      ? `${formatAmountHuman(stats.data.totalMinted, GT_DECIMALS, false, 1).toUpperCase()} GT`
                      : undefined}
                  </RewardsValue>
                </dd>
              </div>
            </dl>
            {hasError && (
              <button
                className="rewards-data-retry"
                onClick={() => {
                  void price.mutate();
                  void stats.mutate();
                }}
              >
                <Trans>Unable to update minting data. Try again.</Trans>
              </button>
            )}
            <div className="rewards-step-chart" aria-hidden="true">
              <span>
                <Trans>You are here</Trans>
              </span>
              <img src={mintingCurve} alt="" loading="lazy" />
            </div>
          </article>
        </div>
        <RewardsFlywheel />
      </div>
    </section>
  );
}
