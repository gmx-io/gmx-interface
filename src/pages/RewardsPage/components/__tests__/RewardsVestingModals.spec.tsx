import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { maxUint256 } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, type ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { expandDecimals } from "lib/numbers";
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
const GMX = getContract(ARBITRUM, "GMX");
const STAKED_GMX_TRACKER = getContract(ARBITRUM, "StakedGmxTracker");
const REWARD_ROUTER = getContract(ARBITRUM, "RewardRouter");
const GMX_VESTER = getContract(ARBITRUM, "GmxVester");
const CLAIM_ES_GMX_ARGS = [false, false, true, false, true, false, false];
const mockUseTokensAllowanceData = vi.mocked(useTokensAllowanceData);
const mockUseGovTokenAmount = vi.mocked(useGovTokenAmount);
const mockUseGovTokenDelegates = vi.mocked(useGovTokenDelegates);
const mockUseMultipleWalletExtensionsChainError = vi.mocked(useMultipleWalletExtensionsChainError);
const mockUseWallet = vi.mocked(useWallet);
const mockCallContract = vi.mocked(callContract);
const mockHelperToastInfo = vi.mocked(helperToast.info);
const mutate = vi.fn(async (): Promise<RewardsVestingData | undefined> => undefined);
const setIsVisible = vi.fn();
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
const stakeData = { ...baseData, freePairAmount: 0n, walletGmxBalance: 100n * TOKEN_UNIT };
const stakedData = { ...stakeData, freePairAmount: 100n * TOKEN_UNIT, walletGmxBalance: 0n };
const claimData = { ...baseData, walletEsGmxBalance: 20n * TOKEN_UNIT, claimableEsGmxRewards: 80n * TOKEN_UNIT };
const claimedData = { ...claimData, walletEsGmxBalance: 100n * TOKEN_UNIT, claimableEsGmxRewards: 0n };
const claimStakeData = { ...claimData, walletGmxBalance: 100n * TOKEN_UNIT, stakedGmxBalance: 0n, freePairAmount: 0n };
const claimedStakeData = { ...claimStakeData, walletEsGmxBalance: 100n * TOKEN_UNIT, claimableEsGmxRewards: 0n };
const activeData: RewardsVestingData = {
  ...baseData,
  vestingInfo: {
    ...baseData.vestingInfo,
    pairAmount: 50n * TOKEN_UNIT,
    vestedAmount: 100n * TOKEN_UNIT,
    escrowedBalance: 50n * TOKEN_UNIT,
    claimedAmounts: 50n * TOKEN_UNIT,
  },
};

i18n.load({ en: {} });
i18n.activate("en");

function getVestModal(data: RewardsVestingData, { isVisible = true, claimableEsGmxAmount = 0n } = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsVestingModal
        chainId={ARBITRUM}
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        data={data}
        mutate={mutate}
        onBuyGmx={vi.fn()}
        claimableEsGmxAmount={claimableEsGmxAmount}
      />
    </I18nProvider>
  );
}

function getStopModal(data: RewardsVestingData, chainId: ContractsChainId = ARBITRUM) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsStopVestingModal chainId={chainId} isVisible setIsVisible={setIsVisible} data={data} mutate={mutate} />
    </I18nProvider>
  );
}

function setWallet(overrides: Partial<ReturnType<typeof useWallet>> = {}) {
  mockUseWallet.mockReturnValue({
    account: "0x123",
    active: true,
    chainId: ARBITRUM,
    signer: {},
    ...overrides,
  } as ReturnType<typeof useWallet>);
}

function setGmxAllowance(amount: bigint) {
  mockUseTokensAllowanceData.mockReturnValue({
    tokensAllowanceData: { [GMX]: amount },
    isLoading: false,
    isLoaded: true,
  });
}

function setMutateSequence(sequence: RewardsVestingData[]) {
  sequence.slice(0, -1).forEach((data) => mutate.mockResolvedValueOnce(data));
  mutate.mockResolvedValue(sequence.at(-1));
}

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

function transactions() {
  return mockCallContract.mock.calls.map(([chainId, contract, method, params]) => [
    chainId,
    (contract as unknown as { address: string }).address,
    method,
    params,
  ]);
}

function methods() {
  return mockCallContract.mock.calls.map((call) => call[2]);
}

type InterruptCase = {
  name: string;
  data?: RewardsVestingData;
  allowance?: "rpc";
  pending: "signature" | "receipt" | "refresh" | "post-stake refresh";
  interrupt: "close" | "escape" | "backdrop" | "account" | "undelegate" | "chain" | "connector" | "unmount";
  methods?: string[];
  toast?: string;
};

function clickVest() {
  fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
}

describe("RewardsVestingModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseGovTokenAmount.mockReturnValue(0n);
    mockUseGovTokenDelegates.mockReturnValue(DELEGATE_ADDRESS);
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    setWallet();
    mockReadContract.mockResolvedValue(0n);
    vi.mocked(getPublicClientWithRpc).mockReturnValue({ readContract: mockReadContract } as any);
    mockUseTokensAllowanceData.mockReturnValue({ tokensAllowanceData: {}, isLoading: false, isLoaded: true });
    mockCallContract.mockImplementation(async () => ({ wait: vi.fn(async () => undefined) }) as any);
  });

  afterEach(cleanup);

  it.each([
    {
      name: "deposits directly when free collateral covers the vest",
      data: baseData,
      refreshes: [baseData],
      expected: [[ARBITRUM, GMX_VESTER, "deposit", [100n * TOKEN_UNIT]]],
      closes: true,
    },
    {
      name: "claims pending esGMX before depositing",
      data: claimData,
      claimableEsGmxAmount: 80n * TOKEN_UNIT,
      refreshes: [claimData, claimedData],
      expected: [
        [ARBITRUM, REWARD_ROUTER, "handleRewards", CLAIM_ES_GMX_ARGS],
        [ARBITRUM, GMX_VESTER, "deposit", [100n * TOKEN_UNIT]],
      ],
    },
    {
      name: "approves GMX, stakes the shortfall, and deposits",
      data: stakeData,
      refreshes: [stakeData, stakedData],
      readsAllowance: true,
      expected: [
        [ARBITRUM, GMX, "approve", [STAKED_GMX_TRACKER, maxUint256]],
        [ARBITRUM, REWARD_ROUTER, "stakeGmx", [100n * TOKEN_UNIT]],
        [ARBITRUM, GMX_VESTER, "deposit", [100n * TOKEN_UNIT]],
      ],
    },
    {
      name: "stakes with an existing approval and deposits",
      data: stakeData,
      gmxAllowance: 100n * TOKEN_UNIT,
      refreshes: [stakeData, stakedData],
      expected: [
        [ARBITRUM, REWARD_ROUTER, "stakeGmx", [100n * TOKEN_UNIT]],
        [ARBITRUM, GMX_VESTER, "deposit", [100n * TOKEN_UNIT]],
      ],
    },
    {
      name: "claims, reads the unresolved allowance onchain, stakes, and deposits",
      data: claimStakeData,
      claimableEsGmxAmount: 80n * TOKEN_UNIT,
      rpcAllowance: 100n * TOKEN_UNIT,
      readsAllowance: true,
      refreshes: [claimStakeData, claimedStakeData, claimedStakeData, { ...claimedStakeData, ...stakedData }],
      expected: [
        [ARBITRUM, REWARD_ROUTER, "handleRewards", CLAIM_ES_GMX_ARGS],
        [ARBITRUM, REWARD_ROUTER, "stakeGmx", [100n * TOKEN_UNIT]],
        [ARBITRUM, GMX_VESTER, "deposit", [100n * TOKEN_UNIT]],
      ],
    },
  ])(
    "$name",
    async ({ data, claimableEsGmxAmount, gmxAllowance, rpcAllowance, readsAllowance, refreshes, expected, closes }) => {
      if (gmxAllowance !== undefined) setGmxAllowance(gmxAllowance);
      if (rpcAllowance !== undefined) mockReadContract.mockResolvedValue(rpcAllowance);
      setMutateSequence(refreshes);
      // Receipts confirm on a later macrotask, so a step that skips awaiting one sends the next call first.
      const events: string[] = [];
      mockCallContract.mockImplementation(async (...[, , method]) => {
        events.push(`send:${method}`);
        const wait = () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              events.push(`confirm:${method}`);
              resolve();
            })
          );
        return { wait } as any;
      });
      render(getVestModal(data, { claimableEsGmxAmount }));

      clickVest();

      await waitFor(() =>
        closes
          ? expect(setIsVisible).toHaveBeenCalledWith(false)
          : expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined()
      );
      expect(transactions()).toEqual(expected);
      if (closes) {
        expect(mutate.mock.invocationCallOrder[0]).toBeLessThan(mockCallContract.mock.invocationCallOrder[0]);
      }
      expect(events).toEqual(expected.flatMap(([, , method]) => [`send:${method}`, `confirm:${method}`]));
      if (!closes) expect(setIsVisible).not.toHaveBeenCalled();
      if (readsAllowance) {
        expect(mockReadContract).toHaveBeenCalledWith({
          address: GMX,
          abi: expect.any(Array),
          functionName: "allowance",
          args: ["0x123", STAKED_GMX_TRACKER],
        });
      } else {
        expect(mockReadContract).not.toHaveBeenCalled();
      }
    }
  );

  it.each([
    {
      name: "the governance amount is unavailable",
      setup: () => mockUseGovTokenAmount.mockReturnValue(undefined),
      data: stakeData,
      button: "Loading...",
    },
    { name: "the signer is unavailable", setup: () => setWallet({ signer: undefined }), data: baseData },
    {
      name: "wallet extensions are on different networks",
      setup: () =>
        mockUseMultipleWalletExtensionsChainError.mockReturnValue({
          buttonErrorMessage: "Transaction blocked",
          buttonTooltipMessage: "Wallet extensions are on different networks.",
        }),
      data: baseData,
      button: "Transaction blocked",
    },
    {
      name: "staking would leave GMX voting power undelegated",
      setup: () => {
        mockUseGovTokenAmount.mockReturnValue(100n * TOKEN_UNIT);
        mockUseGovTokenDelegates.mockReturnValue(NATIVE_TOKEN_ADDRESS);
        setGmxAllowance(100n * TOKEN_UNIT);
      },
      data: stakeData,
    },
  ])("blocks vesting when $name", ({ setup, data, button = "Vest esGMX" }) => {
    setup();
    render(getVestModal(data));

    const vestButton = screen.getByRole("button", { name: button });
    expect(vestButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(vestButton);
    expect(mutate).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "the refreshed funding preview changed",
      data: baseData,
      refreshes: [{ ...baseData, walletGmxBalance: 10n * TOKEN_UNIT, freePairAmount: 90n * TOKEN_UNIT }],
      methods: [],
      toast: "Vesting details changed. Review the updated collateral and continue vesting.",
    },
    {
      name: "the account still lacks collateral after staking",
      data: stakeData,
      refreshes: [stakeData, { ...stakeData, walletGmxBalance: 0n }],
      methods: ["stakeGmx"],
      toast: "GMX was staked. Review the updated collateral and continue vesting.",
    },
    {
      name: "the collateral preview materially changes after staking",
      data: stakeData,
      refreshes: [
        stakeData,
        {
          ...stakedData,
          stakedGmxBalance: 200n * TOKEN_UNIT,
          freePairAmount: 200n * TOKEN_UNIT,
          vestingInfo: { ...stakeData.vestingInfo, averageStakedAmount: 200n * TOKEN_UNIT },
        },
      ],
      methods: ["stakeGmx"],
      toast: "GMX was staked. Review the updated collateral and continue vesting.",
    },
  ])("does not deposit when $name", async ({ data, refreshes, methods: expectedMethods, toast }) => {
    setGmxAllowance(100n * TOKEN_UNIT);
    setMutateSequence(refreshes);
    render(getVestModal(data));

    clickVest();

    await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalledWith(toast));
    expect(methods()).toEqual(expectedMethods);
  });

  it.each<InterruptCase>([
    { name: "the close button", pending: "signature", interrupt: "close" },
    { name: "Escape", pending: "signature", interrupt: "escape" },
    { name: "the backdrop", pending: "signature", interrupt: "backdrop" },
    {
      name: "an account change during the preflight refresh",
      data: baseData,
      pending: "refresh",
      interrupt: "account",
      methods: [],
      toast: "Wallet or network changed. Review the updated collateral and continue vesting.",
    },
    {
      name: "GMX delegation lapsing during the preflight refresh",
      pending: "refresh",
      interrupt: "undelegate",
      methods: [],
    },
    {
      name: "an account change while the approval confirms",
      allowance: "rpc",
      pending: "receipt",
      interrupt: "account",
      toast: "GMX was approved. Reconnect the original wallet to continue.",
    },
    {
      name: "an account change while the deposit confirms",
      data: baseData,
      pending: "receipt",
      interrupt: "account",
      methods: ["deposit"],
    },
    {
      name: "the wallet chain changing and returning during the post-stake refresh",
      pending: "post-stake refresh",
      interrupt: "chain",
      methods: ["stakeGmx"],
      toast: "GMX was staked. Review the updated collateral and continue vesting.",
    },
    {
      name: "the connector changing and returning during the post-stake refresh",
      pending: "post-stake refresh",
      interrupt: "connector",
      methods: ["stakeGmx"],
      toast: "GMX was staked. Review the updated collateral and continue vesting.",
    },
    {
      name: "unmounting during the post-stake refresh",
      pending: "post-stake refresh",
      interrupt: "unmount",
      methods: ["stakeGmx"],
    },
  ])("does not continue after $name", async (testCase) => {
    const data = testCase.data ?? stakeData;
    const isClose = ["close", "escape", "backdrop"].includes(testCase.interrupt);
    if (testCase.allowance === undefined && !isClose) setGmxAllowance(100n * TOKEN_UNIT);
    if (testCase.interrupt === "connector") setWallet({ connector: { uid: "connector-a" } as any });
    const receipt = { wait: vi.fn(async () => undefined) };
    let resolvePending!: () => void;
    if (testCase.pending === "signature") {
      mockCallContract.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePending = () => resolve(receipt as any);
        })
      );
    } else if (testCase.pending === "receipt") {
      const confirmation = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
      mockCallContract.mockResolvedValueOnce({ wait: () => confirmation } as any);
      mutate.mockResolvedValue(data);
    } else {
      if (testCase.pending === "post-stake refresh") mutate.mockResolvedValueOnce(data);
      const resolveRefresh = deferMutate();
      resolvePending = () => resolveRefresh(testCase.pending === "refresh" ? data : stakedData);
    }
    const view = render(getVestModal(data));
    clickVest();
    await waitFor(() =>
      testCase.pending === "refresh" || testCase.pending === "post-stake refresh"
        ? expect(mutate).toHaveBeenCalledTimes(testCase.pending === "refresh" ? 1 : 2)
        : expect(mockCallContract).toHaveBeenCalledTimes(1)
    );

    const rerender = () => view.rerender(getVestModal(data));
    switch (testCase.interrupt) {
      case "close":
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        break;
      case "escape":
        fireEvent.keyDown(window, { key: "Escape" });
        break;
      case "backdrop":
        fireEvent.click(document.querySelector(".Modal-backdrop")!);
        break;
      case "account":
        setWallet({ account: "0x456" });
        rerender();
        break;
      case "undelegate":
        mockUseGovTokenAmount.mockReturnValue(100n * TOKEN_UNIT);
        mockUseGovTokenDelegates.mockReturnValue(NATIVE_TOKEN_ADDRESS);
        rerender();
        break;
      case "chain":
        setWallet({ chainId: AVALANCHE });
        rerender();
        setWallet();
        rerender();
        break;
      case "connector":
        setWallet({ connector: { uid: "connector-b" } as any });
        rerender();
        setWallet({ connector: { uid: "connector-a" } as any });
        rerender();
        break;
      case "unmount":
        view.unmount();
        break;
    }
    if (isClose) {
      expect(setIsVisible).toHaveBeenCalledWith(false);
      view.rerender(getVestModal(data, { isVisible: false }));
    }
    await act(async () => resolvePending());

    if (testCase.toast) await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalledWith(testCase.toast));
    else if (isClose) expect(mockHelperToastInfo).not.toHaveBeenCalled();
    expect(methods()).toEqual(testCase.methods ?? ["approve"]);
    if (isClose) {
      expect(receipt.wait).not.toHaveBeenCalled();
      expect(mutate).not.toHaveBeenCalled();
    }
    expect(setIsVisible).toHaveBeenCalledTimes(isClose ? 1 : 0);
  });

  it.each([
    {
      name: "a rejected claim",
      data: claimData,
      claimableEsGmxAmount: 80n * TOKEN_UNIT,
      refreshes: [claimData, claimData, claimedData],
      rejectedCall: 0,
      interruptedMethods: ["handleRewards"],
      finalMethods: ["handleRewards", "handleRewards", "deposit"],
    },
    {
      name: "a rejected deposit after staking",
      data: stakeData,
      refreshes: [stakeData, stakedData],
      rejectedCall: 1,
      interruptedMethods: ["stakeGmx", "deposit"],
      finalMethods: ["stakeGmx", "deposit", "deposit"],
      toast: "GMX was staked, but vesting did not start. Review the updated collateral and try again.",
      rerenderWith: stakedData,
    },
  ])(
    "resumes after $name without repeating completed steps",
    async ({
      data,
      claimableEsGmxAmount,
      refreshes,
      rejectedCall,
      interruptedMethods,
      finalMethods,
      toast,
      rerenderWith,
    }) => {
      setGmxAllowance(100n * TOKEN_UNIT);
      setMutateSequence(refreshes);
      for (let call = 0; call < rejectedCall; call++) {
        mockCallContract.mockResolvedValueOnce({ wait: vi.fn(async () => undefined) } as any);
      }
      mockCallContract.mockRejectedValueOnce(new Error("Rejected"));
      const view = render(getVestModal(data, { claimableEsGmxAmount }));

      clickVest();

      await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeDefined());
      expect(methods()).toEqual(interruptedMethods);
      if (toast) expect(mockHelperToastInfo).toHaveBeenCalledWith(toast);
      expect(setIsVisible).not.toHaveBeenCalled();

      if (rerenderWith) view.rerender(getVestModal(rerenderWith, { claimableEsGmxAmount }));
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => expect(screen.getByText("Close", { selector: "button.primary" })).toBeDefined());
      expect(methods()).toEqual(finalMethods);
    }
  );
});

describe("RewardsStopVestingModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({});
    setWallet();
    mockCallContract.mockImplementation(async () => ({ wait: vi.fn(async () => undefined) }) as any);
  });

  afterEach(cleanup);

  it.each<{ chainId: ContractsChainId; vester: string }>([
    { chainId: ARBITRUM, vester: GMX_VESTER },
    { chainId: ARBITRUM_SEPOLIA, vester: getContract(ARBITRUM_SEPOLIA, "SeasonRatioVester") },
  ])("withdraws the active vest from the $chainId vester", async ({ chainId, vester }) => {
    setWallet({ chainId });
    mutate.mockResolvedValue(activeData);
    render(getStopModal(activeData, chainId));

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    await waitFor(() => expect(setIsVisible).toHaveBeenCalledWith(false));
    expect(transactions()).toEqual([[chainId, vester, "withdraw", []]]);
    expect(mutate.mock.invocationCallOrder[0]).toBeLessThan(mockCallContract.mock.invocationCallOrder[0]);
    expect((await mockCallContract.mock.results[0].value).wait).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: "allows stopping when ordinary accrual advances during the refresh",
      refreshed: {
        ...activeData,
        vestingInfo: { ...activeData.vestingInfo, claimable: activeData.vestingInfo.claimable + TOKEN_UNIT / 100n },
      },
      methods: ["withdraw"],
      closes: true,
    },
    {
      name: "does not stop when the refreshed position changed",
      refreshed: {
        ...activeData,
        vestingInfo: { ...activeData.vestingInfo, vestedAmount: 110n * TOKEN_UNIT, escrowedBalance: 60n * TOKEN_UNIT },
      },
      methods: [],
      toast: "Vesting details changed. Review the updated amounts before stopping.",
    },
    {
      name: "does not stop when the account changes during the refresh",
      pending: "refresh",
      methods: [],
      toast: "Wallet or network changed. Review your vesting details before stopping.",
    },
    {
      name: "does not wait for a stop dismissed while awaiting the wallet",
      pending: "signature",
      methods: ["withdraw"],
      closes: true,
    },
  ])("$name", async ({ refreshed, pending, methods: expectedMethods, toast, closes }) => {
    const receipt = { wait: vi.fn(async () => undefined) };
    let resolvePending: (() => void) | undefined;
    if (pending === "refresh") {
      const resolveRefresh = deferMutate();
      resolvePending = () => resolveRefresh(activeData);
    } else {
      mutate.mockResolvedValue(refreshed ?? activeData);
    }
    if (pending === "signature") {
      mockCallContract.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePending = () => resolve(receipt as any);
        })
      );
    }
    const view = render(getStopModal(activeData));

    fireEvent.click(screen.getByRole("button", { name: "Yes, stop vesting" }));

    if (pending === "refresh") {
      await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
      setWallet({ account: "0x456" });
      view.rerender(getStopModal(activeData));
    }
    if (pending === "signature") {
      await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole("button", { name: "Keep vesting" }));
    }
    await act(async () => resolvePending?.());

    if (toast) await waitFor(() => expect(mockHelperToastInfo).toHaveBeenCalledWith(toast));
    else await waitFor(() => expect(setIsVisible).toHaveBeenCalledWith(false));
    expect(methods()).toEqual(expectedMethods);
    expect(setIsVisible).toHaveBeenCalledTimes(closes ? 1 : 0);
    if (pending === "signature") expect(receipt.wait).not.toHaveBeenCalled();
  });

  it("blocks stopping when wallet extensions are on different networks", () => {
    mockUseMultipleWalletExtensionsChainError.mockReturnValue({
      buttonErrorMessage: "Transaction blocked",
      buttonTooltipMessage: "Wallet extensions are on different networks.",
    });
    render(getStopModal(activeData));

    const button = screen.getByRole("button", { name: "Transaction blocked" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });
});
