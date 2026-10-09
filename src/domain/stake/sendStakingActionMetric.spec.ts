import { afterEach, describe, expect, it, vi } from "vitest";

import { getRewardsClaimAction, sendStakingActionMetric } from "./sendStakingActionMetric";

const mocks = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("lib/metrics", () => ({ metrics: { pushEvent: mocks.pushEvent } }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendStakingActionMetric", () => {
  it("reports a sent action", () => {
    sendStakingActionMetric({ action: "stake", tokenSymbol: "GMX", chainId: 42161 });

    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "staking.action",
      isError: false,
      data: { action: "stake", tokenSymbol: "GMX", chainId: 42161, outcome: "sent" },
    });
  });

  it("tells a rejected action from a failed one", () => {
    sendStakingActionMetric({
      action: "compound",
      tokenSymbol: undefined,
      chainId: 42161,
      error: new Error("User denied transaction signature"),
    });
    sendStakingActionMetric({ action: "unstake", tokenSymbol: "GMX", chainId: 42161, error: new Error("reverted") });

    expect(mocks.pushEvent.mock.calls.map(([event]) => event.data.outcome)).toEqual(["rejected", "failed"]);
  });
});

describe("getRewardsClaimAction", () => {
  it("is a compound only when a staked reward has something to stake", () => {
    expect(
      getRewardsClaimAction({
        shouldStakeGmx: true,
        totalGmxRewards: 0n,
        shouldStakeEsGmx: true,
        totalEsGmxRewards: 0n,
      })
    ).toBe("claim");
    expect(
      getRewardsClaimAction({
        shouldStakeGmx: false,
        totalGmxRewards: 10n,
        shouldStakeEsGmx: true,
        totalEsGmxRewards: 5n,
      })
    ).toBe("compound");
    expect(
      getRewardsClaimAction({
        shouldStakeGmx: false,
        totalGmxRewards: 10n,
        shouldStakeEsGmx: false,
        totalEsGmxRewards: 5n,
      })
    ).toBe("claim");
  });
});
