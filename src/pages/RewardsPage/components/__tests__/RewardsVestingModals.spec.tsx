import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { expandDecimals } from "lib/numbers";
import { sendRewardsTransactionResultEvent } from "lib/userAnalytics/rewardsEvents";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { RewardsStopVestingModal, RewardsVestingModal } from "../RewardsVestingModals";

vi.mock("domain/synthetics/tokens", () => ({
  useTokensAllowanceData: vi.fn(),
}));

vi.mock("domain/synthetics/governance/useGovTokenAmount", () => ({
  useGovTokenAmount: vi.fn(),
}));

vi.mock("domain/synthetics/governance/useGovTokenDelegates", () => ({
  useGovTokenDelegates: vi.fn(),
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
  helperToast: { error: vi.fn(), info: vi.fn() },
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));

vi.mock("lib/useHasOutdatedUi", () => ({
  useHasOutdatedUi: () => false,
  getPageOutdatedError: () => "Page outdated",
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsTransactionResultEvent: vi.fn(),
}));

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainWarning", () => ({
  SwitchToSettlementChainWarning: () => null,
}));

const TOKEN_UNIT = expandDecimals(1, 18);
const mockUseTokensAllowanceData = vi.mocked(useTokensAllowanceData);
const mockUseGovTokenAmount = vi.mocked(useGovTokenAmount);
const mockUseGovTokenDelegates = vi.mocked(useGovTokenDelegates);
const mockUseMultipleWalletExtensionsChainError = vi.mocked(useMultipleWalletExtensionsChainError);
const mockUseWallet = vi.mocked(useWallet);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastError = vi.mocked(helperToast.error);
const mockHelperToastInfo = vi.mocked(helperToast.info);
const mockSendRewardsTransactionResultEvent = vi.mocked(sendRewardsTransactionResultEvent);
const mutate = vi.fn(async (): Promise<RewardsVestingData | undefined> => undefined);
const setIsVisible = vi.fn();
const onBuyGmx = vi.fn();

const baseData: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 100n * TOKEN_UNIT,
  stakedGmxBalance: 0n,
  freePairAmount: 100n * TOKEN_UNIT,
  vestingInfo: {
    pairAmount: 0n,
    vestedAmount: 0n,
    escrowedBalance: 0n,
    claimedAmounts: 0n,
    claimable: 0n,
    maxVestableAmount: 100n * TOKEN_UNIT,
    averageStakedAmount: 100n * TOKEN_UNIT,
  },
  vestingDuration: 365n * 24n * 60n * 60n,
  gmxPrice: 80n * 10n ** 30n,
};

i18n.load({ en: {} });
i18n.activate("en");

function getVestModal(data: RewardsVestingData) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsVestingModal isVisible setIsVisible={setIsVisible} data={data} mutate={mutate} onBuyGmx={onBuyGmx} />
    </I18nProvider>
  );
}

function renderVestModal(data: RewardsVestingData) {
  return render(getVestModal(data));
}

function getStopModal(data: RewardsVestingData) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsStopVestingModal isVisible setIsVisible={setIsVisible} data={data} mutate={mutate} />
    </I18nProvider>
  );
}

function renderStopModal(data: RewardsVestingData) {
  return render(getStopModal(data));
}

describe("RewardsVestingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockResolvedValue(undefined);
    mockUseGovTokenAmount.mockReturnValue(0n);
    mockUseGovTokenDelegates.mockReturnValue(undefined);
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: {},
      isLoading: false,
      isLoaded: true,
    });
  });

  afterEach(cleanup);

  it("renders the deposit-only state when free collateral already covers the vest", () => {
    renderVestModal(baseData);

    expect(screen.getByText("Stake & vest esGMX", { selector: ".Modal-title" })).toBeDefined();
    expect(screen.getByDisplayValue("100")).toBeDefined();
    expect(screen.getByText("Vestable: 100 esGMX")).toBeDefined();
    expect(screen.getByText("Collateral this vest locks").parentElement?.textContent?.replace(/\s/g, "")).toBe(
      "Collateralthisvestlocks100GMX"
    );
    expect(screen.getByText("Already staked & free").parentElement?.textContent?.replace(/\s/g, "")).toBe(
      "Alreadystaked&free100GMX"
    );
    expect(screen.queryByText(/more GMX staked as collateral/)).toBeNull();
    expect(screen.getByRole("button", { name: "Vest 100 esGMX" }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText("Approve GMX")).toBeNull();
    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect(screen.getByText("Start vesting")).toBeDefined();

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "25" } });
    expect(screen.getByRole("button", { name: "Vest 25 esGMX" })).toBeDefined();
  });

  it("shows the stake-and-vest notice when wallet GMX covers an initial vest", () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    });

    expect(screen.getByText("Stake & vest esGMX", { selector: ".Modal-title" })).toBeDefined();
    expect(screen.getByText(/You need 100 more GMX staked as collateral/)).toBeDefined();
    expect(screen.getByText(/then start vesting/)).toBeDefined();
    expect(screen.getAllByText("Approve GMX").length).toBeGreaterThan(0);
    expect(screen.getByText("Stake collateral")).toBeDefined();
    expect(screen.getByText("Start vesting")).toBeDefined();
  });

  it("offers an affordable amount and a buy action when wallet GMX only covers part of the collateral", () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 50n * TOKEN_UNIT,
    });

    expect(screen.getByText(/You hold 50 unreserved GMX in the wallet/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Vest 50 esGMX with your 50 GMX" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Buy 50 GMX and vest all 100 esGMX" }));
    expect(onBuyGmx).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Vest 100 esGMX" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows the no-GMX blocked state", () => {
    renderVestModal({ ...baseData, freePairAmount: 0n });

    expect(screen.getByText("Vesting needs GMX staked as collateral, but you have no GMX to stake.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Buy 100 GMX to vest 100 esGMX" })).toBeDefined();
  });

  it("disables the vest action until the signer is available", () => {
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: undefined,
    } as ReturnType<typeof useWallet>);
    renderVestModal(baseData);

    expect(screen.getByRole("button", { name: "Vest 100 esGMX" }).hasAttribute("disabled")).toBe(true);
  });

  it("blocks vesting transactions when wallet extensions are on different networks", () => {
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({
      buttonErrorMessage: "Transaction blocked",
      buttonTooltipMessage: "Wallet extensions are on different networks.",
    });

    renderVestModal(baseData);

    const button = screen.getByRole("button", { name: "Transaction blocked" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("replaces transaction actions with an exact Arbitrum switch on another wallet chain", () => {
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: AVALANCHE,
      signer: {},
    } as ReturnType<typeof useWallet>);
    renderVestModal(baseData);

    expect(screen.getByRole("button", { name: "Switch to Arbitrum" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Vest 100 esGMX" })).toBeNull();
  });

  it("refreshes the vesting preview before a direct deposit", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    mutate.mockResolvedValueOnce(baseData).mockResolvedValueOnce(baseData);
    renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mutate.mock.invocationCallOrder[0]).toBeLessThan(mockCallContract.mock.invocationCallOrder[0]);
    expect(mockCallContract.mock.calls[0][2]).toBe("deposit");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("does not deposit when the refreshed funding preview changed", async () => {
    mutate.mockResolvedValueOnce({
      ...baseData,
      walletGmxBalance: 10n * TOKEN_UNIT,
      freePairAmount: 90n * TOKEN_UNIT,
    });
    renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Vesting details changed. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(mockSendRewardsTransactionResultEvent).not.toHaveBeenCalled();
  });

  it("does not deposit when the account changes during the preflight refresh", async () => {
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(baseData));
    resolveMutate?.(baseData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Wallet or network changed. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("requests GMX approval before starting the stake-and-vest sequence", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    const approvalWait = vi.fn(async () => undefined);
    const stakeWait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait: approvalWait }).mockResolvedValueOnce({ wait: stakeWait });
    mutate.mockResolvedValueOnce(initialData).mockResolvedValueOnce(undefined);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Approve GMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("approve");
    expect(approvalWait).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("GMX approved")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["approve", "stakeGmx"]);
    expect(stakeWait).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Collateral staked")).toBeDefined();
  });

  it("does not auto-stake undelegated GMX voting power", () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    mockUseGovTokenAmount.mockReturnValue(100n * TOKEN_UNIT);
    mockUseGovTokenDelegates.mockReturnValue(NATIVE_TOKEN_ADDRESS);
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });

    renderVestModal(initialData);

    expect(screen.getByRole("link", { name: "Delegate your undelegated 100.00 GMX DAO" })).toBeDefined();
    const button = screen.getByRole("button", { name: "Vest 100 esGMX" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("rechecks GMX delegation before auto-staking", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseGovTokenAmount.mockReturnValue(100n * TOKEN_UNIT);
    mockUseGovTokenDelegates.mockReturnValue(NATIVE_TOKEN_ADDRESS);
    view.rerender(getVestModal(initialData));
    resolveMutate?.(initialData);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Delegate your undelegated 100.00 GMX DAO" })).toBeDefined()
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("resets approval progress and input when the connected account changes", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    const view = renderVestModal(initialData);

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve GMX" }));
    await waitFor(() => expect(screen.getByText("GMX approved")).toBeDefined());

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));

    await waitFor(() => expect(screen.queryByText("GMX approved")).toBeNull());
    expect(screen.getByDisplayValue("100")).toBeDefined();
    expect(screen.getByRole("button", { name: "Approve GMX" })).toBeDefined();
  });

  it("does not let a previous account approval clear the current account pending step", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    let resolveFirstApproval: (() => void) | undefined;
    let resolveSecondApproval: (() => void) | undefined;
    const firstApproval = new Promise<void>((resolve) => {
      resolveFirstApproval = resolve;
    });
    const secondApproval = new Promise<void>((resolve) => {
      resolveSecondApproval = resolve;
    });
    mockCallContract
      .mockResolvedValueOnce({ wait: () => firstApproval } as any)
      .mockResolvedValueOnce({ wait: () => secondApproval } as any);
    const view = renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Approve GMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve GMX" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Approve GMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Approving GMX..." })).toBeDefined();

    resolveFirstApproval?.();
    await waitFor(() => expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Approving GMX..." })).toBeDefined();

    resolveSecondApproval?.();
    await waitFor(() => expect(screen.getByText("GMX approved")).toBeDefined());
  });

  it("stakes collateral, refreshes the account, and only then deposits esGMX", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    const refreshedData = {
      ...initialData,
      freePairAmount: 100n * TOKEN_UNIT,
      walletGmxBalance: 0n,
      stakedGmxBalance: 100n * TOKEN_UNIT,
    };
    const stakeWait = vi.fn(async () => undefined);
    const vestWait = vi.fn(async () => undefined);
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract.mockResolvedValueOnce({ wait: stakeWait } as any).mockResolvedValueOnce({ wait: vestWait } as any);
    mutate.mockResolvedValueOnce(initialData).mockResolvedValueOnce(refreshedData).mockResolvedValueOnce(refreshedData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
    expect(stakeWait).toHaveBeenCalledTimes(1);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(screen.getByRole("button", { name: "Done" })).toBeDefined());
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(setIsVisible).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(setIsVisible).toHaveBeenCalledWith(false);
  });

  it("resets completed vesting progress when the connected account changes", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    mutate.mockResolvedValueOnce(baseData).mockResolvedValueOnce(baseData);
    const view = renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Done" })).toBeDefined());

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(baseData));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Done" })).toBeNull());
    expect(screen.getByRole("button", { name: "Vest 100 esGMX" })).toBeDefined();
    expect(screen.queryByText("Vesting started")).toBeNull();
  });

  it("does not let a previous account vest clear the current account pending step", async () => {
    let resolveFirstVest: (() => void) | undefined;
    let resolveSecondVest: (() => void) | undefined;
    const firstVest = new Promise<void>((resolve) => {
      resolveFirstVest = resolve;
    });
    const secondVest = new Promise<void>((resolve) => {
      resolveSecondVest = resolve;
    });
    mockCallContract
      .mockResolvedValueOnce({ wait: () => firstVest } as any)
      .mockResolvedValueOnce({ wait: () => secondVest } as any);
    mutate.mockResolvedValue(baseData);
    const view = renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(baseData));
    await waitFor(() => expect(screen.getByRole("button", { name: "Vest 100 esGMX" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Vesting..." })).toBeDefined();

    resolveFirstVest?.();
    await waitFor(() => expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Vesting..." })).toBeDefined();

    resolveSecondVest?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Done" })).toBeDefined());
  });

  it("does not deposit when the refreshed account still lacks collateral", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    mutate.mockResolvedValueOnce(initialData).mockResolvedValueOnce({
      ...initialData,
      walletGmxBalance: 0n,
    });
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalled());
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    expect(mockCallContract.mock.calls[0][2]).toBe("stakeGmx");
  });

  it("does not deposit after staking when the collateral preview materially changes", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    const changedPreviewData = {
      ...initialData,
      walletGmxBalance: 0n,
      stakedGmxBalance: 200n * TOKEN_UNIT,
      freePairAmount: 200n * TOKEN_UNIT,
      vestingInfo: {
        ...initialData.vestingInfo,
        averageStakedAmount: 200n * TOKEN_UNIT,
      },
    };
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    mutate.mockResolvedValueOnce(initialData).mockResolvedValueOnce(changedPreviewData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx"]);
  });

  it("does not deposit when the wallet changes during the collateral refresh", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    const refreshedData = {
      ...initialData,
      freePairAmount: 100n * TOKEN_UNIT,
      walletGmxBalance: 0n,
      stakedGmxBalance: 100n * TOKEN_UNIT,
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    mutate.mockResolvedValueOnce(initialData).mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: AVALANCHE,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));
    resolveMutate?.(refreshedData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    expect(mockCallContract.mock.calls[0][2]).toBe("stakeGmx");
  });

  it("reports partial completion when staking succeeds but vesting fails", async () => {
    const initialData = {
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    };
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract
      .mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any)
      .mockRejectedValueOnce(new Error("Deposit rejected"));
    const refreshedData = {
      ...initialData,
      freePairAmount: 100n * TOKEN_UNIT,
      walletGmxBalance: 0n,
    };
    mutate.mockResolvedValueOnce(initialData).mockResolvedValueOnce(refreshedData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked, but vesting did not start. Review the updated collateral and try again."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByRole("button", { name: "Vest 100 esGMX" })).toBeDefined();
    expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
      transaction: "StartVesting",
      result: "PartialSuccess",
      amount: 100n * TOKEN_UNIT,
    });
  });
});

describe("RewardsStopVestingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockResolvedValue(undefined);
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
  });

  afterEach(cleanup);

  it("uses the active vesting amounts in the confirmation copy", () => {
    renderStopModal({
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    });

    expect(screen.getByText("Stop vesting?", { selector: ".Modal-title" })).toBeDefined();
    expect(screen.getByText(/So far 50 GMX has vested/)).toBeDefined();
    expect(screen.getByText(/remaining 50 esGMX/)).toBeDefined();
    expect(screen.getByText(/Your 50 GMX collateral will be unlocked/)).toBeDefined();
    expect(screen.getByText("Stop vesting 100% of these rewards?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Yes, stop vesting" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Keep vesting" })).toBeDefined();
  });

  it("blocks stopping when wallet extensions are on different networks", () => {
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({
      buttonErrorMessage: "Transaction blocked",
      buttonTooltipMessage: "Wallet extensions are on different networks.",
    });
    const activeData = {
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    };

    renderStopModal(activeData);

    const button = screen.getByRole("button", { name: "Transaction blocked" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("withdraws the active vest after confirmation", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    const activeData = {
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    };
    mutate.mockResolvedValueOnce(activeData).mockResolvedValueOnce(activeData);
    renderStopModal(activeData);

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mutate.mock.invocationCallOrder[0]).toBeLessThan(mockCallContract.mock.invocationCallOrder[0]);
    expect(mockCallContract.mock.calls[0][2]).toBe("withdraw");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it("does not stop vesting when the refreshed position changed", async () => {
    const activeData = {
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    };
    mutate.mockResolvedValueOnce({
      ...activeData,
      vestingInfo: {
        ...activeData.vestingInfo,
        vestedAmount: 110n * TOKEN_UNIT,
        escrowedBalance: 60n * TOKEN_UNIT,
      },
    });
    renderStopModal(activeData);

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Vesting details changed. Review the updated amounts before stopping."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(mockSendRewardsTransactionResultEvent).not.toHaveBeenCalled();
  });

  it("does not stop vesting when the account changes during refresh", async () => {
    const activeData = {
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    };
    let resolveMutate: ((data: RewardsVestingData) => void) | undefined;
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderStopModal(activeData);

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getStopModal(activeData));
    resolveMutate?.(activeData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "Wallet or network changed. Review your vesting details before stopping."
      )
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("delegates a mined stop failure to the pending transaction watcher without a duplicate toast", async () => {
    const activeData = {
      ...baseData,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
      },
    };
    const wait = vi.fn(async () => {
      throw new Error("Reverted");
    });
    mutate.mockResolvedValueOnce(activeData);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    renderStopModal(activeData);

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() =>
      expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
        transaction: "StopVesting",
        result: "Fail",
        amount: 50n * TOKEN_UNIT,
      })
    );
    expect(mockCallContract.mock.calls[0][4]).toMatchObject({
      failMsg: "Stop vesting failed",
      setPendingTxns: expect.any(Function),
    });
    expect(mockHelperToastError).not.toHaveBeenCalled();
  });
});
