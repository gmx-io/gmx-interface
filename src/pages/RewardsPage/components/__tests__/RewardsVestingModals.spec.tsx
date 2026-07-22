import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import { RewardsStopVestingModal, RewardsVestingModal } from "../RewardsVestingModals";

vi.mock("domain/synthetics/tokens", () => ({
  useTokensAllowanceData: vi.fn(),
}));

vi.mock("domain/tokens", () => ({
  approveTokens: vi.fn(),
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

vi.mock("lib/helperToast", () => ({
  helperToast: { info: vi.fn() },
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

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainWarning", () => ({
  SwitchToSettlementChainWarning: () => null,
}));

const TOKEN_UNIT = expandDecimals(1, 18);
const mockUseTokensAllowanceData = vi.mocked(useTokensAllowanceData);
const mockUseWallet = vi.mocked(useWallet);
const mockApproveTokens = vi.mocked(approveTokens);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastInfo = vi.mocked(helperToast.info);
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

function renderStopModal(data: RewardsVestingData) {
  return render(
    <I18nProvider i18n={i18n}>
      <RewardsStopVestingModal isVisible setIsVisible={setIsVisible} data={data} mutate={mutate} />
    </I18nProvider>
  );
}

describe("RewardsVestingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockResolvedValue(undefined);
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

  it("requests GMX approval before starting the stake-and-vest sequence", async () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve GMX" }));

    await waitFor(() => expect(mockApproveTokens).toHaveBeenCalledTimes(1));
    expect(mockCallContract).not.toHaveBeenCalled();
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
    mutate.mockResolvedValue(refreshedData);
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
    expect(stakeWait).toHaveBeenCalledTimes(1);
    expect(vestWait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
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
    mutate.mockResolvedValue({
      ...initialData,
      walletGmxBalance: 0n,
    });
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalled());
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    expect(mockCallContract.mock.calls[0][2]).toBe("stakeGmx");
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
    mutate.mockImplementationOnce(
      () =>
        new Promise<RewardsVestingData>((resolve) => {
          resolveMutate = resolve;
        })
    );
    const view = renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));

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
    mutate.mockResolvedValue({
      ...initialData,
      freePairAmount: 100n * TOKEN_UNIT,
      walletGmxBalance: 0n,
    });
    renderVestModal(initialData);

    fireEvent.click(screen.getByRole("button", { name: "Vest 100 esGMX" }));

    await waitFor(() =>
      expect(mockHelperToastInfo).toHaveBeenCalledWith(
        "GMX was staked, but vesting did not start. Review the updated collateral and try again."
      )
    );
    expect(mockCallContract.mock.calls.map((call) => call[2])).toEqual(["stakeGmx", "deposit"]);
  });

  it("shows the old and extended completion dates for an active vest", () => {
    renderVestModal({
      ...baseData,
      freePairAmount: 0n,
      walletGmxBalance: 100n * TOKEN_UNIT,
      vestingInfo: {
        ...baseData.vestingInfo,
        pairAmount: 50n * TOKEN_UNIT,
        vestedAmount: 100n * TOKEN_UNIT,
        escrowedBalance: 50n * TOKEN_UNIT,
        claimedAmounts: 50n * TOKEN_UNIT,
        maxVestableAmount: 200n * TOKEN_UNIT,
        averageStakedAmount: 200n * TOKEN_UNIT,
      },
    });

    expect(screen.getByText(/Adding esGMX extends your current vesting/)).toBeDefined();
    expect(screen.getByText(/instead of/)).toBeDefined();
    expect(screen.getByText(/You need 100 more GMX staked as collateral/)).toBeDefined();
    expect(screen.getByText(/then start vesting/)).toBeDefined();
    expect(screen.getByText("Already staked & free").parentElement?.textContent?.replace(/\s/g, "")).toBe(
      "Alreadystaked&free0GMX"
    );
  });
});

describe("RewardsStopVestingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockResolvedValue(undefined);
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

  it("withdraws the active vest after confirmation", async () => {
    const wait = vi.fn(async () => undefined);
    mockCallContract.mockResolvedValueOnce({ wait } as any);
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

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    expect(mockCallContract.mock.calls[0][2]).toBe("withdraw");
    expect(wait).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
