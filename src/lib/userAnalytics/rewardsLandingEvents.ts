import { bigintToNumber, USD_DECIMALS } from "lib/numbers";

import { userAnalytics } from "./UserAnalytics";

export type RewardsLandingPlacement = "Header" | "MobileMenu" | "Calculator" | "MobileCalculator" | "Closing";

type ComebackParams = {
  rewards_exist: boolean;
  ref_code_exist: boolean;
  rewards: number;
};

type RewardsLandingEvent = {
  event: "RewardsPageAction";
  data:
    | { action: "RewardsPageView" }
    | { action: "StartTradingClick"; placement: RewardsLandingPlacement }
    | { action: "ComebackBlockAction"; type: "AddressEntered" | "CheckClicked" }
    | ({ action: "ComebackBlockAction"; type: "ResultRevealed" } & ComebackParams)
    | ({ action: "ComebackShareClick"; type: "X" | "CopyImage" | "CopyLink" } & ComebackParams)
    | ({ action: "ComebackCreateCodeClick" | "ComebackCreateCodeSuccesfull" } & ComebackParams);
};

export function getComebackAnalyticsParams(rewardsUsd: bigint, hasReferralCode: boolean): ComebackParams {
  return {
    rewards_exist: rewardsUsd > 0n,
    ref_code_exist: hasReferralCode,
    rewards: bigintToNumber(rewardsUsd, USD_DECIMALS),
  };
}

export function sendRewardsLandingEvent(data: RewardsLandingEvent["data"]) {
  return userAnalytics.pushEvent<RewardsLandingEvent>({ event: "RewardsPageAction", data }, { instantSend: true });
}
