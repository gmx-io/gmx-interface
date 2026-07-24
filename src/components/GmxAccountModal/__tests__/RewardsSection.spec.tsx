import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccount } from "wagmi";

import { ARBITRUM } from "config/chains";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesAvailability } from "domain/synthetics/incentives/v2/availability";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import { expandDecimals, PRECISION } from "lib/numbers";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import { RewardsSection } from "../RewardsSection";

vi.mock("wagmi", () => ({ useAccount: vi.fn() }));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("context/GmxAccountContext/hooks", () => ({ useGmxAccountModalOpen: vi.fn() }));
vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({ useIncentivesV2State: vi.fn() }));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsNavigationEvent: vi.fn(),
}));
vi.mock("img/ic_chevron_right.svg?react", () => ({ default: () => <svg /> }));
vi.mock("img/ic_multiplier_solid.svg?react", () => ({ default: () => <svg /> }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_UNIT = expandDecimals(1, ES_GMX_DECIMALS);
const CONFIG = {
  epochTimestamp: 1_000,
  multiplierDecimals: 100n,
  stakingTiers: [
    { tier: "Tier1", threshold: 100n * GMX_UNIT, multiplier: 50n },
    { tier: "Tier2", threshold: 500n * GMX_UNIT, multiplier: 100n },
    { tier: "Tier3", threshold: 1_000n * GMX_UNIT, multiplier: 150n },
  ],
} as IncentivesConfig;
const STATUS = {
  epochTimestamp: CONFIG.epochTimestamp,
  multiplier: 250n,
  rewardsUsd: 75n * PRECISION,
  stakingTier: "Tier1",
  projectedStakingTier: "Tier1",
  currentStakedBalance: 125n * GMX_UNIT,
} as AccountIncentiveStatus;
const setOpen = vi.fn();
const mockUseAccount = vi.mocked(useAccount);
const mockUseChainId = vi.mocked(useChainId);
const mockUseGmxAccountModalOpen = vi.mocked(useGmxAccountModalOpen);
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);

i18n.load({ en: {} });
i18n.activate("en");

function renderSection() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsSection />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("RewardsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ address: ACCOUNT } as ReturnType<typeof useAccount>);
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseGmxAccountModalOpen.mockReturnValue([true, setOpen]);
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: CONFIG, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({ data: STATUS, loading: false } as ReturnType<
      typeof useAccountIncentiveStatus
    >);
  });

  afterEach(cleanup);

  it("links to V2 rewards and renders the V1 active multiplier and next-tier treatment", () => {
    renderSection();

    const link = screen.getByRole("link", { name: /Your multiplier/ });
    expect(link.getAttribute("href")).toBe("/rewards");
    expect(link.textContent).toContain("2.5x");
    expect(link.textContent).toContain("Stake 375.00 GMX or esGMX more");
    expect(link.textContent).toContain("+0.5x next epoch");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: true,
    });

    fireEvent.click(link);
    expect(sendRewardsNavigationEvent).toHaveBeenCalledWith({ source: "GMXAccountModal" });
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("matches the Figma generic state while the multiplier is loading", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({ data: undefined, loading: true } as ReturnType<
      typeof useAccountIncentiveStatus
    >);

    renderSection();

    const link = screen.getByRole("link", { name: /Rewards/ });
    expect(link.textContent).toContain("Rewards");
    expect(link.textContent).toContain("View tiers and indexed rewards");
    expect(link.textContent).not.toContain("0x");
  });

  it("uses the generic state when the known multiplier is zero", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...STATUS, multiplier: 0n },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    const link = screen.getByRole("link", { name: /Rewards/ });
    expect(link.textContent).toContain("Trade or stake to unlock your rewards multiplier");
    expect(link.textContent).not.toContain("Your multiplier");
    expect(link.textContent).not.toContain("0x");
  });

  it("does not display status from another epoch", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...STATUS, epochTimestamp: CONFIG.epochTimestamp + 1 },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    const link = screen.getByRole("link", { name: /Rewards/ });
    expect(link.textContent).toContain("View tiers and indexed rewards");
    expect(link.textContent).not.toContain("2.5x");
    expect(link.textContent).not.toContain("Trade or stake");
  });

  it("shows the highest-tier state when there is no higher staking threshold", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        ...STATUS,
        stakingTier: "Tier3",
        projectedStakingTier: "Tier3",
        currentStakedBalance: 1_000n * GMX_UNIT,
      },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    expect(screen.getByRole("link", { name: /Your multiplier/ }).textContent).toContain(
      "You are already at the highest staking tier"
    );
  });

  it("uses the projected tier as the baseline for the next-epoch staking increase", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        ...STATUS,
        stakingTier: "Tier1",
        projectedStakingTier: "Tier2",
        currentStakedBalance: 600n * GMX_UNIT,
      },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    const link = screen.getByRole("link", { name: /Your multiplier/ });
    expect(link.textContent).toContain("Stake 400.00 GMX or esGMX more");
    expect(link.textContent).toContain("+0.5x next epoch");
  });

  it("treats a null projected tier as no next-epoch staking multiplier", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        ...STATUS,
        stakingTier: "Tier2",
        projectedStakingTier: null,
        currentStakedBalance: 50n * GMX_UNIT,
      },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    const link = screen.getByRole("link", { name: /Your multiplier/ });
    expect(link.textContent).toContain("Stake 50.00 GMX or esGMX more");
    expect(link.textContent).toContain("+0.5x next epoch");
  });

  it("does not round a tiny positive distance to the next tier down to zero", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: {
        ...STATUS,
        stakingTier: "Tier1",
        projectedStakingTier: null,
        currentStakedBalance: 100n * GMX_UNIT - 1n,
      },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderSection();

    const link = screen.getByRole("link", { name: /Your multiplier/ });
    expect(link.textContent).toContain("Stake < 0.01 GMX or esGMX more");
    expect(link.textContent).not.toContain("Stake 0.00");
  });

  it("does not render or request account data on unsupported chains", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "unsupported-chain" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderSection();

    expect(container.innerHTML).toBe("");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });

  it.each<[string, IncentivesAvailability]>([
    ["loading", { status: "loading" }],
    ["inactive", { status: "inactive" }],
    ["unavailable", { status: "error", error: new Error("unavailable") }],
  ])("does not render the current-epoch card while incentives are %s", (_label, availability) => {
    mockUseIncentivesV2State.mockReturnValue({
      availability,
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderSection();

    expect(container.innerHTML).toBe("");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });
});
