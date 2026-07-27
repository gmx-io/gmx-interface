import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { MemoryRouter } from "react-router-dom";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

import { RewardsTiersSummary } from "../RewardsTiersSummary";

const testI18n = setupI18n({
  locale: "en",
  messages: {
    en: {
      "7Y26oW": "All-time Rewards",
      c7JRfi: "All-time GT",
      HaOtg5: "Vestable esGMX",
      hkv6b4: "All-time esGMX",
      "1mtXVA": "Current Multiplier",
      klT8CC:
        "Your reward multiplier combines your Volume Tier, Staking Tier, and applicable Activity Boosts. The total multiplier is capped at {0}.",
      PmdsmT: "esGMX available to begin vesting.",
    },
  },
});

const allTimeSummary: LeaderboardEntry = {
  rank: 7,
  address: "0x52908400098527886E0F7030069857D2E4169EE7",
  tradingVolume: 0n,
  referralVolume: 0n,
  esGmxRewards: 12n * 10n ** BigInt(ES_GMX_DECIMALS),
  gtRewards: 150n * 10n ** BigInt(GT_DECIMALS),
  rewardsUsd: 500n * PRECISION,
  multiplier: null,
};

export function RewardsTiersSummaryStory({
  projectedMultiplier,
  summaryState = "ready",
}: {
  projectedMultiplier?: bigint;
  summaryState?: React.ComponentProps<typeof RewardsTiersSummary>["summaryState"];
}) {
  return (
    <I18nProvider i18n={testI18n}>
      <MemoryRouter>
        <RewardsTiersSummary
          allTimeSummary={allTimeSummary}
          currentMultiplier={175n}
          projectedMultiplier={projectedMultiplier}
          maxMultiplier={500n}
          multiplierDecimals={100n}
          statusState={summaryState}
          summaryState={summaryState}
          vestingState="unavailable"
        />
      </MemoryRouter>
    </I18nProvider>
  );
}
