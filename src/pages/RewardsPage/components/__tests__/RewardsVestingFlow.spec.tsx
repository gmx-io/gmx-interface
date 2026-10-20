import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { expandDecimals } from "lib/numbers";
import { sendRewardsVestingModalOpenEvent } from "lib/userAnalytics/rewardsEvents";
import useWallet from "lib/wallets/useWallet";

import { RewardsVestingFlow } from "../RewardsVestingFlow";

vi.mock("domain/vesting/useRewardsVestingData", () => ({
  useRewardsVestingData: vi.fn(),
}));

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();

  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(function (address) {
        return { address };
      }),
    },
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

vi.mock("lib/useHasOutdatedUi", () => ({
  useHasOutdatedUi: () => false,
  getPageOutdatedError: () => "Outdated",
}));

vi.mock("lib/useCurrentUnixTimestamp", () => ({
  useCurrentUnixTimestamp: () => 1_700_000_000,
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsTransactionResultEvent: vi.fn(),
  sendRewardsVestingModalOpenEvent: vi.fn(),
  sendRewardsVestingStartedDialogActionEvent: vi.fn(),
  sendRewardsVestingStartedDialogShownEvent: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("../RewardsVestingModals", () => ({
  RewardsVestingModal: ({ isVisible, onVestingStarted }: { isVisible: boolean; onVestingStarted?: () => void }) =>
    isVisible ? (
      <div data-testid="vesting-modal">
        <button type="button" onClick={() => onVestingStarted?.()}>
          Announce started vesting
        </button>
      </div>
    ) : null,
  RewardsStopVestingModal: () => null,
}));

const TOKEN_UNIT = expandDecimals(1, 18);

const mockUseRewardsVestingData = vi.mocked(useRewardsVestingData);
const mockUseWallet = vi.mocked(useWallet);
const mockUseMultipleWalletExtensionsChainError = vi.mocked(useMultipleWalletExtensionsChainError);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastInfo = vi.mocked(helperToast.info);
const mockSendRewardsVestingModalOpenEvent = vi.mocked(sendRewardsVestingModalOpenEvent);
const mutate = vi.fn(async (): Promise<RewardsVestingData | undefined> => undefined);

const idleData: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 0n,
  claimableEsGmxRewards: 0n,
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

const startableData: RewardsVestingData = {
  ...idleData,
  claimableEsGmxRewards: 100n * TOKEN_UNIT,
  freePairAmount: 100n * TOKEN_UNIT,
  vestingInfo: {
    ...idleData.vestingInfo,
    maxVestableAmount: 100n * TOKEN_UNIT,
    averageStakedAmount: 100n * TOKEN_UNIT,
  },
};

const completedData: RewardsVestingData = {
  ...idleData,
  vestingInfo: {
    ...idleData.vestingInfo,
    pairAmount: 100n * TOKEN_UNIT,
    vestedAmount: 120n * TOKEN_UNIT,
    claimedAmounts: 120n * TOKEN_UNIT,
  },
};

function getClaimData(claimable: bigint): RewardsVestingData {
  return {
    ...idleData,
    vestingInfo: {
      ...idleData.vestingInfo,
      vestedAmount: 120n * TOKEN_UNIT,
      escrowedBalance: 100n * TOKEN_UNIT,
      claimedAmounts: 20n * TOKEN_UNIT,
      claimable,
    },
  };
}

const sepoliaClaimData: RewardsVestingData = {
  ...idleData,
  vestingInfo: { ...idleData.vestingInfo, claimable: 10n * TOKEN_UNIT },
  ratioVesting: {
    pairRatioFactor: 5n * 10n ** 30n,
    capUsedAmount: 10n * TOKEN_UNIT,
    unpaidClaimAmount: 10n * TOKEN_UNIT,
    deactivatedAt: 0n,
    isFrozen: false,
    isIssuerBindingConfirmed: true,
    esTokenAllowance: 0n,
    pairTokenAllowance: 0n,
    tranches: [],
  },
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
  const { pathname, search } = useLocation();

  return (
    <div data-testid="location-search" data-pathname={pathname}>
      {search}
    </div>
  );
}

function renderFlow() {
  return render(getFlow());
}

function setVestingData(data: RewardsVestingData) {
  mockUseRewardsVestingData.mockReturnValue({ data, isLoading: false, mutate });
}

function setWallet(account: string, chainId: number) {
  mockUseWallet.mockReturnValue({ account, active: true, chainId, signer: {} } as ReturnType<typeof useWallet>);
}

type GuardCase = {
  name: string;
  action: "claim" | "unlock";
  interrupt?: () => void;
  refreshError?: Error;
  refreshed?: RewardsVestingData;
  unmount?: boolean;
  toast?: { type: "info" | "error"; message: string };
};

function deferMutate() {
  let resolve!: (data: RewardsVestingData) => void;
  mutate.mockImplementationOnce(
    () =>
      new Promise<RewardsVestingData>((done) => {
        resolve = done;
      })
  );
  return (data: RewardsVestingData) => resolve(data);
}

describe("RewardsVestingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockCallContract.mockReset();
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    mutate.mockReset();
    mutate.mockResolvedValue(undefined);
    setWallet("0x123", ARBITRUM);
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    setVestingData(idleData);
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it.each([
    {
      name: "claims vested GMX from GmxVester",
      chainId: ARBITRUM,
      data: getClaimData(25n * TOKEN_UNIT),
      button: "Claim 25 GMX",
      vester: getContract(ARBITRUM, "GmxVester"),
      method: "claim",
    },
    {
      name: "claims unpaid GMX from the Sepolia ratio vault",
      chainId: ARBITRUM_SEPOLIA,
      data: sepoliaClaimData,
      button: "Claim 10 GMX",
      vester: getContract(ARBITRUM_SEPOLIA, "SeasonRatioVester"),
      method: "claim",
    },
    {
      name: "withdraws a completed vest to unlock collateral",
      chainId: ARBITRUM,
      data: completedData,
      button: "Unlock collateral",
      vester: getContract(ARBITRUM, "GmxVester"),
      method: "withdraw",
    },
  ])("$name", async ({ chainId, data, button, vester, method }) => {
    vi.mocked(useChainId).mockReturnValue({ chainId } as ReturnType<typeof useChainId>);
    setWallet("0x123", chainId);
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    setVestingData(data);
    mutate.mockResolvedValue(data);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: button }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    expect(mockCallContract.mock.calls[0].slice(0, 4)).toEqual([chainId, { address: vester }, method, []]);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it.each([
    { claimable: 1n, refreshed: undefined, label: undefined, submitted: false },
    { claimable: 99_999_999_999_999n, refreshed: undefined, label: undefined, submitted: false },
    { claimable: 100_000_000_000_000n, refreshed: undefined, label: "0.0001", submitted: true },
    { claimable: 100_000_000_000_001n, refreshed: undefined, label: "0.0001", submitted: true },
    { claimable: 25n * TOKEN_UNIT, refreshed: 0n, label: "25", submitted: false },
    { claimable: 25n * TOKEN_UNIT, refreshed: 99_999_999_999_999n, label: "25", submitted: false },
  ])(
    "applies the claim threshold to $claimable wei (refreshed $refreshed)",
    async ({ claimable, refreshed, label, submitted }) => {
      mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
      setVestingData(getClaimData(claimable));
      mutate.mockResolvedValue(getClaimData(refreshed ?? claimable));
      renderFlow();

      if (label === undefined) {
        expect(screen.getByRole("button", { name: "Nothing to claim" }).hasAttribute("disabled")).toBe(true);
        expect(screen.queryByRole("button", { name: /^Claim / })).toBeNull();
        return;
      }

      fireEvent.click(screen.getByRole("button", { name: `Claim ${label} GMX` }));
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(submitted ? 2 : 1));
      if (submitted) {
        expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["claim"]);
      } else {
        expect(mockCallContract).not.toHaveBeenCalled();
        expect(mockHelperToastInfo).toHaveBeenCalledWith("No rewards are currently available to claim.");
      }
    }
  );

  it("serializes claim and unlock actions without leaving either button busy", async () => {
    const claimableCompletedData = {
      ...completedData,
      vestingInfo: { ...completedData.vestingInfo, claimedAmounts: 95n * TOKEN_UNIT, claimable: 25n * TOKEN_UNIT },
    };
    setVestingData(claimableCompletedData);
    const resolveRefresh = deferMutate();
    mutate.mockResolvedValueOnce(claimableCompletedData);
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "Claim 25 GMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    const unlockButton = screen.getByRole("button", { name: "Unlock collateral" });
    expect(unlockButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(unlockButton);
    expect(mutate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh(claimableCompletedData);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Claim 25 GMX" })).toBeDefined());
    expect(screen.getByRole("button", { name: "Unlock collateral" }).hasAttribute("disabled")).toBe(false);
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["claim"]);
  });

  it.each<GuardCase>([
    {
      name: "claim when the account and chain change during refresh",
      action: "claim",
      interrupt: () => setWallet("0x456", AVALANCHE),
      toast: { type: "info", message: "Wallet or network changed. Review your rewards before claiming." },
    },
    {
      name: "claim when wallet extensions become inconsistent during refresh",
      action: "claim",
      interrupt: () =>
        mockUseMultipleWalletExtensionsChainError.mockReturnValue({
          buttonErrorMessage: "Transaction blocked",
          buttonTooltipMessage: "Wallet extensions are on different networks.",
        }),
      toast: { type: "info", message: "Wallet or network changed. Review your rewards before claiming." },
    },
    {
      name: "claim when the refresh fails",
      action: "claim",
      refreshError: new Error("RPC unavailable"),
      toast: { type: "error", message: "Unable to refresh claimable rewards. Please try again." },
    },
    {
      name: "unlock when the refreshed vest is active again",
      action: "unlock",
      refreshed: {
        ...completedData,
        vestingInfo: {
          ...completedData.vestingInfo,
          vestedAmount: 130n * TOKEN_UNIT,
          escrowedBalance: 10n * TOKEN_UNIT,
        },
      },
      toast: {
        type: "info",
        message: "Vesting details changed. Review the updated amounts before unlocking collateral.",
      },
    },
    {
      name: "unlock when the account changes during refresh",
      action: "unlock",
      interrupt: () => setWallet("0x456", ARBITRUM),
      toast: {
        type: "info",
        message: "Wallet or network changed. Review your vesting details before unlocking collateral.",
      },
    },
    { name: "unlock after the flow unmounts during refresh", action: "unlock", unmount: true },
  ])("does not submit a $name", async (testCase) => {
    const data = testCase.action === "claim" ? getClaimData(25n * TOKEN_UNIT) : completedData;
    setVestingData(data);
    let resolveRefresh: ((data: RewardsVestingData) => void) | undefined;
    if (testCase.refreshError) mutate.mockRejectedValueOnce(testCase.refreshError);
    else if (testCase.refreshed) mutate.mockResolvedValue(testCase.refreshed);
    else resolveRefresh = deferMutate();
    const view = renderFlow();

    fireEvent.click(
      screen.getByRole("button", { name: testCase.action === "claim" ? "Claim 25 GMX" : "Unlock collateral" })
    );
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    if (testCase.interrupt) {
      testCase.interrupt();
      view.rerender(getFlow());
    }
    if (testCase.unmount) view.unmount();
    await act(async () => resolveRefresh?.(data));

    const { toast } = testCase;
    if (toast) await waitFor(() => expect(helperToast[toast.type]).toHaveBeenCalledWith(toast.message));
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("offers the referral invite once per account when a vest starts", async () => {
    setVestingData(startableData);
    const startVesting = () => {
      fireEvent.click(screen.getByRole("button", { name: "Start vesting" }));
      fireEvent.click(screen.getByRole("button", { name: "Announce started vesting" }));
    };
    const view = renderFlow();

    startVesting();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Your esGMX is now vesting!" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Your esGMX is now vesting!" })).toBeNull());
    view.unmount();

    const sameAccountView = renderFlow();
    startVesting();
    expect(screen.queryByRole("dialog", { name: "Your esGMX is now vesting!" })).toBeNull();
    sameAccountView.unmount();

    setWallet("0x456", ARBITRUM);
    renderFlow();
    startVesting();
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Your esGMX is now vesting!" })).toBeDefined());
  });

  it("consumes the vesting deep link once and preserves other query parameters", async () => {
    window.history.replaceState({}, "", "/rewards/history?source=summary&vesting=start");
    setVestingData(startableData);
    const view = renderFlow();

    await waitFor(() => expect(screen.getByTestId("vesting-modal")).toBeDefined());
    expect(mockHelperToastInfo).not.toHaveBeenCalled();
    expect(mockSendRewardsVestingModalOpenEvent).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location-search").textContent).toBe("?source=summary");

    view.rerender(getFlow());
    expect(mockSendRewardsVestingModalOpenEvent).toHaveBeenCalledTimes(1);
  });
});
