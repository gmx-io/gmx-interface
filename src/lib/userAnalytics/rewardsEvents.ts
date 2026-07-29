import { USD_DECIMALS } from "config/factors";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { bigintToNumber } from "lib/numbers";

import { userAnalytics } from "./UserAnalytics";

export type RewardsAnalyticsTab = "tiers" | "rewards" | "leaderboard";

export type RewardsNavigationSource =
  | "TradePageBanner"
  | "Menu"
  | "GMXAccountModal"
  | "FeeBlock"
  | "TiersSummary"
  | "PromoBanner"
  | "FeaturedMarket"
  | "ManualAllocationDialog";

export type RewardsAnalyticsBanner =
  | "manual-reward"
  | "gmx-ready-to-stake"
  | "esgmx-ready-to-stake"
  | "referral"
  | "next-volume-tier"
  | "pair-boosts"
  | "restake-rewards"
  | "trade-manual-reward"
  | "trade-recent-activity"
  | "trade-rewards-program";

export type RewardsTransaction =
  | "ApproveGmx"
  | "StakeCollateral"
  | "StartVesting"
  | "ClaimVestedGmx"
  | "StopVesting"
  | "UnlockCollateral";

export type RewardsTransactionResult = "Success" | "Fail" | "PartialSuccess";

type RewardsPageViewEvent = {
  event: "RewardsPageViews";
  data: {
    tab: RewardsAnalyticsTab;
  };
};

type RewardsPageActionEvent = {
  event: "RewardsPageAction";
  data:
    | {
        action: "Navigation";
        source: RewardsNavigationSource;
        marketAddress?: string;
        marketName?: string;
        hasEstimatedRewards?: boolean;
        rewardsUsd?: number;
        multiplier?: number;
      }
    | {
        action: "BannerShown" | "BannerClick" | "BannerDismiss";
        banner: RewardsAnalyticsBanner;
      }
    | {
        action: "ManualAllocationDialogShown";
        rewardCapUsd?: number;
        rewardConsumedUsd?: number;
        rewardRemainingUsd?: number;
      }
    | {
        action: "ManualAllocationDialogAction";
        dialogAction: "Share" | "Trade" | "LearnMore";
      }
    | {
        action: "VestingModalOpen";
        mode: "Start" | "Stop";
      }
    | {
        action: "TransactionResult";
        transaction: RewardsTransaction;
        result: RewardsTransactionResult;
        amount?: number;
      }
    | {
        action: "LeaderboardShareClick";
        period: "current" | "previous" | "all";
      };
};

function usdToNumber(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToNumber(value, USD_DECIMALS);
}

function tokenToNumber(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToNumber(value, ES_GMX_DECIMALS);
}

export function sendRewardsPageViewEvent(tab: RewardsAnalyticsTab) {
  userAnalytics.pushEvent<RewardsPageViewEvent>({
    event: "RewardsPageViews",
    data: { tab },
  });
}

export function sendRewardsNavigationEvent({
  source,
  marketAddress,
  marketName,
  hasEstimatedRewards,
  rewardsUsd,
  multiplier,
  multiplierDecimals,
}: {
  source: RewardsNavigationSource;
  marketAddress?: string;
  marketName?: string;
  hasEstimatedRewards?: boolean;
  rewardsUsd?: bigint;
  multiplier?: bigint;
  multiplierDecimals?: bigint;
}) {
  const normalizedMultiplier =
    multiplier !== undefined && multiplierDecimals !== undefined && multiplierDecimals > 0n
      ? Number(multiplier) / Number(multiplierDecimals)
      : undefined;

  userAnalytics.pushEvent<RewardsPageActionEvent>({
    event: "RewardsPageAction",
    data: {
      action: "Navigation",
      source,
      ...(marketAddress !== undefined ? { marketAddress } : {}),
      ...(marketName !== undefined ? { marketName } : {}),
      ...(hasEstimatedRewards !== undefined ? { hasEstimatedRewards } : {}),
      ...(rewardsUsd !== undefined ? { rewardsUsd: usdToNumber(rewardsUsd) } : {}),
      ...(normalizedMultiplier !== undefined ? { multiplier: normalizedMultiplier } : {}),
    },
  });
}

export function sendRewardsBannerEvent(
  action: "BannerShown" | "BannerClick" | "BannerDismiss",
  banner: RewardsAnalyticsBanner,
  dedupScope?: string
) {
  userAnalytics.pushEvent<RewardsPageActionEvent>(
    {
      event: "RewardsPageAction",
      data: { action, banner },
    },
    action === "BannerShown"
      ? { dedupKey: `rewards-banner-shown-${banner}${dedupScope ? `-${dedupScope}` : ""}` }
      : undefined
  );
}

export function sendRewardsManualAllocationDialogShownEvent({
  rewardCapUsd,
  rewardConsumedUsd,
  rewardRemainingUsd,
}: {
  rewardCapUsd?: bigint;
  rewardConsumedUsd?: bigint;
  rewardRemainingUsd?: bigint;
}) {
  userAnalytics.pushEvent<RewardsPageActionEvent>(
    {
      event: "RewardsPageAction",
      data: {
        action: "ManualAllocationDialogShown",
        rewardCapUsd: usdToNumber(rewardCapUsd),
        rewardConsumedUsd: usdToNumber(rewardConsumedUsd),
        rewardRemainingUsd: usdToNumber(rewardRemainingUsd),
      },
    },
    { dedupKey: "rewards-manual-allocation-dialog-shown" }
  );
}

export function sendRewardsManualAllocationDialogActionEvent(dialogAction: "Share" | "Trade" | "LearnMore") {
  userAnalytics.pushEvent<RewardsPageActionEvent>({
    event: "RewardsPageAction",
    data: {
      action: "ManualAllocationDialogAction",
      dialogAction,
    },
  });
}

export function sendRewardsVestingModalOpenEvent(mode: "Start" | "Stop") {
  userAnalytics.pushEvent<RewardsPageActionEvent>({
    event: "RewardsPageAction",
    data: {
      action: "VestingModalOpen",
      mode,
    },
  });
}

export function sendRewardsTransactionResultEvent({
  transaction,
  result,
  amount,
}: {
  transaction: RewardsTransaction;
  result: RewardsTransactionResult;
  amount?: bigint;
}) {
  userAnalytics.pushEvent<RewardsPageActionEvent>({
    event: "RewardsPageAction",
    data: {
      action: "TransactionResult",
      transaction,
      result,
      amount: tokenToNumber(amount),
    },
  });
}

export function sendRewardsLeaderboardShareClickEvent(period: "current" | "previous" | "all") {
  userAnalytics.pushEvent<RewardsPageActionEvent>({
    event: "RewardsPageAction",
    data: {
      action: "LeaderboardShareClick",
      period,
    },
  });
}
