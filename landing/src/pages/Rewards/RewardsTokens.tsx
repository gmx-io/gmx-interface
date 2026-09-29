import { Trans } from "@lingui/macro";
import cx from "classnames";

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
    <section
      className={cx(
        "rewards-tokens relative overflow-hidden px-0 py-[120px]",
        "max-mobile:pb-80 max-mobile:pl-0 max-mobile:pr-0 max-mobile:pt-64",
        "[&::before]:pointer-events-none [&::before]:absolute [&::before]:left-[calc(50%_-_1606px)] [&::before]:top-[188px] [&::before]:h-[760px]",
        "[&::before]:w-[1502px] [&::before]:opacity-[0.3]",
        "[&::before]:[background:linear-gradient(214deg,_#090a1400_1%,_#090a14_83%)_0_0_/_100%_100%,_url('../../src/img/rewards-landing/tokens-glow.png')_-2498.58px_-1132.4px_/_6364.88px_3510px_no-repeat]",
        "[&::before]:[content:''] [&::before]:[filter:blur(46px)]",
        "[&_h2]:mb-40",
        "max-mobile:[&_h2]:mb-32"
      )}
      id="tokens"
    >
      <div className="rewards-container relative ml-auto mr-auto w-[min(1200px,_calc(100%_-_80px))] max-mobile:w-[calc(100%_-_32px)]">
        <h2>
          <Trans>
            Rewards are paid
            <br />
            in two tokens
          </Trans>
        </h2>
        <div className="rewards-card-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-24 max-mobile:grid-cols-[1fr] max-mobile:gap-20">
          <article
            className={cx(
              "rewards-token-card rewards-esgmx-card relative min-h-[393px] self-start overflow-hidden rounded-20 p-28 text-16 text-slate-400",
              "[background:#171827]",
              "max-mobile:min-h-0 max-mobile:p-24",
              "max-mobile:[&>p]:text-14",
              "[&_h3]:flex [&_h3]:shrink-0 [&_h3]:items-center [&_h3]:gap-10 [&_h3]:text-24 [&_h3]:leading-[32px] [&_h3]:tracking-[-0.032em]",
              "[&_h3]:text-white",
              "max-mobile:[&_h3]:text-24",
              "[&_h3_img]:h-32 [&_h3_img]:w-32 [&_h3_img]:rounded-full [&_h3_img]:object-contain [&_h3_img]:p-4 [&_h3_img]:[background:#1e2033]",
              "[&_header]:mb-20 [&_header]:flex [&_header]:items-center [&_header]:justify-between [&_header]:gap-12 [&_header]:pb-20",
              "[&_header]:[border-bottom:1px_solid_#1e2033]"
            )}
          >
            <header>
              <h3>
                <img src={gmx} alt="" />
                esGMX
              </h3>
              <span className="rewards-token-tag rounded-8 px-10 py-6 text-12 font-medium uppercase leading-[15px] tracking-[0.002em] text-blue-300 [background:#1e2033] [border:1px_solid_#3c406780] max-mobile:text-[9px]">
                <Trans>
                  {config ? formatFactorPercentage(config.esGmxShareFactor) : <RewardsValue loading={loading} />} of
                  every payout
                </Trans>
              </span>
            </header>
            <div
              className={cx(
                "rewards-token-option relative mb-20 pl-32 [z-index:1]",
                "[&_h4]:text-18 [&_h4]:mb-8 [&_h4]:leading-[1.36] [&_h4]:tracking-[-0.032em] [&_h4]:text-white",
                "max-mobile:pl-24",
                "[&::before]:absolute [&::before]:left-0 [&::before]:top-4 [&::before]:h-16 [&::before]:w-16 [&::before]:rounded-full",
                "[&::before]:shadow-[inset_0_0_0_3px_#171827] [&::before]:[background:#2d42fc] [&::before]:[border:0.5px_dashed_#2d42fc]",
                "[&::before]:[content:'']",
                "[&:last-child]:mb-0",
                "max-mobile:[&>p]:text-14",
                "[&_a]:mt-8 [&_a]:inline-block [&_a]:text-14 [&_a]:leading-[20px] [&_a]:text-[#929cff]"
              )}
            >
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
            <div
              className={cx(
                "rewards-token-option relative mb-20 pl-32 [z-index:1]",
                "[&_h4]:text-18 [&_h4]:mb-8 [&_h4]:leading-[1.36] [&_h4]:tracking-[-0.032em] [&_h4]:text-white",
                "max-mobile:pl-24",
                "[&::before]:absolute [&::before]:left-0 [&::before]:top-4 [&::before]:h-16 [&::before]:w-16 [&::before]:rounded-full",
                "[&::before]:shadow-[inset_0_0_0_3px_#171827] [&::before]:[background:#2d42fc] [&::before]:[border:0.5px_dashed_#2d42fc]",
                "[&::before]:[content:'']",
                "[&:last-child]:mb-0",
                "max-mobile:[&>p]:text-14",
                "[&_a]:mt-8 [&_a]:inline-block [&_a]:text-14 [&_a]:leading-[20px] [&_a]:text-[#929cff]"
              )}
            >
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
          <article
            className={cx(
              "rewards-token-card relative min-h-[393px] overflow-hidden rounded-20 p-28 text-16 text-slate-400 [background:#171827]",
              "max-mobile:min-h-0 max-mobile:p-24",
              "max-mobile:[&>p]:text-14",
              "[&_h3]:flex [&_h3]:shrink-0 [&_h3]:items-center [&_h3]:gap-10 [&_h3]:text-24 [&_h3]:leading-[32px] [&_h3]:tracking-[-0.032em]",
              "[&_h3]:text-white",
              "max-mobile:[&_h3]:text-24",
              "[&_h3_img]:h-32 [&_h3_img]:w-32 [&_h3_img]:object-contain",
              "[&_header]:mb-20 [&_header]:flex [&_header]:items-center [&_header]:justify-between [&_header]:gap-12 [&_header]:pb-20",
              "[&_header]:[border-bottom:1px_solid_#1e2033]"
            )}
          >
            <header>
              <h3>
                <img src={gt} alt="" />
                GT
              </h3>
              <span className="rewards-token-tag rounded-8 px-10 py-6 text-12 font-medium uppercase leading-[15px] tracking-[0.002em] text-blue-300 [background:#1e2033] [border:1px_solid_#3c406780] max-mobile:text-[9px]">
                <Trans>
                  +{config ? formatFactorPercentage(config.gtShareFactor) : <RewardsValue loading={loading} />} on top
                </Trans>
              </span>
            </header>
            <p>
              <Trans>
                GMTrade Points, added on top of every esGMX payout. GT is credited at the mint price and bought back at
                it with a share of GMTrade's trading fees. Minting gets 2.1% harder every 210,000 GT, so the same trade
                earns fewer GT over time.
              </Trans>
            </p>
            <dl
              className={cx(
                "rewards-gt-stats mt-20 flex justify-between gap-12",
                "[&_dd]:text-18 [&_dd]:whitespace-nowrap [&_dd]:font-medium [&_dd]:leading-[1.36] [&_dd]:tracking-[-0.032em] [&_dd]:text-white",
                "max-tablet:grid max-tablet:grid-cols-[repeat(2,_1fr)] max-tablet:gap-y-18",
                "[&_dt]:mb-4 [&_dt]:text-14 [&_dt]:leading-[1.36] [&_dt]:text-slate-500"
              )}
            >
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
                className="rewards-data-retry mt-12 text-left text-12 text-blue-100 underline"
                onClick={() => {
                  void price.mutate();
                  void stats.mutate();
                }}
              >
                <Trans>Unable to update minting data. Try again.</Trans>
              </button>
            )}
            <figure
              className={cx(
                "rewards-step-chart relative mt-20 [aspect-ratio:532_/_108]",
                "[&>span]:absolute [&>span]:left-[58.55%] [&>span]:top-0 [&>span]:rounded-8 [&>span]:px-10 [&>span]:py-6 [&>span]:text-12 [&>span]:font-medium",
                "[&>span]:leading-[15px] [&>span]:tracking-[0.002em] [&>span]:text-white [&>span]:[background:#2d42fc] [&>span]:[transform:translateX(-50%)]",
                "[&_img]:h-auto [&_img]:w-full"
              )}
            >
              <span aria-hidden="true">
                <Trans>You are here</Trans>
              </span>
              <img src={mintingCurve} alt="" loading="lazy" />
              <figcaption
                className={cx(
                  "rewards-step-chart-caption absolute bottom-0 right-0 max-w-[calc(42%_-_8px)] pb-1 pl-4 pr-4 pt-6 text-right text-12 font-medium",
                  "leading-[15px] tracking-[0.002em] text-slate-600 [background:#171827]",
                  "max-tablet:static max-tablet:max-w-none"
                )}
              >
                <Trans>GT's minting difficulty increase</Trans>
              </figcaption>
            </figure>
          </article>
        </div>
        <RewardsFlywheel />
      </div>
    </section>
  );
}
