import { Plural, Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/types";

import { Faq, FaqItem } from "components/Faq/Faq";

import { getMaxMultiplierLabel, getPointsExpirationEpochs } from "./incentivesText";

export function FaqSection({ config }: { config?: IncentivesConfig }) {
  const maxMultiplierLabel = getMaxMultiplierLabel(config);
  const pointsExpirationEpochs = getPointsExpirationEpochs(config);

  const items: FaqItem[] = useMemo(
    () => [
      {
        title: t`What are GMX Points?`,
        content: (
          <Trans>
            GMX Points are loyalty rewards earned by trading on GMX. Points are pegged 1:1 to GMX price and are earned
            each epoch based on your trading fees and multiplier. Points automatically discount up to 50% of your
            open/close trading fees.
          </Trans>
        ),
      },
      {
        title: t`How do I earn points?`,
        content: (
          <Trans>
            Points are earned each epoch based on the open/close trading fees you pay, adjusted by your total
            multiplier. Your multiplier is the sum of your Volume Tier, Staking Tier, and any Activity Boosts, capped at
            {maxMultiplierLabel}.
          </Trans>
        ),
      },
      {
        title: t`Do points expire?`,
        content: (
          <Plural
            value={pointsExpirationEpochs}
            one="Yes, points expire after # epoch. The oldest points are consumed first when applied to fee discounts (FIFO)."
            other="Yes, points expire after # epochs. The oldest points are consumed first when applied to fee discounts (FIFO)."
          />
        ),
      },
      {
        title: t`How do multipliers work?`,
        content: (
          <Trans>
            Your total multiplier is the sum of three components: Volume Tier (based on trading volume during the
            current epoch), Staking Tier (based on staked GMX), and Activity Boosts (from specific trading behaviors).
            The maximum multiplier is {maxMultiplierLabel}.
          </Trans>
        ),
      },
      {
        title: t`How are rewards claimed?`,
        content: (
          <Trans>
            At the end of each epoch, points that were spent to discount fees are converted into GMX rewards. You can
            claim these rewards to your wallet or restake them to increase your staking tier and earn more points.
          </Trans>
        ),
      },
    ],
    [maxMultiplierLabel, pointsExpirationEpochs]
  );

  return <Faq items={items} title={<Trans>FAQ</Trans>} />;
}
