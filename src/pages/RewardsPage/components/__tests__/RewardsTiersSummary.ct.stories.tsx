import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

import { RewardsTiersSummary } from "../RewardsTiersSummary";

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
    <I18nProvider i18n={i18n}>
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
