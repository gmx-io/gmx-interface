import { Plural, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Link } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { useIncentivesEpochStats } from "domain/synthetics/incentives/v2/useIncentivesEpochStats";
import { formatFactorPercentage, getMaxRewardRateFactor } from "domain/synthetics/incentives/v2/utils";
import { formatUsd } from "lib/numbers";
import type { LandingPageRewardsClickEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { RewardsOrbit } from "./RewardsOrbit";
import { RewardsHeaderBadge } from "../../Rewards/RewardsHeaderBadge";
import { RewardsValue } from "../../Rewards/RewardsValue";

import "./RewardsSection.css";

export function RewardsSection() {
  const { i18n } = useLingui();
  const config = useIncentivesConfig(ARBITRUM);
  const stats = useIncentivesEpochStats(config.endpoint, config.data);
  const loading = config.loading || config.isValidating;
  const nextPayout = config.data
    ? new Date((config.data.epochTimestamp + config.data.epochDuration) * 1000).toLocaleDateString(i18n.locale, {
        weekday: "long",
        timeZone: "UTC",
      })
    : undefined;
  const payout = (
    <RewardsValue loading={loading || stats.isLoading}>
      {stats.data ? formatUsd(stats.data.rewardsUsd, { displayDecimals: 0 }) : undefined}
    </RewardsValue>
  );
  const wallets = stats.data ? (
    <Plural value={stats.data.traderCount} one="# wallet" other="# wallets" />
  ) : (
    <RewardsValue loading={loading || stats.isLoading} width="8ch" />
  );

  function openRewards() {
    userAnalytics.pushEvent<LandingPageRewardsClickEvent>(
      { event: "LandingPageAction", data: { action: "RewardsPageClick" } },
      { instantSend: true }
    );
  }

  return (
    <section className="home-rewards" aria-labelledby="home-rewards-title">
      <div className="home-rewards-container">
        <div className="home-rewards-copy">
          <RewardsHeaderBadge />
          <h2 id="home-rewards-title">
            <Trans>
              Every Wednesday,
              <br />
              your fees come back.
            </Trans>
          </h2>
          <Link className="btn-landing home-rewards-button" to="/rewards" onClick={openRewards}>
            <Trans>Check my multiplier</Trans>
          </Link>
          <div className="home-rewards-status">
            {nextPayout && (
              <>
                <span>
                  <Trans>next payout {nextPayout}</Trans>
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>
              {config.data &&
              config.data.epochTimestamp - config.data.epochDuration < config.data.programStartTimestamp ? (
                <Trans>The first epoch is under way</Trans>
              ) : stats.error && !stats.data ? (
                <Trans>Previous epoch totals are temporarily unavailable.</Trans>
              ) : (
                <Trans>
                  {payout} returned to {wallets} last week
                </Trans>
              )}
            </span>
          </div>
        </div>
        <div className="home-rewards-art">
          <RewardsOrbit />
          <div className="home-rewards-card">
            <p className="home-rewards-card-label">
              <Trans>Returned to you up to</Trans>
            </p>
            <strong>
              <RewardsValue loading={loading} width="4ch">
                {config.data ? formatFactorPercentage(getMaxRewardRateFactor(config.data)) : undefined}
              </RewardsValue>
            </strong>
            <p className="home-rewards-card-description">
              <Trans>of your fees, in esGMX + GT</Trans>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
