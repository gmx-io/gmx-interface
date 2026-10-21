import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM } from "config/chains";
import { DOCS_LINKS } from "config/links";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { getPageTitle } from "lib/legacy";
import { sendRewardsLandingEvent } from "lib/userAnalytics/rewardsLandingEvents";

import SEO from "components/Seo/SEO";

import dial from "img/rewards-landing/dial.svg";

import { ReturningTrader } from "./ReturningTrader";
import { RewardsCalculator } from "./RewardsCalculator";
import { RewardsClosingNote } from "./RewardsClosingNote";
import { RewardsEpochSummary } from "./RewardsEpochSummary";
import { RewardsFaq } from "./RewardsFaq";
import { RewardsMultipliers } from "./RewardsMultipliers";
import { RewardsTokens } from "./RewardsTokens";
import { RewardsTradeButton } from "./RewardsTradeButton";

export default function Rewards() {
  const viewSent = useRef(false);
  const config = useIncentivesConfig(ARBITRUM);
  const loading = config.loading || config.isValidating;

  useEffect(() => {
    if (viewSent.current) return;
    viewSent.current = true;
    sendRewardsLandingEvent({ action: "RewardsPageView" });
  }, []);

  return (
    <SEO title={getPageTitle(t`Rewards`)}>
      <div
        className={cx(
          "min-h-screen overflow-clip pt-68 text-16 leading-[1.44] tracking-[-0.032em] text-white [--rewards-blue:#2d42fc]",
          "[--rewards-muted:#a0a3c4] [--rewards-skeleton-base:#b4bbff1a] [--rewards-skeleton-highlight:#b4bbff33] [background:transparent]",
          "[&_:where(h1)]:text-100 [&_:where(h1)]:font-medium [&_:where(h1)]:leading-[0.98] [&_:where(h1)]:tracking-[-0.05em]",
          "[&_:where(h2)]:text-80 [&_:where(h2)]:font-medium [&_:where(h2)]:leading-[0.98] [&_:where(h2)]:tracking-[-0.05em]",
          "[&_.rewards-wallet-link-desktop]:decoration-transparent [&_.rewards-wallet-link-desktop]:w-fit [&_.rewards-wallet-link-desktop]:underline",
          "[&_.rewards-wallet-link-desktop]:underline-offset-[4px]",
          "[&_.rewards-wallet-link-desktop]:[transition:color_0.18s,_text-decoration-color_0.18s,_transform_0.18s_ease-out]",
          "[&_.rewards-wallet-link-mobile]:decoration-transparent [&_.rewards-wallet-link-mobile]:w-fit [&_.rewards-wallet-link-mobile]:underline",
          "[&_.rewards-wallet-link-mobile]:underline-offset-[4px]",
          "[&_.rewards-wallet-link-mobile]:[transition:color_0.18s,_text-decoration-color_0.18s,_transform_0.18s_ease-out]",
          "max-tablet:[&_:where(h1)]:text-80",
          "max-compact:pt-60",
          "[&_#invite]:scroll-mt-88",
          "motion-reduce:[&_*::after]:scroll-auto motion-reduce:[&_*::after]:[transition:none]",
          "motion-reduce:[&_*::before]:scroll-auto motion-reduce:[&_*::before]:[transition:none]",
          "[&_*]:box-border",
          "motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:[transition:none]",
          "[&_.rewards-button-muted:not(:disabled):active]:[background:var(--color-button-secondary)]",
          "[&_.rewards-button-white:not(:disabled):active]:text-blue-400",
          "[&_.rewards-button-white:not(:disabled):active]:[background:var(--color-button-whiteActive)]",
          "[&_.rewards-button:not(.rewards-button-white):not(.rewards-button-muted):not(:disabled):active]:text-white",
          "[&_.rewards-button:not(.rewards-button-white):not(.rewards-button-muted):not(:disabled):active]:[background:var(--color-button-primaryActive)]",
          "[&_.rewards-invite-button]:[transition:background-color_0.18s,_color_0.18s,_box-shadow_0.18s,_transform_0.18s_ease-out]",
          "motion-reduce:[&_.rewards-invite-button]:scroll-auto motion-reduce:[&_.rewards-invite-button]:[transition:none]",
          "motion-reduce:[&_.rewards-wallet-link-desktop]:scroll-auto motion-reduce:[&_.rewards-wallet-link-desktop]:[transition:none]",
          "motion-reduce:[&_.rewards-wallet-link-mobile]:scroll-auto motion-reduce:[&_.rewards-wallet-link-mobile]:[transition:none]",
          "[&_:focus-visible]:[outline-offset:-2px] [&_:focus-visible]:[outline:2px_solid_#7885ff]",
          "max-mobile:[&_:where(h1)]:text-[clamp(36px,_10.25vw,_64px)]",
          "max-tablet:[&_:where(h2)]:text-[64px]",
          "max-mobile:[&_:where(h2)]:text-[clamp(36px,_8.5vw,_56px)]",
          "[&_:where(h3)]:text-[40px] [&_:where(h3)]:font-medium [&_:where(h3)]:leading-[1.02] [&_:where(h3)]:tracking-[-0.03em]",
          "max-mobile:[&_:where(h3)]:text-[30px]",
          "[&_:where(h4)]:text-24 [&_:where(h4)]:font-medium [&_:where(h4)]:leading-[32px] [&_:where(h4)]:tracking-[-0.032em]",
          "[&_a:hover]:text-blue-300",
          "[&_a]:[-webkit-tap-highlight-color:transparent] [&_a]:[transition:background-color_0.18s,_color_0.18s,_opacity_0.18s]",
          "[&_button]:[-webkit-tap-highlight-color:transparent] [&_button]:[transition:background-color_0.18s,_color_0.18s,_opacity_0.18s]",
          "[&_input]:[-webkit-tap-highlight-color:transparent]",
          "[&_section]:scroll-mt-88",
          "[.telegram-browser_#root:has(&)]:scroll-smooth",
          "motion-reduce:[.telegram-browser_#root:has(&)]:scroll-auto",
          "[@media(hover:hover)]:[&_.rewards-button-muted:not(:disabled):hover]:[background:var(--color-button-secondaryHover)]",
          "[@media(hover:hover)]:[&_.rewards-button-white:not(:disabled):hover]:text-blue-400",
          "[@media(hover:hover)]:[&_.rewards-button-white:not(:disabled):hover]:[background:var(--color-button-whiteHover)]",
          "[@media(hover:hover)]:[&_.rewards-button:not(.rewards-button-white):not(.rewards-button-muted):not(:disabled):hover]:text-white",
          "[@media(hover:hover)]:[&_.rewards-button:not(.rewards-button-white):not(.rewards-button-muted):not(:disabled):hover]:[background:var(--color-button-primaryHover)]",
          "[body:has(&)]:bg-[var(--rewards-footer-background)]",
          "[body:has(&)]:[background-image:linear-gradient(to_bottom,_var(--rewards-header-background),_var(--rewards-footer-background))]",
          "[body:has(&)_[data-landing-header]_.btn-landing:active]:text-white",
          "[body:has(&)_[data-landing-header]_.btn-landing:active]:[background:var(--color-button-primaryActive)]",
          "[@media(hover:hover)]:[body:has(&)_[data-landing-header]_.btn-landing:hover]:text-white",
          "[@media(hover:hover)]:[body:has(&)_[data-landing-header]_.btn-landing:hover]:[background:var(--color-button-primaryHover)]",
          "[html:has(&)]:scroll-smooth [html:has(&)]:bg-[var(--rewards-footer-background)] [html:has(&)]:[--rewards-footer-background:#090a14]",
          "[html:has(&)]:[--rewards-header-background:#090a14]",
          "[html:has(&)]:[background-image:linear-gradient(to_bottom,_var(--rewards-header-background),_var(--rewards-footer-background))]",
          "motion-reduce:[html:has(&)]:scroll-auto"
        )}
      >
        <main>
          <section
            className={cx(
              "pb-[120px] pl-0 pr-0 pt-40",
              "[background:url('../../src/img/rewards-landing/hero-background.webp')_center_bottom_/_cover_no-repeat]",
              "max-mobile:px-0 max-mobile:py-40 max-mobile:[background:#090a14]",
              "[&_h1]:mb-24",
              "max-mobile:[&_h1]:mb-16 max-mobile:[&_h1]:text-[40px] max-mobile:[&_h1]:leading-[48px] max-mobile:[&_h1]:tracking-[-0.03em]"
            )}
            id="season"
          >
            <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
              <h1>
                <Trans>
                  Your trading fees
                  <br />
                  come back to you.
                </Trans>
              </h1>
              <RewardsEpochSummary endpoint={config.endpoint} config={config.data} />
              <RewardsCalculator config={config.data} loading={loading} />
              {!config.data && !loading && (
                <div className="mt-64 flex flex-wrap items-center gap-12" role="status">
                  <p>
                    <Trans>Rewards data is temporarily unavailable.</Trans>
                  </p>
                  <button
                    className={cx(
                      "rewards-button inline-flex min-h-44 items-center justify-center gap-8 rounded-8 px-20 py-14 text-center text-16 font-medium leading-[24px]",
                      "tracking-[-0.032em] text-white [background:var(--rewards-blue)]",
                      "[&:disabled]:cursor-default [&:disabled]:opacity-[0.55]"
                    )}
                    onClick={() => void config.mutate()}
                  >
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
          <section
            className={cx(
              "relative pb-80 pl-0 pr-0 pt-[120px]",
              "[&_h2]:text-80 [&_h2]:mb-40",
              "max-mobile:pb-64 max-mobile:pl-0 max-mobile:pr-0 max-mobile:pt-40",
              "[&_.rewards-button]:shrink-0 [&_.rewards-button]:px-20 [&_.rewards-button]:py-18 [&_.rewards-button]:text-16",
              "max-tablet:[&_h2]:text-[64px]",
              "max-mobile:[&_h2]:mb-32 max-mobile:[&_h2]:text-[clamp(36px,_8.5vw,_56px)]",
              "[&_p]:text-14 [&_p]:leading-[19px] [&_p]:text-slate-500"
            )}
          >
            <img
              className="pointer-events-none absolute left-[calc(50%_+_270px)] top-[270px] h-[650px] w-[650px] max-w-none max-mobile:hidden"
              src={dial}
              alt=""
              loading="lazy"
            />
            <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
              <h2>
                <Trans>
                  Start earning
                  <br />
                  on your next trade
                </Trans>
              </h2>
              <div className="flex items-center gap-24 max-mobile:flex-wrap max-mobile:gap-20">
                <RewardsTradeButton placement="Closing" />
                <RewardsClosingNote config={config.data} loading={loading} />
              </div>
            </div>
          </section>
        </main>
        <footer
          className={cx(
            "rewards-container relative ml-auto mr-auto flex min-h-[144px] w-[min(1200px,_calc(100%_-_80px))] items-start justify-between",
            "gap-24 pb-[104px] pl-0 pr-0 pt-24 text-[13px] font-medium leading-[16px] tracking-[0.002em] text-slate-600 [border-top:1px_solid_#1e2033]",
            "max-mobile:w-[calc(100%_-_32px)] max-mobile:flex-col max-mobile:items-start max-mobile:gap-24 max-mobile:pb-32",
            "[&>div]:flex [&>div]:items-center [&>div]:gap-8",
            "max-mobile:[&>div]:flex-wrap max-mobile:[&>div]:gap-20 max-mobile:[&>div]:text-[13px]"
          )}
        >
          <Link to="/rewards-terms-and-conditions">
            <Trans>Terms and Conditions</Trans>
          </Link>
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
