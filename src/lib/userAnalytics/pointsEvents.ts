import { USD_DECIMALS } from "config/factors";
import { bigintToNumber } from "lib/numbers";

import { userAnalytics } from "./UserAnalytics";

type PointsPageTab = "dashboard" | "history" | "leaderboard";
type PointsPageNavigationSource = "TradePageBanner" | "Menu" | "GMXAccountModal" | "FeeBlock";

type PointsPageViewEvent = {
  event: "PointsPageViews";
  data: {
    tab: PointsPageTab;
  };
};

type PointsPageActionEvent = {
  event: "PointsPageAction";
  data: {
    action:
      | "StakeRewardsClick"
      | "ClaimRewardsSuccess"
      | "ClaimRewardsFail"
      | "StakeRewardsSuccess"
      | "StakeRewardsFail";
  };
};

type PointsActionEvent = {
  event: "PointsAction";
  data:
    | {
        action: "ManualDistributionDialogShown";
        manualAllocatedPoints?: number;
        manualBonusUsd?: number;
      }
    | {
        action:
          | "ManualDistributionDialogShareClick"
          | "ManualDistributionDialogTradeClick"
          | "ManualDistributionDialogLearnMoreClick";
      }
    | {
        action: "PointsPageNavigation";
        source: PointsPageNavigationSource;
        marketAddress?: string;
        marketName?: string;
        hasEstimatedRewards?: boolean;
        rewardsUsd?: number;
        downgradingCoefficient?: number;
      };
};

function pointsToNumber(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToNumber(value, 18);
}

function usdToNumber(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToNumber(value, USD_DECIMALS);
}

function coefficientToNumber(value: bigint | undefined) {
  return value === undefined ? undefined : Number(value) / 100;
}

export function sendPointsPageViewEvent(tab: PointsPageTab) {
  userAnalytics.pushEvent<PointsPageViewEvent>({
    event: "PointsPageViews",
    data: {
      tab,
    },
  });
}

function sendPointsPageActionEvent(action: PointsPageActionEvent["data"]["action"]) {
  userAnalytics.pushEvent<PointsPageActionEvent>({
    event: "PointsPageAction",
    data: {
      action,
    },
  });
}

export function sendStakeRewardsClickEvent() {
  sendPointsPageActionEvent("StakeRewardsClick");
}

export function sendClaimRewardsResultEvent(success: boolean) {
  sendPointsPageActionEvent(success ? "ClaimRewardsSuccess" : "ClaimRewardsFail");
}

export function sendStakeRewardsResultEvent(success: boolean) {
  sendPointsPageActionEvent(success ? "StakeRewardsSuccess" : "StakeRewardsFail");
}

export function sendManualDistributionDialogShownEvent({
  manualAllocatedPoints,
  manualBonusUsd,
}: {
  manualAllocatedPoints: bigint | undefined;
  manualBonusUsd: bigint | undefined;
}) {
  userAnalytics.pushEvent<PointsActionEvent>(
    {
      event: "PointsAction",
      data: {
        action: "ManualDistributionDialogShown",
        manualAllocatedPoints: pointsToNumber(manualAllocatedPoints),
        manualBonusUsd: usdToNumber(manualBonusUsd),
      },
    },
    { dedupKey: "manual-distribution-dialog-shown" }
  );
}

export function sendManualDistributionDialogShareClickEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualDistributionDialogShareClick",
    },
  });
}

export function sendManualDistributionDialogTradeClickEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualDistributionDialogTradeClick",
    },
  });
}

export function sendManualDistributionDialogLearnMoreClickEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualDistributionDialogLearnMoreClick",
    },
  });
}

export function sendPointsPageNavigationEvent({
  source,
  marketAddress,
  marketName,
  hasEstimatedRewards,
  rewardsUsd,
  downgradingCoefficient,
}: {
  source: PointsPageNavigationSource;
  marketAddress?: string;
  marketName?: string;
  hasEstimatedRewards?: boolean;
  rewardsUsd?: bigint;
  downgradingCoefficient?: bigint;
}) {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "PointsPageNavigation",
      source,
      ...(marketAddress !== undefined ? { marketAddress } : {}),
      ...(marketName !== undefined ? { marketName } : {}),
      ...(hasEstimatedRewards !== undefined ? { hasEstimatedRewards } : {}),
      ...(rewardsUsd !== undefined ? { rewardsUsd: usdToNumber(rewardsUsd) } : {}),
      ...(downgradingCoefficient !== undefined
        ? { downgradingCoefficient: coefficientToNumber(downgradingCoefficient) }
        : {}),
    },
  });
}
