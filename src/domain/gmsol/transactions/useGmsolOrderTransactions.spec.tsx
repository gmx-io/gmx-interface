import { i18n } from "@lingui/core";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { GmxSdkProvider } from "context/GmxSdkContext/GmxSdkContext";
import { SolanaOrderActionsContext, type SolanaOrderActions } from "domain/solana/solanaOrderActions";
import { publishSolanaWalletSession } from "lib/solana/activeSession";
import type { OrderInfo } from "sdk/utils/orders/types";

import type { GmsolSendResult } from "./sendOrderTransactions";
import type { GmsolOrderAction } from "./types";
import { useGmsolOrderTransactions } from "./useGmsolOrderTransactions";
import { GmsolOrderActionsProvider } from "../orderActions/GmsolOrderActionsProvider";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), send: vi.fn(), sign: vi.fn(), toast: vi.fn() }));
vi.mock("lib/wallets/solanaWalletSession", () => ({
  useSolanaWalletSession: () => ({ address: "owner", signTransaction: mocks.sign }),
}));
vi.mock("react-toastify", () => ({
  toast: Object.assign(mocks.toast, { dismiss: mocks.toast, error: mocks.toast, update: mocks.toast }),
}));
vi.mock("./sendOrderTransactions", () => ({
  prepareGmsolOrderTransactions: (...args: unknown[]) => mocks.prepare(...args),
  sendGmsolOrderTransactions: (...args: unknown[]) => mocks.send(...args),
}));
vi.mock("../useGmsolAccountData", () => ({ refreshGmsolAccountDataAfterTransaction: vi.fn() }));
vi.mock("domain/gmsol/useGmsolWalletBalances", () => ({ getSolanaBalancesKey: vi.fn() }));
vi.mock("../useSolanaTradingEnabled", () => ({
  useSolanaTradingEnabled: () => ({ isSolanaTradingEnabled: true, isLoading: false }),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: () => false }));

const action: GmsolOrderAction = { type: "create", orders: [], atomic: false };
const sent = { signatures: ["sent"] } as unknown as GmsolSendResult;
let state!: ReturnType<typeof useGmsolOrderTransactions>;
let actions: SolanaOrderActions | undefined;
function Probe() {
  state = useGmsolOrderTransactions();
  actions = useContext(SolanaOrderActionsContext);
  return null;
}

// The sender's own checks: sign through the adapter, then send only while the adapter still reports the owner.
function sendAfterSigning() {
  let finishSigning!: () => void;
  mocks.sign.mockReturnValue(new Promise((resolve) => (finishSigning = () => resolve(new Uint8Array()))));
  mocks.prepare.mockResolvedValue({});
  mocks.send.mockImplementation(
    async (p: { getWalletAddress: () => string | undefined; signTransaction: (bytes: Uint8Array) => unknown }) => {
      await p.signTransaction(new Uint8Array());
      if (p.getWalletAddress() !== "owner") throw new Error("Solana session changed before sending");
      return sent;
    }
  );
  return () => act(async () => finishSigning());
}

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  publishSolanaWalletSession({ address: "owner", signTransaction: mocks.sign });
});
afterEach(() => {
  cleanup();
  publishSolanaWalletSession(undefined);
  vi.clearAllMocks();
});

it("keeps a signed TradeBox order sending after the TradeBox remounts mid-sign FESOL-56", async () => {
  const finishSigning = sendAfterSigning();
  const view = render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  const submission = state.acquire("owner")!;
  const result = submission.submit(action);
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  view.unmount();
  render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  expect(state.isSubmitting).toBe(true);
  await finishSigning();
  await expect(result).resolves.toBe(sent);
  act(() => submission.release());
  expect(state.isSubmitting).toBe(false);
});

it("refuses a second submission before the wallet and before any toast FESOL-56", async () => {
  const finishSigning = sendAfterSigning();
  render(
    <GmxSdkProvider>
      <GmsolOrderActionsProvider>
        <Probe />
      </GmsolOrderActionsProvider>
    </GmxSdkProvider>
  );
  const submission = state.acquire("owner")!;
  const result = submission.submit(action);
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  expect(state.acquire("owner")).toBeUndefined();
  // An order this provider cannot change would show an error toast, which also closes the open order toast.
  await expect(actions!.cancelOrders([{} as OrderInfo])).resolves.toBe(false);
  expect(mocks.toast).not.toHaveBeenCalled();
  await finishSigning();
  await expect(result).resolves.toBe(sent);
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  act(() => submission.release());
});

it("drops a signed order after the wallet or the network switches away and back FESOL-56", async () => {
  for (const change of ["wallet", "network"] as const) {
    const finishSigning = sendAfterSigning();
    render(
      <GmxSdkProvider>
        <Probe />
      </GmxSdkProvider>
    );
    const submission = state.acquire("owner")!;
    const result = submission.submit(action);
    await waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
    act(() => {
      if (change === "wallet") {
        publishSolanaWalletSession({ address: "other" });
        publishSolanaWalletSession({ address: "owner", signTransaction: mocks.sign });
      }
      for (const isSelected of change === "network" ? [false, true] : []) {
        setIsSolanaNetworkSelected(isSelected);
        document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: 42161 } }));
      }
    });
    expect(state.isSubmitting).toBe(false);
    const rejected = expect(result).rejects.toThrow("Solana session changed before sending");
    await finishSigning();
    await rejected;
    cleanup();
    vi.clearAllMocks();
  }
});
