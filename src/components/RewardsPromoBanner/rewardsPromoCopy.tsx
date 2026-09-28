import { t, Trans } from "@lingui/macro";
import type { ReactNode } from "react";

import type { RewardsPromoSelection } from "domain/synthetics/incentives/v2/rewardsPromo";
import { formatFactorPercentage, formatRewardUsd } from "domain/synthetics/incentives/v2/utils";

export type RewardsPromoCopy = {
  title: ReactNode;
  body: ReactNode;
};

export function getRewardsPromoCopy(selection: RewardsPromoSelection): RewardsPromoCopy {
  if (selection.variant === "manual-reward" && selection.manualRewardRemainingUsd !== undefined) {
    const bonus = formatRewardUsd(selection.manualRewardRemainingUsd);

    return {
      title: t`You've received bonus of ${bonus}`,
      body: <Trans>Start trading to redeem your rewards.</Trans>,
    };
  }

  if (selection.variant === "recent-activity" && selection.estimatedRewardsUsd !== undefined) {
    const estimatedRewards = formatRewardUsd(selection.estimatedRewardsUsd);

    return {
      title: <Trans>Earn rewards</Trans>,
      body: (
        <Trans>With your recent activity, staking GMX could have earned you up to {estimatedRewards} in rewards.</Trans>
      ),
    };
  }

  const maxRewardRate = formatFactorPercentage(selection.maxRewardRateFactor);

  return {
    title: <Trans>Earn rewards</Trans>,
    body: <Trans>Stake GMX and receive up to {maxRewardRate} of your fees back.</Trans>,
  };
}
