import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";
import { getRewardsVestingConfig } from "config/vesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import { RewardsRatioVestingModal } from "../RewardsRatioVestingModal";

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
vi.mock("lib/contracts", () => ({ callContract: vi.fn() }));
vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));
vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({
  useMultipleWalletExtensionsChainError: () => ({}),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: () => false, getPageOutdatedError: () => "Outdated" }));
vi.mock("lib/useCurrentUnixTimestamp", () => ({ useCurrentUnixTimestamp: () => Math.floor(Date.now() / 1000) }));
vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));
vi.mock("lib/helperToast", () => ({ helperToast: { info: vi.fn(), error: vi.fn() } }));

const config = getRewardsVestingConfig(ARBITRUM_SEPOLIA);
if (config.type !== "ratio") throw new Error("Missing Sepolia ratio vester");
const ratioConfig = config;
const U = 10n ** 18n;
const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const signer = {};
const mutate = vi.fn();
const setIsVisible = vi.fn();
const onVestingStarted = vi.fn();
const mockCallContract = vi.mocked(callContract);

const base: RewardsVestingData = {
  walletGmxBalance: 1_000n * U,
  walletEsGmxBalance: 100n * U,
  freePairAmount: 500n * U,
  claimableEsGmxRewards: 0n,
  stakedGmxBalance: 0n,
  vestingDuration: 31536000n,
  vestingInfo: {
    pairAmount: 0n,
    vestedAmount: 0n,
    escrowedBalance: 0n,
    claimedAmounts: 0n,
    claimable: 0n,
    maxVestableAmount: 100n * U,
    averageStakedAmount: 0n,
  },
  ratioVesting: {
    pairRatioFactor: 5n * 10n ** 30n,
    capUsedAmount: 0n,
    unpaidClaimAmount: 0n,
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

const esApproved = { ...base, ratioVesting: { ...base.ratioVesting!, esTokenAllowance: 100n * U } };
const approved = { ...esApproved, ratioVesting: { ...esApproved.ratioVesting, pairTokenAllowance: 500n * U } };

function deferredReceipt() {
  let resolve!: (receipt: { status: number }) => void;
  const promise = new Promise<{ status: number }>((done) => {
    resolve = done;
  });
  return { wait: vi.fn(() => promise), confirm: () => resolve({ status: 1 }) };
}

function transactions() {
  return mockCallContract.mock.calls.map(([, contract, method, params]) => ({ contract, method, params }));
}

function view(data = base, isVisible = true) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsRatioVestingModal
        chainId={ARBITRUM_SEPOLIA}
        config={ratioConfig}
        data={data}
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        mutate={mutate}
        onVestingStarted={onVestingStarted}
      />
    </I18nProvider>
  );
}

function enter(amount = "100") {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: amount } });
}

describe("Sepolia rewards vesting transactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      account: ACCOUNT,
      active: true,
      chainId: ARBITRUM_SEPOLIA,
      signer,
    } as ReturnType<typeof useWallet>);
    mutate.mockResolvedValue(base);
    mockCallContract.mockResolvedValue({ wait: vi.fn().mockResolvedValue({ status: 1 }) } as any);
  });
  afterEach(cleanup);

  it("claims rewards, approves both tokens, and deposits from one Vest click", async () => {
    const data = { ...base, walletEsGmxBalance: 0n, claimableEsGmxRewards: 100n * U };
    mutate
      .mockResolvedValueOnce(data)
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce(esApproved)
      .mockResolvedValue(approved);
    render(view(data));
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(onVestingStarted).toHaveBeenCalledTimes(1));
    expect(transactions()).toEqual([
      { contract: { address: ratioConfig.issuer }, method: "claim", params: [] },
      { contract: { address: ratioConfig.esToken }, method: "approve", params: [ratioConfig.vester, 100n * U] },
      { contract: { address: ratioConfig.pairToken }, method: "approve", params: [ratioConfig.vester, 500n * U] },
      { contract: { address: ratioConfig.vester }, method: "deposit", params: [100n * U] },
    ]);
    expect(setIsVisible).toHaveBeenCalledWith(false);
  });

  it("shows both approval steps and advances only after each receipt confirms", async () => {
    const esReceipt = deferredReceipt();
    const pairReceipt = deferredReceipt();
    const vestReceipt = deferredReceipt();
    mockCallContract
      .mockResolvedValueOnce(esReceipt)
      .mockResolvedValueOnce(pairReceipt)
      .mockResolvedValueOnce(vestReceipt);
    mutate.mockResolvedValueOnce(base).mockResolvedValueOnce(esApproved).mockResolvedValue(approved);
    render(view());
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(esReceipt.wait).toHaveBeenCalled());
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Approve esGMX")).toBeTruthy();
    expect(screen.getByText("Approve sbfGMX")).toBeTruthy();
    expect(screen.getByText("Start vesting")).toBeTruthy();
    expect(within(screen.getByText("Approve esGMX").parentElement!).getByText("In progress")).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Confirming..." }));
    expect(mockCallContract).toHaveBeenCalledTimes(1);

    await act(async () => esReceipt.confirm());
    await waitFor(() => expect(pairReceipt.wait).toHaveBeenCalled());
    expect(mockCallContract).toHaveBeenCalledTimes(2);
    expect(within(screen.getByText("Approve esGMX").parentElement!).getByText("Completed")).toBeTruthy();
    expect(within(screen.getByText("Approve sbfGMX").parentElement!).getByText("In progress")).toBeTruthy();
    expect(onVestingStarted).not.toHaveBeenCalled();

    await act(async () => pairReceipt.confirm());
    await waitFor(() => expect(vestReceipt.wait).toHaveBeenCalled());
    expect(mockCallContract).toHaveBeenCalledTimes(3);
    expect(within(screen.getByText("Approve sbfGMX").parentElement!).getByText("Completed")).toBeTruthy();
    expect(within(screen.getByText("Start vesting").parentElement!).getByText("In progress")).toBeTruthy();
    expect(onVestingStarted).not.toHaveBeenCalled();
    await act(async () => vestReceipt.confirm());
    expect(onVestingStarted).toHaveBeenCalledTimes(1);
  });

  it("resumes after rejection without repeating a confirmed approval", async () => {
    mutate.mockResolvedValueOnce(base).mockResolvedValue(esApproved);
    mockCallContract
      .mockResolvedValueOnce({ wait: vi.fn().mockResolvedValue({ status: 1 }) })
      .mockRejectedValueOnce(new Error("Rejected"));
    render(view());
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy());
    expect(mockCallContract).toHaveBeenCalledTimes(2);
    expect(within(screen.getByText("Approve esGMX").parentElement!).getByText("Completed")).toBeTruthy();
    expect(onVestingStarted).not.toHaveBeenCalled();
    expect(setIsVisible).not.toHaveBeenCalled();

    mutate.mockResolvedValueOnce(esApproved).mockResolvedValue(approved);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(onVestingStarted).toHaveBeenCalledTimes(1));
    expect(transactions().map(({ contract, method }) => [contract, method])).toEqual([
      [{ address: ratioConfig.esToken }, "approve"],
      [{ address: ratioConfig.pairToken }, "approve"],
      [{ address: ratioConfig.pairToken }, "approve"],
      [{ address: ratioConfig.vester }, "deposit"],
    ]);
  });

  it.each([
    { name: "close button while awaiting the wallet", pending: "signature", interrupt: "close" },
    { name: "Escape while awaiting the wallet", pending: "signature", interrupt: "escape" },
    { name: "backdrop while awaiting the wallet", pending: "signature", interrupt: "backdrop" },
    { name: "close while the approval confirms", pending: "receipt", interrupt: "close" },
    { name: "account change while the approval confirms", pending: "receipt", interrupt: "account" },
    { name: "network change while refreshing", pending: "refresh", interrupt: "network" },
  ] as const)("does not continue after $name", async ({ pending, interrupt }) => {
    const receipt = deferredReceipt();
    let resolvePending!: () => void;
    if (pending === "signature") {
      mockCallContract.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePending = () => resolve(receipt);
        })
      );
    } else if (pending === "receipt") {
      mockCallContract.mockResolvedValueOnce(receipt);
      resolvePending = receipt.confirm;
    } else {
      mutate.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePending = () => resolve(base);
        })
      );
    }
    mutate.mockResolvedValue(esApproved);
    const component = render(view());
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    if (pending === "signature") await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(1));
    if (pending === "receipt") await waitFor(() => expect(receipt.wait).toHaveBeenCalled());

    if (interrupt === "close") fireEvent.click(screen.getByRole("button", { name: "Close" }));
    if (interrupt === "escape") fireEvent.keyDown(window, { key: "Escape" });
    if (interrupt === "backdrop") fireEvent.click(document.querySelector(".Modal-backdrop")!);
    if (interrupt === "account" || interrupt === "network") {
      vi.mocked(useWallet).mockReturnValue({
        account: interrupt === "account" ? ratioConfig.issuer : ACCOUNT,
        active: true,
        chainId: interrupt === "network" ? ARBITRUM : ARBITRUM_SEPOLIA,
        signer,
      } as ReturnType<typeof useWallet>);
      component.rerender(view());
    } else {
      expect(setIsVisible).toHaveBeenCalledWith(false);
      component.rerender(view(base, false));
    }
    await act(async () => resolvePending());

    expect(mockCallContract).toHaveBeenCalledTimes(pending === "refresh" ? 0 : 1);
    expect(mutate).toHaveBeenCalledTimes(1);
    if (pending === "signature") expect(receipt.wait).not.toHaveBeenCalled();
    expect(onVestingStarted).not.toHaveBeenCalled();
  });

  it.each([
    { name: "refreshed allowance is stale", setup: () => undefined, calls: 1, toast: "info" },
    {
      name: "transaction is missing",
      setup: () => mockCallContract.mockResolvedValueOnce(undefined),
      refresh: "approved",
      calls: 1,
      toast: undefined,
    },
    {
      name: "receipt fails",
      setup: () => mockCallContract.mockResolvedValueOnce({ wait: async () => ({ status: 0 }) } as any),
      refresh: "approved",
      calls: 1,
      toast: undefined,
    },
    {
      name: "receipt throws",
      setup: () =>
        mockCallContract.mockResolvedValueOnce({
          wait: async () => {
            throw new Error("Reverted");
          },
        } as any),
      refresh: "approved",
      calls: 1,
      toast: undefined,
    },
    {
      name: "refresh fails after approval",
      setup: () => mutate.mockResolvedValueOnce(base).mockRejectedValueOnce(new Error("RPC unavailable")),
      calls: 1,
      toast: "error",
    },
    {
      name: "collateral increases between approvals",
      setup: () =>
        mutate.mockResolvedValueOnce(base).mockResolvedValue({
          ...esApproved,
          freePairAmount: 600n * U,
          ratioVesting: { ...esApproved.ratioVesting, pairRatioFactor: 6n * 10n ** 30n },
        }),
      calls: 1,
      toast: "info",
    },
    {
      name: "lifetime cap is consumed before submission",
      setup: () =>
        mutate.mockResolvedValue({ ...base, ratioVesting: { ...base.ratioVesting!, capUsedAmount: 50n * U } }),
      calls: 0,
      toast: "info",
    },
  ] as const)("pauses for review when the $name", async ({ setup, refresh, calls, toast }) => {
    if (refresh === "approved") mutate.mockResolvedValueOnce(base).mockResolvedValue(approved);
    setup();
    render(view());
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Vest esGMX" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy());
    expect(mockCallContract).toHaveBeenCalledTimes(calls);
    if (toast) expect(helperToast[toast]).toHaveBeenCalled();
    expect(onVestingStarted).not.toHaveBeenCalled();
  });
});
