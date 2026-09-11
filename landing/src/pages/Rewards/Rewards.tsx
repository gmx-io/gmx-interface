import { msg, t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { HeaderMenu } from "landing/pages/Home/HeaderMenu/HeaderMenu";
import { useMemo } from "react";

import { ARBITRUM } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { getPageTitle } from "lib/legacy";

import SEO from "components/Seo/SEO";

import dial from "img/rewards-landing/dial.svg";

import { ReturningTrader } from "./ReturningTrader";
import { RewardsCalculator } from "./RewardsCalculator";
import { RewardsFaq } from "./RewardsFaq";
import { RewardsMultipliers } from "./RewardsMultipliers";
import { RewardsTokens } from "./RewardsTokens";
import { RewardsTradeButton } from "./RewardsTradeButton";
import { RewardsValue } from "./RewardsValue";

import "./Rewards.css";

export default function Rewards() {
  const { i18n, _ } = useLingui();
  const config = useIncentivesConfig(ARBITRUM);
  const loading = config.loading || config.isValidating;
  const headerLinks = useMemo(
    () => [
      { label: _(msg`Season 1`), href: "#season" },
      { label: _(msg`Multipliers`), href: "#multipliers" },
    ],
    [_]
  );
  const epochEnd = config.data ? new Date((config.data.epochTimestamp + config.data.epochDuration) * 1000) : undefined;

  return (
    <SEO title={getPageTitle(t`Rewards`)}>
      <HeaderMenu
        badge={
          <span className="rewards-live" title={t`Season 1 · Live`}>
            <i aria-hidden="true" />
            <span className="rewards-live-full">
              <Trans>Season 1 · Live</Trans>
            </span>
            <span className="rewards-live-compact">
              <Trans>Live</Trans>
            </span>
          </span>
        }
        additionalLinks={headerLinks}
      />
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
          <RewardsFaq config={config.data} loading={loading} />
          <section className="rewards-closing">
            <img className="rewards-closing-dial" src={dial} alt="" loading="lazy" />
            <div className="rewards-container">
              <h2>
                <Trans>
                  Start earning
                  <br />
                  on your next trade.
                </Trans>
              </h2>
              <div className="rewards-closing-cta">
                <RewardsTradeButton />
                <p>
                  <Trans>Current epoch ends</Trans>{" "}
                  <RewardsValue loading={loading} width="18ch">
                    {epochEnd && (
                      <time dateTime={epochEnd.toISOString()}>
                        {epochEnd.toLocaleString(i18n.locale, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        })}{" "}
                        UTC
                      </time>
                    )}
                  </RewardsValue>
                </p>
              </div>
            </div>
          </section>
        </main>
        <footer className="rewards-footer rewards-container">
          <a href="/terms-and-conditions">
            <Trans>Terms</Trans>
          </a>
          <p>
            <Trans>Season 1 values are season-scoped</Trans>
          </p>
          <div>
            <a href="https://docs.gmx.io/" target="_blank" rel="noopener noreferrer">
              <Trans>Docs</Trans>
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
