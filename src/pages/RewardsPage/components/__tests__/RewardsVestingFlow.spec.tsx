import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { expandDecimals } from "lib/numbers";
import { sendRewardsTransactionResultEvent, sendRewardsVestingModalOpenEvent } from "lib/userAnalytics/rewardsEvents";
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

vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({
  useMultipleWalletExtensionsChainError: vi.fn(),
}));

vi.mock("lib/helperToast", () => ({
  helperToast: {
    error: vi.fn(),
    info: vi.fn(),
  },
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

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: vi.fn(),
}));

vi.mock("lib/useHasOutdatedUi", () => ({
  useHasOutdatedUi: () => false,
}));

vi.mock("lib/useCurrentUnixTimestamp", () => ({
  useCurrentUnixTimestamp: () => 1_700_000_000,
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsTransactionResultEvent: vi.fn(),
  sendRewardsVestingModalOpenEvent: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161 }),
}));

vi.mock("../RewardsVestingModals", () => ({
  RewardsVestingModal: ({ isVisible, isReadOnly }: { isVisible: boolean; isReadOnly?: boolean }) =>
    isVisible ? <div data-testid="vesting-modal" data-read-only={isReadOnly} /> : null,
  RewardsStopVestingModal: ({ isVisible, isReadOnly }: { isVisible: boolean; isReadOnly?: boolean }) =>
    isVisible ? <div data-testid="stop-vesting-modal" data-read-only={isReadOnly} /> : null,
}));

const TOKEN_UNIT = expandDecimals(1, 18);
const mockUseRewardsVestingData = vi.mocked(useRewardsVestingData);
const mockUseSettings = vi.mocked(useSettings);
const mockUseWallet = vi.mocked(useWallet);
const mockUseMultipleWalletExtensionsChainError = vi.mocked(useMultipleWalletExtensionsChainError);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastError = vi.mocked(helperToast.error);
const mockHelperToastInfo = vi.mocked(helperToast.info);
const mockSendRewardsTransactionResultEvent = vi.mocked(sendRewardsTransactionResultEvent);
const mockSendRewardsVestingModalOpenEvent = vi.mocked(sendRewardsVestingModalOpenEvent);
const mutate = vi.fn(async (): Promise<RewardsVestingData | undefined> => undefined);

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

function getRouterEntries() {
  return [`${window.location.pathname}${window.location.search}`];
}

function getFlow() {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={getRouterEntries()}>
        <RewardsVestingFlow />
        <LocationSearchProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

function LocationSearchProbe() {
  const { search } = useLocation();

  return <div data-testid="location-search">{search}</div>;
}

function renderFlow() {
  return render(getFlow());
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
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    mockUseSettings.mockReturnValue({
      rewardsOneClickActionEnabled: false,
    } as ReturnType<typeof useSettings>);
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

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("renders the idle state from an empty on-chain snapshot", () => {
    renderFlow();

    expect(screen.getByText("Vestable esGMX")).toBeDefined();
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

    const primaryGuidance = screen.getByText("Vesting turns esGMX into GMX over 12 months.");
    expect(primaryGuidance).toBeDefined();
    expect(primaryGuidance.querySelector("svg")).not.toBeNull();
    expect(primaryGuidance.parentElement?.classList.contains("text-center")).toBe(true);
    expect(screen.getByText("Your GMX collateral stays locked until it’s done.")).toBeDefined();
    expect(screen.getByText(/Stake GMX to start vesting your esGMX/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Start vesting" })).toBeDefined();
  });

  it("shows the lifetime-capped vestable amount instead of the full wallet balance", () => {
    setVestingData({
      ...idleData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 90n * TOKEN_UNIT,
        maxVestableAmount: 100n * TOKEN_UNIT,
      },
    });

    renderFlow();

    expect(screen.getByText("Vestable esGMX").parentElement?.parentElement?.textContent?.replace(/\s/g, "")).toContain(
      "10esGMX"
    );
  });

  it("opens the vesting modal from the rewards summary deep link", async () => {
    window.history.replaceState({}, "", "/rewards/history?vesting=start");
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

    await waitFor(() => {
      expect(screen.getByTestId("vesting-modal")).toBeDefined();
    });
    expect(mockSendRewardsVestingModalOpenEvent).toHaveBeenCalledWith("Start");
  });

  it("shows a notice instead of opening the stepper in one-click preview mode", () => {
    mockUseSettings.mockReturnValue({
      rewardsOneClickActionEnabled: true,
    } as ReturnType<typeof useSettings>);
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

    fireEvent.click(screen.getByRole("button", { name: "Start vesting" }));

    expect(mockHelperToastInfo).toHaveBeenCalledWith(
      "One-click claim, stake, and vest is not supported yet. Turn off its preview in Settings to use the step-by-step flow."
    );
    expect(screen.queryByTestId("vesting-modal")).toBeNull();
    expect(mockSendRewardsVestingModalOpenEvent).not.toHaveBeenCalled();
  });

  it("consumes a one-click preview deep link once and preserves other query parameters", async () => {
    window.history.replaceState({}, "", "/rewards/history?source=summary&vesting=start");
    mockUseSettings.mockReturnValue({
      rewardsOneClickActionEnabled: true,
    } as ReturnType<typeof useSettings>);
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
    const view = renderFlow();

    await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("vesting-modal")).toBeNull();
    expect(mockSendRewardsVestingModalOpenEvent).not.toHaveBeenCalled();
    expect(screen.getByTestId("location-search").textContent).toBe("?source=summary");

    view.rerender(getFlow());
    expect(mockHelperToastInfo).toHaveBeenCalledTimes(1);
  });

  it("renders active vesting values and opens the add-to-vesting and stop confirmations", () => {
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
    expect(screen.queryByText("New esGMX keeps accruing while a vest is active")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add to Vesting" }));
    expect(screen.getByTestId("vesting-modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Stop vesting" }));
    expect(screen.getByTestId("stop-vesting-modal")).toBeDefined();
  });

  it("renders development vesting fixtures as read-only states", () => {
    window.history.replaceState({}, "", "/rewards/history?rewardsDebug=vesting-active");
    renderFlow();

    expect(screen.getByRole("button", { name: "Claim 50 GMX" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Add to Vesting" }));
    expect(screen.getByTestId("vesting-modal").getAttribute("data-read-only")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Stop vesting" }));
    expect(screen.getByTestId("stop-vesting-modal").getAttribute("data-read-only")).toBe("true");
    expect(mockCallContract).not.toHaveBeenCalled();
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
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    setVestingData(claimData);
    mutate.mockResolvedValue(claimData);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("claim");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("serializes claim and unlock actions without leaving either button busy", async () => {
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 95n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    setVestingData(completedData);
    mutate
      .mockImplementationOnce(
        () =>
          new Promise<RewardsVestingData>((resolve) => {
            resolveMutate = resolve;
          })
      )
      .mockResolvedValueOnce(completedData);
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    const unlockButton = screen.getByRole("button", { name: "Unlock collateral" });
    expect(unlockButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(unlockButton);
    expect(mutate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutate?.(completedData);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Claim 25 GMX" })).toBeDefined());
    expect(screen.getByRole("button", { name: "Unlock collateral" }).hasAttribute("disabled")).toBe(false);
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["claim"]);
  });

  it("does not submit a stale claim when the refreshed amount is zero", async () => {
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    setVestingData(claimData);
    mutate.mockResolvedValue({
      ...claimData,
      vestingInfo: {
        ...claimData.vestingInfo,
        claimable: 0n,
      },
    });
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(mockHelperToastInfo).toHaveBeenCalledWith("No rewards are currently available to claim.");
  });

  it("does not submit a claim when the account or chain changes during refresh", async () => {
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    setVestingData(claimData);
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: AVALANCHE,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getFlow());
    resolveMutate?.(claimData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Wallet or network changed. Review your rewards before claiming."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("does not submit a claim when wallet extensions become inconsistent during refresh", async () => {
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    setVestingData(claimData);
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseMultipleWalletExtensionsChainError.mockReturnValue({
      buttonErrorMessage: "Transaction blocked",
      buttonTooltipMessage: "Wallet extensions are on different networks.",
    });
    view.rerender(getFlow());
    resolveMutate?.(claimData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Wallet or network changed. Review your rewards before claiming."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("shows an actionable error when claimable rewards cannot be refreshed", async () => {
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        claimable: 1n,
      },
    };
    setVestingData(claimData);
    mutate.mockRejectedValueOnce(new Error("RPC unavailable"));
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: /^Claim / }));

    await waitFor(() =>
      expect(mockHelperToastError).toHaveBeenCalledWith("Unable to refresh claimable rewards. Please try again.")
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("delegates claim submission errors to callContract without showing a duplicate toast", async () => {
    const claimData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        vestedAmount: 120n * TOKEN_UNIT,
        escrowedBalance: 100n * TOKEN_UNIT,
        claimedAmounts: 20n * TOKEN_UNIT,
        claimable: 25n * TOKEN_UNIT,
      },
    };
    setVestingData(claimData);
    mutate.mockResolvedValue(claimData);
    mockCallContract.mockRejectedValueOnce(new Error("Rejected"));
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));

    await waitFor(() =>
      expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
        transaction: "ClaimVestedGmx",
        result: "Fail",
        amount: 25n * TOKEN_UNIT,
      })
    );
    expect(mockCallContract.mock.calls[0][4]).toMatchObject({ failMsg: "Claim failed" });
    expect(mockHelperToastError).not.toHaveBeenCalled();
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
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    };
    setVestingData(completedData);
    mutate.mockResolvedValue(completedData);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("withdraw");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("does not unlock collateral when a refreshed vest is active again", async () => {
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    };
    setVestingData(completedData);
    mutate.mockResolvedValue({
      ...completedData,
      vestingInfo: {
        ...completedData.vestingInfo,
        vestedAmount: 130n * TOKEN_UNIT,
        escrowedBalance: 10n * TOKEN_UNIT,
      },
    });
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Vesting details changed. Review the updated amounts before unlocking collateral."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(mockSendRewardsTransactionResultEvent).not.toHaveBeenCalled();
  });

  it("does not unlock collateral when the account changes during refresh", async () => {
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    setVestingData(completedData);
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getFlow());
    resolveMutate?.(completedData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Wallet or network changed. Review your vesting details before unlocking collateral."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("does not unlock collateral after the flow unmounts during refresh", async () => {
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    setVestingData(completedData);
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    view.unmount();
    await act(async () => {
      resolveMutate?.(completedData);
      await Promise.resolve();
    });

    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("delegates unlock submission errors to callContract without showing a duplicate toast", async () => {
    const completedData = {
      ...idleData,
      vestingInfo: {
        ...idleData.vestingInfo,
        pairAmount: 100n * TOKEN_UNIT,
        vestedAmount: 120n * TOKEN_UNIT,
        claimedAmounts: 120n * TOKEN_UNIT,
      },
    };
    setVestingData(completedData);
    mutate.mockResolvedValue(completedData);
    mockCallContract.mockRejectedValueOnce(new Error("Rejected"));
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Unlock collateral" }));

    await waitFor(() =>
      expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
        transaction: "UnlockCollateral",
        result: "Fail",
        amount: 100n * TOKEN_UNIT,
      })
    );
    expect(mockCallContract.mock.calls[0][4]).toMatchObject({ failMsg: "Unlock failed" });
    expect(mockHelperToastError).not.toHaveBeenCalled();
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
});
