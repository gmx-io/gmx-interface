import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PRECISION } from "lib/numbers";

import {
  getIsActiveRewardsUser,
  getRewardsPromoSelection,
  type RewardsPromoVariant,
  type StableRewardsPromoSelection,
  useStableRewardsPromoSelection,
} from "../rewardsPromo";
import type { AccountIncentiveStatus, IncentivesConfig } from "../types";

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const OTHER_ACCOUNT = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";
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
});

type StableSelectionProps = Parameters<typeof useStableRewardsPromoSelection>[0];

const connectedProps: StableSelectionProps = {
  chainId: 42161,
  account: ACCOUNT,
  walletStatus: "connected",
  isWalletInitializing: false,
  enabled: true,
  config,
  statusLoading: false,
  activityLoading: false,
};
const manualStatus = { ...emptyStatus, manualRewardRemainingUsd: 500n * PRECISION };
const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + 1 };
const restoringWallet = { account: undefined, walletStatus: "disconnected" };

describe("useStableRewardsPromoSelection", () => {
  it.each<{ name: string; steps: [Partial<StableSelectionProps>, RewardsPromoVariant | undefined][] }>([
    {
      name: "hides cached personalization across an epoch rollover until current status arrives",
      steps: [
        [{ status: manualStatus }, "manual-reward"],
        [{ status: manualStatus, config: nextConfig }, undefined],
        [
          { status: { ...emptyStatus, epochTimestamp: nextConfig.epochTimestamp }, config: nextConfig },
          "new-or-low-fees",
        ],
      ],
    },
    {
      name: "stays hidden while account status is loading or incentives are inactive",
      steps: [
        [{ statusLoading: true }, undefined],
        [{ status: emptyStatus, enabled: false, config: undefined }, undefined],
      ],
    },
    {
      name: "retains resolved personalization during same-account revalidation",
      steps: [
        [{ status: manualStatus }, "manual-reward"],
        [{ statusLoading: true }, "manual-reward"],
      ],
    },
    {
      name: "hides during reconnect and never reuses another account's personalization",
      steps: [
        [{ status: manualStatus }, "manual-reward"],
        [{ account: undefined, walletStatus: "reconnecting", statusLoading: true }, undefined],
        [{ account: OTHER_ACCOUNT, statusLoading: true }, undefined],
        [{ account: OTHER_ACCOUNT, status: manualStatus }, undefined],
        [{ account: OTHER_ACCOUNT, status: { ...emptyStatus, account: OTHER_ACCOUNT } }, "new-or-low-fees"],
      ],
    },
    {
      name: "stays hidden throughout a slow wallet restoration",
      steps: [
        [{ ...restoringWallet, isWalletInitializing: true }, undefined],
        [restoringWallet, "new-or-low-fees"],
      ],
    },
    {
      name: "waits for wallet restoration when incentives activate after the config loads",
      steps: [
        [{ ...restoringWallet, isWalletInitializing: true, enabled: false, config: undefined }, undefined],
        [{ ...restoringWallet, isWalletInitializing: true }, undefined],
        [restoringWallet, "new-or-low-fees"],
      ],
    },
  ])("$name", ({ steps }) => {
    let latest: StableRewardsPromoSelection | undefined;
    function Probe(props: StableSelectionProps) {
      latest = useStableRewardsPromoSelection(props);
      return null;
    }

    const view = render(React.createElement(Probe, { ...connectedProps, ...steps[0][0] }));
    steps.forEach(([props, expectedVariant], index) => {
      if (index > 0) view.rerender(React.createElement(Probe, { ...connectedProps, ...props }));
      expect(latest?.selection?.variant).toBe(expectedVariant);
    });
    view.unmount();
  });
});
