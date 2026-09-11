import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import {
  getIsActiveRewardsUser,
  getRewardsPromoSelection,
  getStakingRewardsPromoSelection,
  type StableRewardsPromoSelection,
  useStableRewardsPromoSelection,
} from "../rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig } from "../types";

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const SAME_ACCOUNT_DIFFERENT_CASE = "0x52908400098527886e0f7030069857d2e4169ee7";
const config = {
  epochTimestamp: 100,
  feeShareFactor: PRECISION,
  esGmxShareFactor: (PRECISION * 8n) / 10n,
  gtShareFactor: (PRECISION * 2n) / 10n,
  maxMultiplier: 120n,
  multiplierDecimals: 100n,
} as IncentivesConfig;
const emptyStatus: AccountIncentiveStatus = {
  account: ACCOUNT,
  multiplier: 0n,
  volumeTier: "Tier1",
  stakingTier: null,
  projectedVolumeTier: "Tier1",
  projectedStakingTier: null,
  epochTimestamp: config.epochTimestamp,
  tradingVolume: 0n,
  tierVolume: 0n,
  referralVolume: 0n,
  currentStakedBalance: 0n,
  boostIds: [],
  esGmxRewards: 0n,
  gtRewards: 0n,
  rewardsUsd: 0n,
  manualRewardCapUsd: 0n,
  manualRewardConsumedUsd: 0n,
  manualRewardRemainingUsd: 0n,
};

describe("rewards promo selection", () => {
  it("does not treat zero-value default tiers as active participation", () => {
    expect(getIsActiveRewardsUser(emptyStatus)).toBe(false);
    expect(getRewardsPromoSelection({ config, status: emptyStatus })).toMatchObject({
      variant: "new-or-low-fees",
      isActiveUser: false,
    });
  });

  it("keeps a manual allocation eligible without marking it as other activity", () => {
    const selection = getRewardsPromoSelection({
      config,
      status: {
        ...emptyStatus,
        boostIds: ["ManualAllocation"],
        manualRewardCapUsd: 100n * PRECISION,
        manualRewardRemainingUsd: 100n * PRECISION,
      },
    });

    expect(selection).toMatchObject({
      variant: "manual-reward",
      isActiveUser: false,
      manualRewardRemainingUsd: 100n * PRECISION,
    });
    expect(getStakingRewardsPromoSelection(selection).variant).toBe("new-or-low-fees");
  });

  it("selects recent-activity copy only for established activity over the threshold", () => {
    const nowSeconds = 2_000_000;
    const selection = getRewardsPromoSelection({
      config,
      status: emptyStatus,
      activity: {
        netPositionFeeUsd: 100n * PRECISION,
        firstTradeTimestamp: nowSeconds - 15 * 24 * 60 * 60,
      },
      nowSeconds,
    });

    expect(selection).toMatchObject({
      variant: "recent-activity",
      estimatedRewardsUsd: 120n * PRECISION,
    });
  });

  it("ignores manual allocation data from another epoch", () => {
    expect(
      getRewardsPromoSelection({
        config,
        status: {
          ...emptyStatus,
          epochTimestamp: config.epochTimestamp - 1,
          manualRewardRemainingUsd: 100n * PRECISION,
        },
      }).variant
    ).toBe("new-or-low-fees");
  });

  it("accepts status for the same account when checksum casing differs", () => {
    let latestSelection: StableRewardsPromoSelection | undefined;
    const status = {
      ...emptyStatus,
      boostIds: ["ManualAllocation"],
      manualRewardRemainingUsd: 100n * PRECISION,
    } satisfies AccountIncentiveStatus;

    function Harness() {
      latestSelection = useStableRewardsPromoSelection({
        chainId: 42161,
        account: SAME_ACCOUNT_DIFFERENT_CASE,
        walletStatus: "connected",
        isWalletInitializing: false,
        enabled: true,
        config,
        status,
        statusLoading: false,
        activityLoading: false,
      });

      return null;
    }

    const view = render(React.createElement(Harness));

    expect(latestSelection?.isLoading).toBe(false);
    expect(latestSelection?.selection?.variant).toBe("manual-reward");
    view.unmount();
  });
});
