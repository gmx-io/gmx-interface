import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { callContract } from "lib/contracts";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { RewardsVestingFlow } from "../RewardsVestingFlow";

vi.mock("domain/vesting/useRewardsVestingData", () => ({
  useRewardsVestingData: vi.fn(),
}));

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();

  return {
    ...actual,
    ethers: { ...actual.ethers, Contract: vi.fn(() => ({})) },
  };
});

vi.mock("lib/contracts", () => ({
  callContract: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));

vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));

vi.mock("lib/useHasOutdatedUi", () => ({
  useHasOutdatedUi: () => false,
}));

vi.mock("lib/useCurrentUnixTimestamp", () => ({
  useCurrentUnixTimestamp: () => 1_700_000_000,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161 }),
}));

vi.mock("../RewardsVestingModals", () => ({
  RewardsVestingModal: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="vesting-modal" /> : null,
  RewardsStopVestingModal: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="stop-vesting-modal" /> : null,
}));

const TOKEN_UNIT = expandDecimals(1, 18);
const mockUseRewardsVestingData = vi.mocked(useRewardsVestingData);
const mockUseWallet = vi.mocked(useWallet);
const mockCallContract = vi.mocked(callContract);
const mutate = vi.fn(async () => undefined);

const idleData: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 0n,
  stakedGmxBalance: 0n,
  freePairAmount: 0n,
  vestingInfo: {
    pairAmount: 0n,
    vestedAmount: 0n,
    escrowedBalance: 0n,
    claimedAmounts: 0n,
    claimable: 0n,
    maxVestableAmount: 0n,
    averageStakedAmount: 0n,
  },
  vestingDuration: 365n * 24n * 60n * 60n,
  gmxPrice: 80n * 10n ** 30n,
};

i18n.load({ en: {} });
i18n.activate("en");

function renderFlow() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsVestingFlow />
      </MemoryRouter>
    </I18nProvider>
  );
}

function setVestingData(data?: RewardsVestingData, options?: { loading?: boolean; error?: Error }) {
  mockUseRewardsVestingData.mockReturnValue({
    data,
    isLoading: options?.loading ?? false,
    error: options?.error,
    mutate,
  });
}

describe("RewardsVestingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallContract.mockReset();
    mutate.mockReset();
    mutate.mockResolvedValue(undefined);
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    setVestingData(idleData);
  });

  afterEach(cleanup);

  it("renders the idle state from an empty on-chain snapshot", () => {
    renderFlow();

    expect(screen.getByText("Available esGMX")).toBeDefined();
    expect(screen.getByText("Vesting esGMX")).toBeDefined();
    expect(screen.getByText("Rewards")).toBeDefined();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText((text) => text.replace(/\s/g, "") === "=$0.00")).toHaveLength(3);
    expect(screen.getByText("Earn esGMX rewards from eligible trading activity.")).toBeDefined();
    expect(screen.getByText(/No esGMX is currently vesting/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Nothing to vest" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Nothing to claim" }).hasAttribute("disabled")).toBe(true);
  });

  it("renders the designed start-vesting guidance when esGMX is available", () => {
    setVestingData({
      ...idleData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      freePairAmount: 100n * TOKEN_UNIT,
      vestingInfo: {
        ...idleData.vestingInfo,
        maxVestableAmount: 100n * TOKEN_UNIT,
        averageStakedAmount: 100n * TOKEN_UNIT,
      },
    });
    renderFlow();

    expect(screen.getByText("Vesting turns esGMX into GMX over 12 months.")).toBeDefined();
    expect(screen.getByText("Your GMX collateral stays locked until it’s done.")).toBeDefined();
    expect(screen.getByText(/Stake GMX to start vesting your esGMX/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Start vesting" })).toBeDefined();
  });

  it("renders active vesting values and opens the vest-more and stop confirmations", () => {
    setVestingData({
      ...idleData,
      walletEsGmxBalance: 42n * TOKEN_UNIT,
      walletGmxBalance: 100n * TOKEN_UNIT,
      stakedGmxBalance: 100n * TOKEN_UNIT,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 120n * TOKEN_UNIT,
        maxVestableAmount: 1_000n * TOKEN_UNIT,
        averageStakedAmount: 1_000n * TOKEN_UNIT,
      },
    });
    renderFlow();

    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("120")).toBeDefined();
    expect(screen.getByText("365 days left")).toBeDefined();
    expect(screen.getAllByText("100", { selector: "span.text-typography-primary" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Vest more" }));
    expect(screen.getByTestId("vesting-modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Stop vesting" }));
    expect(screen.getByTestId("stop-vesting-modal")).toBeDefined();
  });

  it("shows claimable rewards and account balances", () => {
    setVestingData({
      ...idleData,
      walletGmxBalance: 100n * TOKEN_UNIT,
      stakedGmxBalance: 250n * TOKEN_UNIT,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 24_660_000_000_000_000_000n,
      },
    });
    renderFlow();

    expect(screen.getByText("24.66")).toBeDefined();
    expect(screen.getByRole("button", { name: "Claim 24.66 GMX" })).toBeDefined();
    expect(screen.getByText("250")).toBeDefined();
  });

  it("claims GMX through the Vester and refreshes the account snapshot", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    setVestingData({
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    });
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("claim");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("renders the completed state", () => {
    setVestingData({
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    });
    renderFlow();

    expect(screen.getByText("Complete")).toBeDefined();
    expect(screen.getByRole("button", { name: "Vesting completed" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Stop vesting" })).toBeNull();
  });

  it("allows a completed vest to unlock its remaining collateral", () => {
    setVestingData({
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    });
    renderFlow();

    expect(screen.getByRole("button", { name: "Unlock collateral" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Vesting completed" })).toBeNull();
  });

  it("withdraws a completed vest to unlock collateral", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    setVestingData({
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    });
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("withdraw");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("uses design-consistent skeletons while the account snapshot loads", () => {
    setVestingData(undefined, { loading: true });
    renderFlow();

    expect(document.querySelectorAll(".react-loading-skeleton").length).toBeGreaterThan(3);
    expect(screen.queryByText("Nothing to vest")).toBeNull();
  });

  it("shows a stable unavailable state without presenting zero balances as real data", () => {
    setVestingData(undefined, { loading: true, error: new Error("RPC unavailable") });
    renderFlow();

    expect(screen.getAllByText("Vesting data is temporarily unavailable.")).toHaveLength(3);
    expect(screen.getAllByText("-")).toHaveLength(3);
    expect(screen.getAllByText("= -")).toHaveLength(3);
  });

  it("treats a missing parsed snapshot as unavailable even without an RPC error", () => {
    setVestingData(undefined);
    renderFlow();

    expect(screen.getAllByText("Vesting data is temporarily unavailable.")).toHaveLength(3);
    expect(screen.getAllByText("-")).toHaveLength(3);
  });

  it("does not present disconnected account balances as zero", () => {
    mockUseWallet.mockReturnValue({ active: false } as ReturnType<typeof useWallet>);
    setVestingData(undefined);
    renderFlow();

    expect(screen.getAllByText("Connect wallet to view vesting rewards.")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeDefined();
    expect(screen.getAllByText("-")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Nothing to vest" })).toBeNull();
  });

  it("preserves responsive stacking and equal-height panels", () => {
    renderFlow();

    const flow = screen.getByTestId("rewards-vesting-flow");
    expect(flow.className.split(/\s+/)).toContain("max-lg:grid-rows-[1fr_40px_1fr_40px_1fr]");

    const cards = flow.querySelectorAll("section");
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      const panelClassNames = card.lastElementChild?.className.split(/\s+/) ?? [];
      expect(panelClassNames).toContain("min-h-[132px]");
      expect(panelClassNames).toContain("grow");
      expect(panelClassNames).not.toContain("h-[132px]");
    });
  });
});
