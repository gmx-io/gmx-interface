import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";

import type { PersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { formatUsd } from "lib/numbers";

function formatRewardsUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export type PersonalizedBannerCopy = {
  title: ReactNode;
  body: ReactNode;
};

/**
 * Title + body copy for the three personalized banner variants. Shared between the Tradebox
 * banner and the Points page Staking tier card banner so the spec's "{Same as Tradebox banner}"
 * directive stays enforced from a single source of truth.
 */
export function getPersonalizedBannerCopy(bannerData: PersonalizedBannerData): PersonalizedBannerCopy {
  if (bannerData.bannerVariant === "manual-reward" && bannerData.manualBonusUsd !== undefined) {
    const bonusFormatted = formatUsd(bannerData.manualBonusUsd, { displayDecimals: 0 });
    return {
      title: (
        <Trans>
          You've received bonus of <span className="whitespace-nowrap">{bonusFormatted}</span>
        </Trans>
      ),
      body: <Trans>Start trading to redeem your rewards.</Trans>,
    };
  }

  if (bannerData.bannerVariant === "recent-activity" && bannerData.estimatedRewardsUsd !== undefined) {
    const rewardsFormatted = formatRewardsUsd(bannerData.estimatedRewardsUsd);
    return {
      title: <Trans>Earn rewards</Trans>,
      body: (
        <Trans>
          With your recent activity, staking <span className="font-medium text-typography-primary">GMX</span> could have
          earned you up to <span className="font-medium text-typography-primary">{rewardsFormatted} in rewards</span>.
        </Trans>
      ),
    };
  }

  return {
    title: <Trans>Earn rewards</Trans>,
    body: <Trans>Stake GMX and receive up to 50% of your fees back.</Trans>,
  };
}
