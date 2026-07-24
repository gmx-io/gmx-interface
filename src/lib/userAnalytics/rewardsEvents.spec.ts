import { beforeEach, describe, expect, it, vi } from "vitest";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { PRECISION } from "lib/numbers";

import { sendRewardsBannerEvent, sendRewardsNavigationEvent, sendRewardsTransactionResultEvent } from "./rewardsEvents";
import { userAnalytics } from "./UserAnalytics";

vi.mock("./UserAnalytics", () => ({
  userAnalytics: {
    pushEvent: vi.fn(),
  },
}));

const mockPushEvent = vi.mocked(userAnalytics.pushEvent);

describe("rewards analytics events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes reward USD and multipliers in navigation context", () => {
    sendRewardsNavigationEvent({
      source: "FeeBlock",
      hasEstimatedRewards: true,
      rewardsUsd: 12n * PRECISION,
      multiplier: 50n,
      multiplierDecimals: 100n,
    });

    expect(mockPushEvent).toHaveBeenCalledWith({
      event: "RewardsPageAction",
      data: {
        action: "Navigation",
        source: "FeeBlock",
        hasEstimatedRewards: true,
        rewardsUsd: 12,
        multiplier: 0.5,
      },
    });
  });

  it("deduplicates banner impressions but not banner actions", () => {
    sendRewardsBannerEvent("BannerShown", "pair-boosts");
    sendRewardsBannerEvent("BannerClick", "pair-boosts");

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      1,
      {
        event: "RewardsPageAction",
        data: {
          action: "BannerShown",
          banner: "pair-boosts",
        },
      },
      { dedupKey: "rewards-banner-shown-pair-boosts" }
    );
    expect(mockPushEvent).toHaveBeenNthCalledWith(
      2,
      {
        event: "RewardsPageAction",
        data: {
          action: "BannerClick",
          banner: "pair-boosts",
        },
      },
      undefined
    );
  });

  it("normalizes token amounts for vesting transaction results", () => {
    sendRewardsTransactionResultEvent({
      transaction: "StartVesting",
      result: "Success",
      amount: 25n * 10n ** BigInt(ES_GMX_DECIMALS),
    });

    expect(mockPushEvent).toHaveBeenCalledWith({
      event: "RewardsPageAction",
      data: {
        action: "TransactionResult",
        transaction: "StartVesting",
        result: "Success",
        amount: 25,
      },
    });
  });
});
