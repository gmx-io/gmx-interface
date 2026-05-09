import { USD_DECIMALS } from "config/factors";
import { bigintToNumber } from "lib/numbers";

import { userAnalytics } from "./UserAnalytics";

type PointsPromoBannerVariant = "new-or-low-fees" | "manual-reward" | "recent-activity";
type PointsPromoBannerCta = "LearnMore" | "StakeGMX";

type PointsActionEvent = {
  event: "PointsAction";
  data:
    | {
        action: "PromoBannerShown";
        variant: PointsPromoBannerVariant;
      }
    | {
        action: "PromoBannerClicked";
        variant: PointsPromoBannerVariant;
        cta: PointsPromoBannerCta;
      }
    | {
        action: "PromoBannerDismissed";
        variant: PointsPromoBannerVariant;
      }
    | {
        action: "ManualAllocationModalShown";
        manualAllocatedPoints?: number;
        manualBonusUsd?: number;
      }
    | {
        action: "ManualAllocationModalClosed";
      }
    | {
        action: "ManualAllocationModalStartTradingClicked";
      }
    | {
        action: "ManualAllocationModalReferralClicked";
      }
    | {
        action: "TradeBoxPointsEstimateClicked";
        marketAddress?: string;
        marketName?: string;
        hasEstimatedRewards: boolean;
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

export function sendPointsPromoBannerShownEvent({ variant }: { variant: PointsPromoBannerVariant }) {
  userAnalytics.pushEvent<PointsActionEvent>(
    {
      event: "PointsAction",
      data: {
        action: "PromoBannerShown",
        variant,
      },
    },
    { dedupKey: `points-promo-banner-shown-${variant}` }
  );
}

export function sendPointsPromoBannerClickedEvent({
  variant,
  cta,
}: {
  variant: PointsPromoBannerVariant;
  cta: PointsPromoBannerCta;
}) {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "PromoBannerClicked",
      variant,
      cta,
    },
  });
}

export function sendPointsPromoBannerDismissedEvent({ variant }: { variant: PointsPromoBannerVariant }) {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "PromoBannerDismissed",
      variant,
    },
  });
}

export function sendManualAllocationModalShownEvent({
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
        action: "ManualAllocationModalShown",
        manualAllocatedPoints: pointsToNumber(manualAllocatedPoints),
        manualBonusUsd: usdToNumber(manualBonusUsd),
      },
    },
    { dedupKey: "manual-allocation-modal-shown" }
  );
}

export function sendManualAllocationModalClosedEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualAllocationModalClosed",
    },
  });
}

export function sendManualAllocationModalStartTradingClickedEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualAllocationModalStartTradingClicked",
    },
  });
}

export function sendManualAllocationModalReferralClickedEvent() {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "ManualAllocationModalReferralClicked",
    },
  });
}

export function sendTradeBoxPointsEstimateClickedEvent({
  marketAddress,
  marketName,
  hasEstimatedRewards,
  rewardsUsd,
  downgradingCoefficient,
}: {
  marketAddress: string | undefined;
  marketName: string | undefined;
  hasEstimatedRewards: boolean;
  rewardsUsd: bigint | undefined;
  downgradingCoefficient: bigint | undefined;
}) {
  userAnalytics.pushEvent<PointsActionEvent>({
    event: "PointsAction",
    data: {
      action: "TradeBoxPointsEstimateClicked",
      marketAddress,
      marketName,
      hasEstimatedRewards,
      rewardsUsd: usdToNumber(rewardsUsd),
      downgradingCoefficient: coefficientToNumber(downgradingCoefficient),
    },
  });
}
