import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { Faq, FaqItem } from "components/Faq/Faq";

export function FaqSection() {
  const items: FaqItem[] = useMemo(
    () => [
      {
        title: t`What are GMX Points?`,
        content: (
          <Trans>
            GMX Points are loyalty rewards earned by trading on GMX. Points are pegged 1:1 to GMX price and are earned
            weekly based on your trading fees and multiplier. Points automatically discount up to 50% of your open/close
            trading fees.
          </Trans>
        ),
      },
      {
        title: t`How do I earn points?`,
        content: (
          <Trans>
            Points are earned each epoch (weekly) based on the open/close trading fees you pay, adjusted by your total
            multiplier. Your multiplier is the sum of your Volume Tier, Staking Tier, and any Activity Boosts, capped at
            4.0x.
          </Trans>
        ),
      },
      {
        title: t`Do points expire?`,
        content: (
          <Trans>
            Yes, points expire after 13 epochs (approximately 13 weeks). The oldest points are consumed first when
            applied to fee discounts (FIFO).
          </Trans>
        ),
      },
      {
        title: t`How do multipliers work?`,
        content: (
          <Trans>
            Your total multiplier is the sum of three components: Volume Tier (based on weekly trading volume), Staking
            Tier (based on staked GMX), and Activity Boosts (from specific trading behaviors). The maximum multiplier is
            4.0x.
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
    []
  );

  return <Faq items={items} title={<Trans>FAQ</Trans>} />;
}
