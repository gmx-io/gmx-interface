import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  formatFactorPercentage,
  formatMultiplier,
  getMaxRewardRateFactor,
} from "domain/synthetics/incentives/v2/utils";

import { Faq, type FaqItem } from "components/Faq/Faq";

export function RewardsTiersFaq({ config }: { config: IncentivesConfig }) {
  const items: FaqItem[] = useMemo(
    () => [
      {
        title: t`How are rewards calculated?`,
        content: (
          <div>
            <Trans>
              Eligible fees receive the configured reward share. Applicable persistent and trade-specific multiplier
              adjustments are added together, then capped at the configured maximum.
            </Trans>
            <div className="mt-10 grid grid-cols-[minmax(0,1fr)_auto] gap-x-16 gap-y-6 text-13">
              <span className="text-typography-secondary">
                <Trans>Eligible fee share</Trans>
              </span>
              <span>{formatFactorPercentage(config.feeShareFactor)}</span>
              <span className="text-typography-secondary">
                <Trans>esGMX allocation share</Trans>
              </span>
              <span>{formatFactorPercentage(config.esGmxShareFactor)}</span>
              <span className="text-typography-secondary">
                <Trans>GT allocation share</Trans>
              </span>
              <span>{formatFactorPercentage(config.gtShareFactor)}</span>
              <span className="text-typography-secondary">
                <Trans>Maximum multiplier</Trans>
              </span>
              <span>{formatMultiplier(config.maxMultiplier, config.multiplierDecimals)}</span>
              <span className="text-typography-secondary">
                <Trans>Maximum combined reward per eligible fee</Trans>
              </span>
              <span>{formatFactorPercentage(getMaxRewardRateFactor(config))}</span>
            </div>
          </div>
        ),
      },
      {
        title: t`How do multipliers work?`,
        content: (
          <Trans>
            Your reward multiplier combines your Volume Tier, Staking Tier, and applicable Activity Boosts. The total
            multiplier is capped at {formatMultiplier(config.maxMultiplier, config.multiplierDecimals)}.
          </Trans>
        ),
      },
      {
        title: t`How long does a volume tier remain active?`,
        content: (
          <Trans>
            A tier applies in the epoch it is achieved and for {config.volumeTierPersistenceEpochs} following epochs.
          </Trans>
        ),
      },
      {
        title: t`How do activity boosts work?`,
        content: (
          <Trans>
            Trade-specific boosts apply only to qualifying trades. Lifetime Volume is permanent once earned, while a
            manual allocation remains available until its incremental reward cap is consumed.
          </Trans>
        ),
      },
      {
        title: t`Are referral rewards part of my multiplier?`,
        content: (
          <Trans>
            No. Referral rewards are an additional configured share of referred traders’ final rewards and do not
            contribute to trading-volume tiers.
          </Trans>
        ),
      },
    ],
    [config]
  );

  return <Faq items={items} title={<Trans>FAQ</Trans>} />;
}
