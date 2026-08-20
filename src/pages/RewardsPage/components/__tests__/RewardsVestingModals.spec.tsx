import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
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

vi.mock("lib/wallets/walletConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lib/wallets/walletConfig")>();

  return {
    ...actual,
    getPublicClientWithRpc: vi.fn(),
  };
});

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
const DELEGATE_ADDRESS = "0x0000000000000000000000000000000000000001";
const mockUseTokensAllowanceData = vi.mocked(useTokensAllowanceData);
const mockUseGovTokenAmount = vi.mocked(useGovTokenAmount);
const mockUseGovTokenDelegates = vi.mocked(useGovTokenDelegates);
const mockUseMultipleWalletExtensionsChainError = vi.mocked(useMultipleWalletExtensionsChainError);
const mockUseWallet = vi.mocked(useWallet);
const mockGetPublicClientWithRpc = vi.mocked(getPublicClientWithRpc);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastError = vi.mocked(helperToast.error);
const mockHelperToastInfo = vi.mocked(helperToast.info);
const mockSendRewardsTransactionResultEvent = vi.mocked(sendRewardsTransactionResultEvent);
const mutate = vi.fn(async (): Promise<RewardsVestingData | undefined> => undefined);
const setIsVisible = vi.fn();
const onBuyGmx = vi.fn();
const mockReadContract = vi.fn();

const baseData: RewardsVestingData = {
  walletGmxBalance: 0n,
  walletEsGmxBalance: 100n * TOKEN_UNIT,
  claimableEsGmxRewards: 100n * TOKEN_UNIT,
  stakedGmxBalance: 100n * TOKEN_UNIT,
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

function getVestModal(
  data: RewardsVestingData,
  isVisible = true,
  onSimulatedVest?: (amount: bigint) => Promise<void>,
  options?: {
    claimableEsGmxAmount?: bigint;
    onSimulatedClaim?: () => Promise<void>;
    onSimulatedStake?: (stakeAmount: bigint) => Promise<void>;
  }
) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsVestingModal
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        data={data}
        mutate={mutate}
        onBuyGmx={onBuyGmx}
        claimableEsGmxAmount={options?.claimableEsGmxAmount}
        onSimulatedClaim={options?.onSimulatedClaim}
        onSimulatedStake={options?.onSimulatedStake}
        onSimulatedVest={onSimulatedVest}
      />
    </I18nProvider>
  );
}

function renderVestModal(data: RewardsVestingData) {
  return render(getVestModal(data));
}

function getStopModal(data: RewardsVestingData, onSimulatedStop?: () => Promise<void>) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsStopVestingModal
        isVisible
        setIsVisible={setIsVisible}
        data={data}
        mutate={mutate}
        onSimulatedStop={onSimulatedStop}
      />
    </I18nProvider>
  );
}

function renderStopModal(data: RewardsVestingData) {
  return render(getStopModal(data));
}

function getCollateralRowText(row: "required" | "available") {
  const element = document.querySelector(`[data-qa="rewards-vesting-collateral-${row}"]`);

  if (!element) {
    throw new Error(`Missing ${row} collateral row`);
  }

  return element.textContent?.replace(/\s/g, "");
}

function expectBlueNotification(element: Element) {
  const banner = element.closest(".border-l-2");

  if (!banner) {
    throw new Error("Missing notification banner");
  }

  expect(banner.className).toContain("border-l-blue-300");
  expect(banner.className).toContain("bg-blue-300");
  expect(banner.className).not.toContain("border-l-yellow-300");

  return banner;
}

describe("RewardsVestingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockResolvedValue(undefined);
    mockUseGovTokenAmount.mockReturnValue(0n);
    mockUseGovTokenDelegates.mockReturnValue(DELEGATE_ADDRESS);
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    mockReadContract.mockReset();
    mockReadContract.mockResolvedValue(0n);
    mockGetPublicClientWithRpc.mockReturnValue({ readContract: mockReadContract } as any);
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: {},
      isLoading: false,
      isLoaded: true,
    });
  });

  afterEach(cleanup);

  it("disables governance reads while hidden", () => {
    render(getVestModal(baseData, false));

    expect(mockUseGovTokenAmount).toHaveBeenCalledWith(
      ARBITRUM,
      expect.objectContaining({ enabled: false, requestKey: expect.any(String) })
    );
    expect(mockUseGovTokenDelegates).toHaveBeenCalledWith(
      ARBITRUM,
      expect.objectContaining({ enabled: false, requestKey: expect.any(String) })
    );
  });

  it("renders outside its caller's layout flow", () => {
    const view = renderVestModal(baseData);

    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(screen.getByRole("dialog", { name: "Vest esGMX" })).toBeDefined();
  });

  it("uses a fresh governance cache key whenever the modal reopens", () => {
    const view = render(getVestModal(baseData));
    const firstRequestKey = mockUseGovTokenAmount.mock.calls.at(-1)?.[1]?.requestKey;

    view.rerender(getVestModal(baseData, false));
    view.rerender(getVestModal(baseData));

    expect(mockUseGovTokenAmount.mock.calls.at(-1)?.[1]?.requestKey).not.toBe(firstRequestKey);
    expect(mockUseGovTokenDelegates.mock.calls.at(-1)?.[1]?.requestKey).toBe(
      mockUseGovTokenAmount.mock.calls.at(-1)?.[1]?.requestKey
    );
  });

  it("keeps stake-capable actions disabled when the governance amount is unavailable", () => {
    mockUseGovTokenAmount.mockReturnValue(undefined);

    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    });

    const button = screen.getByRole("button", { name: "Loading..." });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("renders the deposit-only state when free collateral already covers the vest", () => {
    renderVestModal(baseData);

    expect(screen.getByText("Vest esGMX", { selector: ".Modal-title" })).toBeDefined();
    expect(screen.getByDisplayValue("100")).toBeDefined();
    expect(screen.getByText("Vestable: 100 esGMX")).toBeDefined();
    expect(getCollateralRowText("required")).toBe("Collateralrequiredforvest100GMX");
    expect(getCollateralRowText("available")).toBe("Collateralavailable100GMX");
    expect(screen.queryByText(/more GMX staked as collateral/)).toBeNull();
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText("Approve GMX")).toBeNull();
    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect(screen.queryByText("Start vesting")).toBeNull();

    fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "25" } });
    expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined();
    expect(getCollateralRowText("required")).toBe("Collateralrequiredforvest25GMX");
  });

  it("explains the vesting collateral fields", async () => {
    renderVestModal(baseData);

    const requiredLabel = screen.getByText("Collateral required for vest");
    fireEvent.mouseEnter(requiredLabel.closest(".Tooltip-handle")!);
    expect(
      await screen.findByText(
        "The amount of GMX needed to vest the entered esGMX. Each 1 esGMX requires 5 GMX to be staked and locked"
      )
    ).toBeDefined();
    fireEvent.mouseLeave(requiredLabel.closest(".Tooltip-handle")!);

    const availableLabel = screen.getByText("Collateral available");
    fireEvent.mouseEnter(availableLabel.closest(".Tooltip-handle")!);
    expect(
      await screen.findByText("The amount of GMX currently available to be locked as collateral for vesting.")
    ).toBeDefined();
  });

  it("rounds vestable and collateral summaries while preserving the exact input amount", () => {
    const vestableAmount = 15_621_101_296_529_900n;

    renderVestModal({
      ...baseData,
      walletEsGmxBalance: vestableAmount,
      freePairAmount: vestableAmount,
    });

    expect(screen.getByDisplayValue("0.0156211012965299")).toBeDefined();
    expect(screen.getByText("Vestable: 0.02 esGMX")).toBeDefined();
    expect(getCollateralRowText("required")).toBe("Collateralrequiredforvest0.02GMX");
    expect(getCollateralRowText("available")).toBe("Collateralavailable0.02GMX");
  });

  it("shows the stake-and-vest notice when wallet GMX covers an initial vest", () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    });

    expect(screen.getByText("Vest esGMX", { selector: ".Modal-title" })).toBeDefined();
    expectBlueNotification(screen.getByText(/You need 100 more GMX staked as collateral/));
    expect(screen.getByText(/then start vesting/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined();
    expect(screen.queryByText("Approve GMX")).toBeNull();
    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect(screen.queryByText("Start vesting")).toBeNull();
  });

  it("offers an affordable amount and a buy action when wallet GMX only covers part of the collateral", () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 50n * TOKEN_UNIT,
    });

    const banner = expectBlueNotification(screen.getByText(/You hold 50 unreserved GMX in the wallet/));
    const affordableVestButton = screen.getByRole("button", { name: "Vest 50 esGMX with your 50 GMX" });

    expect(banner.querySelector(".text-yellow-300")).toBeNull();
    expect(affordableVestButton.className).toContain("text-blue-300");
    fireEvent.click(screen.getByRole("button", { name: "Buy 50 GMX and vest all 100 esGMX" }));
    expect(onBuyGmx).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);
  });

  it("includes free staked and wallet GMX in available collateral", () => {
    renderVestModal({
      ...baseData,
      walletGmxBalance: 25n * TOKEN_UNIT,
      stakedGmxBalance: 150n * TOKEN_UNIT,
      freePairAmount: 150n * TOKEN_UNIT,
      vestingInfo: {
        ...baseData.vestingInfo,
        averageStakedAmount: 200n * TOKEN_UNIT,
      },
    });

    expect(getCollateralRowText("required")).toBe("Collateralrequiredforvest100GMX");
    expect(getCollateralRowText("available")).toBe("Collateralavailable175GMX");
  });

  it("shows the no-GMX blocked state", () => {
    renderVestModal({ ...baseData, freePairAmount: 0n });

    expectBlueNotification(screen.getByText("Vesting needs GMX staked as collateral, but you have no GMX to stake."));
    const buyButton = screen.getByRole("button", { name: "Buy 100 GMX to vest 100 esGMX" });

    expect(buyButton.className).toContain("text-blue-300");
  });

  it("shows the active vesting extension notice in blue", () => {
    renderVestModal({
      ...baseData,
      walletEsGmxBalance: 50n * TOKEN_UNIT,
      freePairAmount: 50n * TOKEN_UNIT,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 50n * TOKEN_UNIT,
        escrowedBalance: 25n * TOKEN_UNIT,
      },
    });

    const banner = expectBlueNotification(screen.getByText(/Adding esGMX extends your current vesting/));

    expect(banner.querySelector(".text-blue-300")).not.toBeNull();
    expect(banner.querySelector(".text-yellow-300")).toBeNull();
  });

  it("disables the vest action until the signer is available", () => {
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      signer: undefined,
    } as ReturnType<typeof useWallet>);
    renderVestModal(baseData);

    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);
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
    expect(screen.queryByRole("button", { name: "Vest esGMX" })).toBeNull();
  });

  it("shows progress below the buttons and simulates stake and vest sequentially from one click", async () => {
    let resolveStake: (() => void) | undefined;
    const stakePromise = new Promise<void>((resolve) => {
      resolveStake = resolve;
    });
    const onSimulatedStake = vi.fn(() => stakePromise);
    const onSimulatedVest = vi.fn(async () => undefined);
    mockUseWallet.mockReturnValue({
      active: false,
      chainId: AVALANCHE,
    } as ReturnType<typeof useWallet>);
    mockUseGovTokenAmount.mockReturnValue(undefined);
    mockUseGovTokenDelegates.mockReturnValue(undefined);
    mockUseTokensAllowanceData.mockReturnValue({
      isLoading: true,
      isLoaded: false,
    });

    render(
      getVestModal(
        {
          ...baseData,
          walletGmxBalance: 100n * TOKEN_UNIT,
          freePairAmount: 0n,
        },
        true,
        onSimulatedVest,
        { onSimulatedStake }
      )
    );

    const button = screen.getByRole("button", { name: "Vest esGMX" });
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(document.querySelector('[data-qa="rewards-vesting-steps"]')).toBeNull();
    fireEvent.click(button);

    await waitFor(() => expect(onSimulatedStake).toHaveBeenCalledWith(100n * TOKEN_UNIT));
    expect(onSimulatedVest).not.toHaveBeenCalled();
    const steps = document.querySelector('[data-qa="rewards-vesting-steps"]');
    expect(steps).not.toBeNull();
    expect(button.compareDocumentPosition(steps!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(steps?.querySelector("svg.animate-spin")).not.toBeNull();
    expect(steps?.querySelector(".top-21.-bottom-13")).not.toBeNull();

    await act(async () => resolveStake?.());
    await waitFor(() => expect(onSimulatedVest).toHaveBeenCalledWith(100n * TOKEN_UNIT));
    await waitFor(() => expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined());
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(screen.getAllByText("Completed")).toHaveLength(2);
    expect(setIsVisible).not.toHaveBeenCalled();
    expect(mockUseGovTokenAmount).toHaveBeenCalledWith(ARBITRUM, expect.objectContaining({ enabled: false }));
    expect(mockCallContract).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Close", { selector: "button.primary" }));
    expect(setIsVisible).toHaveBeenCalledWith(false);
  });

  it("continues a simulated flow from the rejected wallet step", async () => {
    const onSimulatedStake = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Simulated transaction rejected."))
      .mockResolvedValueOnce(undefined);
    const onSimulatedVest = vi.fn(async () => undefined);
    const simulationData = {
      ...baseData,
      walletGmxBalance: 100n * TOKEN_UNIT,
      freePairAmount: 0n,
    };

    render(getVestModal(simulationData, true, onSimulatedVest, { onSimulatedStake }));
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeDefined());
    expect(onSimulatedStake).toHaveBeenCalledTimes(1);
    expect(onSimulatedVest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(onSimulatedStake).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSimulatedVest).toHaveBeenCalledWith(100n * TOKEN_UNIT));
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
  });

  it("does not start a simulated flow when collateral is insufficient", () => {
    const onSimulatedClaim = vi.fn(async () => undefined);
    const onSimulatedStake = vi.fn(async () => undefined);
    const onSimulatedVest = vi.fn(async () => undefined);
    const rewardData = {
      ...baseData,
      walletGmxBalance: 0n,
      walletEsGmxBalance: 40n * TOKEN_UNIT,
      claimableEsGmxRewards: 60n * TOKEN_UNIT,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        ...baseData.vestingInfo,
        averageStakedAmount: 0n,
      },
    };
    render(
      getVestModal(rewardData, true, onSimulatedVest, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
        onSimulatedClaim,
        onSimulatedStake,
      })
    );

    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect(screen.queryByText("Claim esGMX rewards")).toBeNull();
    const button = screen.getByRole("button", { name: "Vest esGMX" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);

    expect(onSimulatedClaim).not.toHaveBeenCalled();
    expect(onSimulatedStake).not.toHaveBeenCalled();
    expect(onSimulatedVest).not.toHaveBeenCalled();
  });

  it("claims, stakes, and vests sequentially from one click when funded", async () => {
    const onSimulatedClaim = vi.fn(async () => undefined);
    const onSimulatedStake = vi.fn(async () => undefined);
    const onSimulatedVest = vi.fn(async () => undefined);
    const rewardData = {
      ...baseData,
      walletGmxBalance: 100n * TOKEN_UNIT,
      walletEsGmxBalance: 40n * TOKEN_UNIT,
      claimableEsGmxRewards: 60n * TOKEN_UNIT,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        ...baseData.vestingInfo,
        averageStakedAmount: 0n,
      },
    };
    render(
      getVestModal(rewardData, true, onSimulatedVest, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
        onSimulatedClaim,
        onSimulatedStake,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(onSimulatedClaim).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSimulatedStake).toHaveBeenCalledWith(100n * TOKEN_UNIT));
    await waitFor(() => expect(onSimulatedVest).toHaveBeenCalledWith(100n * TOKEN_UNIT));
    expect(onSimulatedClaim.mock.invocationCallOrder[0]).toBeLessThan(onSimulatedStake.mock.invocationCallOrder[0]);
    expect(onSimulatedStake.mock.invocationCallOrder[0]).toBeLessThan(onSimulatedVest.mock.invocationCallOrder[0]);
    expect(screen.getByText("esGMX claimed")).toBeDefined();
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(screen.getAllByText("Completed")).toHaveLength(3);
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
    expect(setIsVisible).not.toHaveBeenCalled();
  });

  it("keeps completed steps stable after balances refresh and clears the amount", async () => {
    const onSimulatedClaim = vi.fn(async () => undefined);
    const onSimulatedVest = vi.fn(async () => undefined);
    const depositAmount = 10n * TOKEN_UNIT;
    const rewardData = {
      ...baseData,
      walletEsGmxBalance: 0n,
      claimableEsGmxRewards: depositAmount,
      stakedGmxBalance: depositAmount,
      freePairAmount: depositAmount,
    };
    const vestedData = {
      ...rewardData,
      walletEsGmxBalance: 0n,
      claimableEsGmxRewards: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        ...rewardData.vestingInfo,
        pairAmount: depositAmount,
        vestedAmount: depositAmount,
        escrowedBalance: depositAmount,
      },
    };
    const view = render(
      getVestModal(rewardData, true, onSimulatedVest, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
        onSimulatedClaim,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(onSimulatedVest).toHaveBeenCalledWith(depositAmount));
    await waitFor(() => expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined());
    view.rerender(
      getVestModal(vestedData, true, onSimulatedVest, {
        claimableEsGmxAmount: vestedData.claimableEsGmxRewards,
        onSimulatedClaim,
      })
    );

    expect(screen.getByText("esGMX claimed")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(screen.getAllByText("Completed")).toHaveLength(2);
    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
  });

  it("does not add a newly available claim to a completed vesting flow", async () => {
    const onSimulatedClaim = vi.fn(async () => undefined);
    const onSimulatedVest = vi.fn(async () => undefined);
    const view = render(getVestModal(baseData, true, onSimulatedVest));

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined());
    view.rerender(
      getVestModal(
        {
          ...baseData,
          walletEsGmxBalance: 0n,
          claimableEsGmxRewards: 10n * TOKEN_UNIT,
          freePairAmount: 0n,
          vestingInfo: {
            ...baseData.vestingInfo,
            pairAmount: 100n * TOKEN_UNIT,
            vestedAmount: 100n * TOKEN_UNIT,
            escrowedBalance: 100n * TOKEN_UNIT,
          },
        },
        true,
        onSimulatedVest,
        {
          claimableEsGmxAmount: 10n * TOKEN_UNIT,
          onSimulatedClaim,
        }
      )
    );

    expect(screen.queryByText("Claim esGMX rewards")).toBeNull();
    expect(screen.queryByText("Stake collateral")).toBeNull();
    expect(document.querySelector('[data-qa="rewards-vesting-steps"]')).toBeNull();
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
  });

  it("keeps the loading claim step visible and uses allowance loaded during the claim", async () => {
    let resolveClaim: (() => void) | undefined;
    const claimWait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClaim = resolve;
        })
    );
    const stakeWait = vi.fn(async () => undefined);
    const vestWait = vi.fn(async () => undefined);
    const rewardData = {
      ...baseData,
      walletGmxBalance: 100n * TOKEN_UNIT,
      walletEsGmxBalance: 20n * TOKEN_UNIT,
      claimableEsGmxRewards: 80n * TOKEN_UNIT,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
    };
    const claimedData = {
      ...rewardData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      claimableEsGmxRewards: 0n,
    };
    const stakedData = {
      ...claimedData,
      walletGmxBalance: 0n,
      stakedGmxBalance: 100n * TOKEN_UNIT,
      freePairAmount: 100n * TOKEN_UNIT,
    };
    mockUseTokensAllowanceData.mockReturnValue({
      isLoading: true,
      isLoaded: false,
    });
    mockCallContract
      .mockResolvedValueOnce({ wait: claimWait } as any)
      .mockResolvedValueOnce({ wait: stakeWait } as any)
      .mockResolvedValueOnce({ wait: vestWait } as any);
    mutate
      .mockResolvedValueOnce(rewardData)
      .mockResolvedValueOnce(claimedData)
      .mockResolvedValueOnce(claimedData)
      .mockResolvedValue(stakedData);
    const view = render(
      getVestModal(rewardData, true, undefined, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(claimWait).toHaveBeenCalledTimes(1));

    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    view.rerender(
      getVestModal(claimedData, true, undefined, {
        claimableEsGmxAmount: claimedData.claimableEsGmxRewards,
      })
    );
    expect(screen.getByText("Claim esGMX rewards")).toBeDefined();
    expect(document.querySelector('[data-qa="rewards-vesting-steps"] svg.animate-spin')).not.toBeNull();
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["handleRewards"]);

    await act(async () => resolveClaim?.());
    await waitFor(() =>
      expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["handleRewards", "stakeGmx", "deposit"])
    );
    expect(mockReadContract).not.toHaveBeenCalled();
  });

  it("reads unresolved allowance after claiming before deciding whether to approve", async () => {
    const rewardData = {
      ...baseData,
      walletGmxBalance: 100n * TOKEN_UNIT,
      walletEsGmxBalance: 20n * TOKEN_UNIT,
      claimableEsGmxRewards: 80n * TOKEN_UNIT,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
    };
    const claimedData = {
      ...rewardData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      claimableEsGmxRewards: 0n,
    };
    const stakedData = {
      ...claimedData,
      walletGmxBalance: 0n,
      stakedGmxBalance: 100n * TOKEN_UNIT,
      freePairAmount: 100n * TOKEN_UNIT,
    };
    mockUseTokensAllowanceData.mockReturnValue({
      isLoading: true,
      isLoaded: false,
    });
    mockReadContract.mockResolvedValue(100n * TOKEN_UNIT);
    mockCallContract
      .mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any)
      .mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any)
      .mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    mutate
      .mockResolvedValueOnce(rewardData)
      .mockResolvedValueOnce(claimedData)
      .mockResolvedValueOnce(claimedData)
      .mockResolvedValue(stakedData);
    render(
      getVestModal(rewardData, true, undefined, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() =>
      expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["handleRewards", "stakeGmx", "deposit"])
    );
    expect(mockGetPublicClientWithRpc).toHaveBeenCalledWith(ARBITRUM);
    expect(mockReadContract).toHaveBeenCalledWith({
      address: getContract(ARBITRUM, "GMX"),
      abi: expect.any(Array),
      functionName: "allowance",
      args: ["0x123", getContract(ARBITRUM, "StakedGmxTracker")],
    });
  });

  it("claims pending esGMX and then starts vesting from one click", async () => {
    const claimWait = vi.fn(async () => undefined);
    const vestWait = vi.fn(async () => undefined);
    const rewardData = {
      ...baseData,
      walletEsGmxBalance: 20n * TOKEN_UNIT,
      claimableEsGmxRewards: 80n * TOKEN_UNIT,
    };
    const claimedData = {
      ...rewardData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      claimableEsGmxRewards: 0n,
    };
    mockCallContract.mockResolvedValueOnce({ wait: claimWait } as any).mockResolvedValueOnce({ wait: vestWait } as any);
    mutate.mockResolvedValueOnce(rewardData).mockResolvedValue(claimedData);
    render(
      getVestModal(rewardData, true, undefined, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
      })
    );

    expect(screen.queryByText("Claim esGMX rewards")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls[0][2]).toBe("handleRewards");
    expect(mockCallContract.mock.calls[0][3]).toEqual([false, false, true, false, true, false, false]);
    expect(mockCallContract.mock.calls[1][2]).toBe("deposit");
    expect(claimWait).toHaveBeenCalledTimes(1);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(setIsVisible).not.toHaveBeenCalled();
    expect(screen.getByText("esGMX claimed")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
  });

  it("keeps the modal open and continues after claiming is rejected", async () => {
    const claimWait = vi.fn(async () => undefined);
    const vestWait = vi.fn(async () => undefined);
    const rewardData = {
      ...baseData,
      walletEsGmxBalance: 20n * TOKEN_UNIT,
      claimableEsGmxRewards: 80n * TOKEN_UNIT,
    };
    const claimedData = {
      ...rewardData,
      walletEsGmxBalance: 100n * TOKEN_UNIT,
      claimableEsGmxRewards: 0n,
    };
    mutate.mockResolvedValueOnce(rewardData).mockResolvedValueOnce(rewardData).mockResolvedValue(claimedData);
    mockCallContract
      .mockRejectedValueOnce(new Error("Claim rejected"))
      .mockResolvedValueOnce({ wait: claimWait } as any)
      .mockResolvedValueOnce({ wait: vestWait } as any);
    render(
      getVestModal(rewardData, true, undefined, {
        claimableEsGmxAmount: rewardData.claimableEsGmxRewards,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() =>
      expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
        transaction: "ClaimEsGmx",
        result: "Fail",
        amount: 80n * TOKEN_UNIT,
      })
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["handleRewards"]);
    expect(screen.getByRole("dialog", { name: "Vest esGMX" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDefined();
    expect(screen.getByText("Claim esGMX rewards")).toBeDefined();
    expect(setIsVisible).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["handleRewards", "handleRewards", "deposit"])
    );
    expect(claimWait).toHaveBeenCalledTimes(1);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
  });

  it("vests wallet esGMX directly when there are no pending rewards to claim", () => {
    const walletOnlyData = {
      ...baseData,
      claimableEsGmxRewards: 0n,
    };

    render(
      getVestModal(walletOnlyData, true, undefined, {
        claimableEsGmxAmount: 0n,
      })
    );

    expect(screen.getByText("Vestable: 100 esGMX")).toBeDefined();
    expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined();
    expect(screen.queryByText("Claim esGMX rewards")).toBeNull();
  });

  it("refreshes the vesting preview before a direct deposit", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
    mutate.mockResolvedValueOnce(baseData).mockResolvedValueOnce(baseData);
    renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mutate.mock.invocationCallOrder[0]).toBeLessThan(mockCallContract.mock.invocationCallOrder[0]);
    expect(mockCallContract.mock.calls[0][2]).toBe("deposit");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(setIsVisible).toHaveBeenCalledWith(false);
    expect(setIsVisible.mock.invocationCallOrder[0]).toBeLessThan(mutate.mock.invocationCallOrder[1]);
  });

  it("does not deposit when the refreshed funding preview changed", async () => {
    mutate.mockResolvedValueOnce({
      ...baseData,
      walletGmxBalance: 10n * TOKEN_UNIT,
      freePairAmount: 90n * TOKEN_UNIT,
    });
    renderVestModal(baseData);

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
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

  it("approves, stakes, and vests sequentially from one click", async () => {
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
    let resolveApproval: (() => void) | undefined;
    const approvalWait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveApproval = resolve;
        })
    );
    const stakeWait = vi.fn(async () => undefined);
    const vestWait = vi.fn(async () => undefined);
    mockCallContract
      .mockResolvedValueOnce({ wait: approvalWait })
      .mockResolvedValueOnce({ wait: stakeWait })
      .mockResolvedValueOnce({ wait: vestWait });
    mutate.mockResolvedValueOnce(initialData).mockResolvedValue(refreshedData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["approve"]);
    expect(stakeWait).not.toHaveBeenCalled();
    expect(vestWait).not.toHaveBeenCalled();

    await act(async () => resolveApproval?.());
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(3));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["approve", "stakeGmx", "deposit"]);
    expect(approvalWait).toHaveBeenCalledTimes(1);
    expect(stakeWait).toHaveBeenCalledTimes(1);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(screen.getByText("GMX approved")).toBeDefined();
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
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
    const button = screen.getByRole("button", { name: "Vest esGMX" });
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
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
    expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined();
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));
    await waitFor(() => expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);

    resolveFirstApproval?.();
    await waitFor(() => expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);

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
    let resolveStake: (() => void) | undefined;
    const stakePromise = new Promise<void>((resolve) => {
      resolveStake = resolve;
    });
    const stakeWait = vi.fn(() => stakePromise);
    const vestWait = vi.fn(async () => undefined);
    mockUseTokensAllowanceData.mockReturnValue({
      tokensAllowanceData: { [getContract(ARBITRUM, "GMX")]: 100n * TOKEN_UNIT },
      isLoading: false,
      isLoaded: true,
    });
    mockCallContract.mockResolvedValueOnce({ wait: stakeWait } as any).mockResolvedValueOnce({ wait: vestWait } as any);
    mutate.mockResolvedValueOnce(initialData).mockResolvedValue(refreshedData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx"]);
    expect(stakeWait).toHaveBeenCalledTimes(1);
    expect(vestWait).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledTimes(1);

    await act(async () => resolveStake?.());
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined());
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByText("Vesting started")).toBeDefined();
    expect(screen.getAllByText("Completed")).toHaveLength(2);
    expect(setIsVisible).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Close", { selector: "button.primary" }));
    expect(setIsVisible).toHaveBeenCalledWith(false);
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));

    mockUseWallet.mockReturnValue({
      account: "0x456",
      active: true,
      chainId: ARBITRUM,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(baseData));
    await waitFor(() => expect(screen.getByRole("button", { name: "Vest esGMX" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);

    resolveFirstVest?.();
    await waitFor(() => expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Vest esGMX" }).hasAttribute("disabled")).toBe(true);
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("100");
    expect(setIsVisible).not.toHaveBeenCalled();

    resolveSecondVest?.();
    await waitFor(() => expect(setIsVisible).toHaveBeenCalledWith(false));
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx"]);
  });

  it("does not deposit when the wallet chain changes and returns during the collateral refresh", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));

    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: AVALANCHE,
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));

    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
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

  it("does not deposit when the wallet connector changes during the collateral refresh", async () => {
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
    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      connector: { uid: "connector-a" },
      signer: {},
    } as ReturnType<typeof useWallet>);
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));

    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      connector: { uid: "connector-b" },
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));

    mockUseWallet.mockReturnValue({
      account: "0x123",
      active: true,
      chainId: ARBITRUM,
      connector: { uid: "connector-a" },
      signer: {},
    } as ReturnType<typeof useWallet>);
    view.rerender(getVestModal(initialData));
    resolveMutate?.(refreshedData);

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked. Review the updated collateral and continue vesting."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx"]);
  });

  it("does not deposit after the vesting modal unmounts during the post-stake refresh", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));

    view.unmount();
    await act(async () => {
      resolveMutate?.(refreshedData);
      await Promise.resolve();
    });

    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx"]);
  });

  it("continues from vesting when staking succeeds but vesting is rejected", async () => {
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
      .mockRejectedValueOnce(new Error("Deposit rejected"))
      .mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
    const refreshedData = {
      ...initialData,
      freePairAmount: 100n * TOKEN_UNIT,
      walletGmxBalance: 0n,
    };
    mutate.mockResolvedValueOnce(initialData).mockResolvedValue(refreshedData);
    const view = renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked, but vesting did not start. Review the updated collateral and try again."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
    expect(screen.getByText("Collateral staked")).toBeDefined();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDefined();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("100");
    expect(setIsVisible).not.toHaveBeenCalled();
    expect(mockSendRewardsTransactionResultEvent).toHaveBeenCalledWith({
      transaction: "StartVesting",
      result: "PartialSuccess",
      amount: 100n * TOKEN_UNIT,
    });

    view.rerender(getVestModal(refreshedData));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit", "deposit"])
    );
    expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined();
    expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("");
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
    expectBlueNotification(screen.getByText(/Your 50 GMX collateral will be unlocked/));
    expect(screen.getByText("Stop vesting 100% of these rewards?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Yes, stop vesting" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Keep vesting" })).toBeDefined();
  });

  it("simulates stopping without a connected wallet", async () => {
    const onSimulatedStop = vi.fn(async () => undefined);
    mockUseWallet.mockReturnValue({
      active: false,
      chainId: AVALANCHE,
    } as ReturnType<typeof useWallet>);
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

    render(getStopModal(activeData, onSimulatedStop));
    const button = screen.getByRole("button", { name: "Yes, stop vesting" });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);

    await waitFor(() => expect(onSimulatedStop).toHaveBeenCalledTimes(1));
    expect(setIsVisible).toHaveBeenCalledWith(false);
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("keeps the stop modal open when a simulated wallet request is rejected", async () => {
    const onSimulatedStop = vi.fn(async () => {
      throw new Error("Simulated transaction rejected.");
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

    render(getStopModal(activeData, onSimulatedStop));
    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() => expect(onSimulatedStop).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Yes, stop vesting" })).toBeDefined();
    expect(setIsVisible).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
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
