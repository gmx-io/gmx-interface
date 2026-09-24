import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useRef } from "react";

import { ARBITRUM } from "config/chains";
import { DOCS_LINKS } from "config/links";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { getPageTitle } from "lib/legacy";
import { sendRewardsLandingEvent } from "lib/userAnalytics/rewardsLandingEvents";

import SEO from "components/Seo/SEO";

import dial from "img/rewards-landing/dial.svg";

import { ReturningTrader } from "./ReturningTrader";
import { RewardsCalculator } from "./RewardsCalculator";
import { RewardsEpochSummary } from "./RewardsEpochSummary";
import { RewardsFaq } from "./RewardsFaq";
import { RewardsMultipliers } from "./RewardsMultipliers";
import { RewardsTokens } from "./RewardsTokens";
import { RewardsTradeButton } from "./RewardsTradeButton";
import { RewardsValue } from "./RewardsValue";

import "./Rewards.css";

export default function Rewards() {
  const viewSent = useRef(false);
  const { i18n } = useLingui();
  const config = useIncentivesConfig(ARBITRUM);
  const loading = config.loading || config.isValidating;
  const epochEnd = config.data ? new Date((config.data.epochTimestamp + config.data.epochDuration) * 1000) : undefined;

  useEffect(() => {
    if (viewSent.current) return;
    viewSent.current = true;
    sendRewardsLandingEvent({ action: "RewardsPageView" });
  }, []);

  return (
    <SEO title={getPageTitle(t`Rewards`)}>
      <div className="rewards-page">
        <main>
          <section className="rewards-hero" id="season">
            <div className="rewards-container">
              <h1>
                <Trans>
                  Your trading fees
                  <br />
                  come back to you.
                </Trans>
              </h1>
              <RewardsEpochSummary endpoint={config.endpoint} config={config.data} loading={loading} />
              <RewardsCalculator config={config.data} loading={loading} />
              {!config.data && !loading && (
                <div className="rewards-config-status" role="status">
                  <p>
                    <Trans>Rewards data is temporarily unavailable.</Trans>
                  </p>
                  <button className="rewards-button" onClick={() => void config.mutate()}>
                    <Trans>Try again</Trans>
                  </button>
                </div>
              )}
            </div>
          </section>
          <ReturningTrader config={config.data} loading={loading} endpoint={config.endpoint} />
          <RewardsMultipliers config={config.data} loading={loading} />
          <RewardsTokens config={config.data} loading={loading} />
          <RewardsFaq />
          <section className="rewards-closing">
            <img className="rewards-closing-dial" src={dial} alt="" loading="lazy" />
            <div className="rewards-container">
              <h2>
                <Trans>
                  Start earning
                  <br />
                  on your next trade
                </Trans>
              </h2>
              <div className="rewards-closing-cta">
                <RewardsTradeButton placement="Closing" />
                <p>
                  <Trans>
                    Trade before{" "}
                    <RewardsValue loading={loading} width="18ch">
                      {epochEnd && (
                        <time dateTime={epochEnd.toISOString()}>
                          {epochEnd.toLocaleString(i18n.locale, {
                            weekday: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                            hourCycle: "h23",
                            timeZone: "UTC",
                          })}{" "}
                          UTC
                        </time>
                      )}
                    </RewardsValue>{" "}
                    and you're in this epoch.
                  </Trans>
                </p>
              </div>
            </div>
          </section>
        </main>
        <footer className="rewards-footer rewards-container">
          <a href={DOCS_LINKS.rewardsTermsAndConditions} target="_blank" rel="noopener noreferrer">
            <Trans>Terms and Conditions</Trans>
          </a>
          <p>
            <Trans>Season 1 values are season-scoped</Trans>
          </p>
          <div>
            <a href={DOCS_LINKS.rewardsProgram} target="_blank" rel="noopener noreferrer">
              <Trans>Documentations</Trans>
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://gov.gmx.io/" target="_blank" rel="noopener noreferrer">
              <Trans>Governance</Trans>
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://x.com/GMX_IO" target="_blank" rel="noopener noreferrer" aria-label="GMX on X">
              X
            </a>
          </div>
        </footer>
      </div>
    </SEO>
  );
}
