import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { formatFactorPercentage, getMaxRewardRateFactor } from "domain/synthetics/incentives/v2/utils";
import type { LandingPageRewardsClickEvent } from "lib/userAnalytics/types";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

import { RewardsOrbit } from "./RewardsOrbit";
import { RewardsHeaderBadge } from "../../Rewards/RewardsHeaderBadge";
import { RewardsValue } from "../../Rewards/RewardsValue";

import "./RewardsSection.css";

export function RewardsSection() {
  const config = useIncentivesConfig(ARBITRUM);
  const loading = config.loading || config.isValidating;

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
