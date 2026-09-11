import { Trans } from "@lingui/macro";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplier,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";

import { RewardsValue } from "./RewardsValue";

export function RewardsFaq({ config, loading }: { config: IncentivesConfig | null | undefined; loading: boolean }) {
  const maximumRate = (
    <RewardsValue loading={loading} width="4ch">
      {config ? formatFactorPercentage(getMaxRewardRateFactor(config)) : undefined}
    </RewardsValue>
  );
  const multiplier = (
    <RewardsValue loading={loading}>
      {config ? formatMultiplier(config.maxMultiplier, config.multiplierDecimals) : undefined}
    </RewardsValue>
  );
  const items = [
    {
      question: <Trans>Is {maximumRate} of my fees real?</Trans>,
      answer: (
        <Trans>
          Yes, at the {multiplier} multiplier cap, which can be reached by combining staking tiers, volume tiers, and
          boosts. Rewards are paid in esGMX and GT. Use the calculator above to see the split for your estimated trading
          volume and stake.
        </Trans>
      ),
    },
    {
      question: <Trans>Which chains count for Season 1?</Trans>,
      answer: <Trans>Season 1 is active on Arbitrum. Trades on Avalanche or MegaETH are not eligible.</Trans>,
    },
    {
      question: <Trans>When do I get paid?</Trans>,
      answer: (
        <Trans>
          Rewards are distributed after each weekly epoch ends. Track your earned rewards and manage your esGMX in the
          app's Rewards page.
        </Trans>
      ),
    },
    {
      question: <Trans>What is GT worth?</Trans>,
      answer: (
        <Trans>
          GT is the native token of GMTrade. The minting cost shown above determines how much GT your rewards receive.
          It is not a market price or a guaranteed value at the token generation event.
        </Trans>
      ),
    },
    {
      question: <Trans>Should I stake or vest my esGMX?</Trans>,
      answer: (
        <Trans>
          Staking esGMX earns staking rewards and counts towards your staking tier. Vesting converts esGMX into liquid
          GMX over one year and reserves staked GMX or esGMX against the amount you vest. Choose based on whether you
          want to grow your stake or gradually receive liquid GMX.
        </Trans>
      ),
    },
    {
      question: <Trans>Do my old trades count?</Trans>,
      answer: (
        <Trans>
          Historical activity can qualify your wallet for a comeback bonus and the lifetime-volume boost. Old trades do
          not receive new weekly rewards retroactively. Use the wallet checker above to see your remaining comeback
          bonus.
        </Trans>
      ),
    },
    {
      question: <Trans>Can the rules change?</Trans>,
      answer: (
        <Trans>
          Program parameters and featured markets can change. The calculator and tier tables use the current program
          configuration. Check the documentation for the latest rules.
        </Trans>
      ),
    },
  ];

  return (
    <section className="rewards-faq">
      <div className="rewards-container">
        <h2>
          <Trans>FAQ</Trans>
        </h2>
        <div className="rewards-faq-accordion">
          {items.map((item, index) => (
            <details key={index} open={index < 2}>
              <summary>
                {item.question}
                <span aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
          <a href="https://docs.gmx.io/" target="_blank" rel="noopener noreferrer">
            <Trans>For more information read docs ↗</Trans>
          </a>
        </div>
      </div>
    </section>
  );
}
