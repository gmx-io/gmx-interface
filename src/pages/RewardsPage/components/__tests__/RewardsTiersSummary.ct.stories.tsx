import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

import { RewardsTiersSummary } from "../RewardsTiersSummary";

const testI18n = setupI18n({
  locale: "en",
  messages: {
    en: {
      Q45YHp: "Current multiplier",
      fBBWWY: "Your multiplier will decrease next epoch.",
      IHV8kS: "Due to changes in your volume and staking tiers.",
      pp4eJG:
        "Your reward multiplier combines your volume tier, staking tier, and applicable activity boosts. The total multiplier is capped at {0}.",
      "z+UEPR": "Your multiplier will increase next epoch.",
    },
  },
});

export function RewardsTiersSummaryStory({
  currentMultiplier = 175n,
  projectedMultiplier,
  statusState = "ready",
}: {
  currentMultiplier?: bigint;
  projectedMultiplier?: bigint;
  statusState?: React.ComponentProps<typeof RewardsTiersSummary>["statusState"];
}) {
  return (
    <I18nProvider i18n={testI18n}>
      <RewardsTiersSummary
        currentMultiplier={currentMultiplier}
        projectedMultiplier={projectedMultiplier}
        maxMultiplier={500n}
        multiplierDecimals={100n}
        statusState={statusState}
      />
    </I18nProvider>
  );
}
