import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { SOLANA_NETWORK_ID } from "config/chains";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { GmxSdkProvider } from "context/GmxSdkContext/GmxSdkContext";
import { publishSolanaWalletSession } from "lib/solana/activeSession";

import type { OrderLifecycleResult, TrackedOrderAction } from "./reduceOrderLifecycle";
import { useSolanaOrderNotifications } from "./useSolanaOrderNotifications";

const fakes = vi.hoisted(() => ({
  refresh: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
  dismiss: vi.fn(),
  update: vi.fn(),
  toasts: [] as { content: unknown; options: { toastId: number; onClose?: () => void } }[],
  watching: undefined as { signal: AbortSignal; onUpdate: (result: unknown) => void; finish: () => void } | undefined,
}));
vi.mock("react-toastify", () => ({
  toast: Object.assign(
    (content: unknown, options: { toastId: number; onClose?: () => void }) => {
      fakes.toasts.push({ content, options });
    },
    { dismiss: fakes.dismiss, update: fakes.update, isActive: () => true }
  ),
}));
vi.mock("./watchSubmittedOrders", () => ({
  watchSubmittedOrders: ({ signal, onUpdate }: { signal: AbortSignal; onUpdate: (result: unknown) => void }) =>
    new Promise<void>((resolve) => {
      fakes.watching = { signal, onUpdate, finish: resolve };
    }),
}));
vi.mock("../useGmsolAccountData", () => ({
  refreshGmsolAccountDataAfterTransaction: (...args: unknown[]) => fakes.refresh(...args),
}));

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  publishSolanaWalletSession({ address: "wallet-A" });
  fakes.toasts.length = 0;
  fakes.watching = undefined;
  fakes.refresh.mockClear();
  fakes.dismiss.mockClear();
  fakes.update.mockClear();
});
afterEach(() => {
  fakes.watching?.finish();
  cleanup();
  publishSolanaWalletSession(undefined);
  setAbFlagEnabled("solanaNetwork", false);
  vi.useRealTimers();
});
function mount() {
  let value!: ReturnType<typeof useSolanaOrderNotifications>;
  function Probe() {
    value = useSolanaOrderNotifications();
    return null;
  }
  const view = render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  return {
    begin: (trackExecution: boolean) =>
      value.begin({ owner: "wallet-A", operation: "create", orders: [], trackExecution }),
    unmount: view.unmount,
  };
}
const latestToast = () => fakes.toasts[fakes.toasts.length - 1];
// Renders the latest toast as the ToastContainer does: apart from the consumer that opened it.
function showToast() {
  const { content, options } = latestToast();
  render(<I18nProvider i18n={i18n}>{content as ReactElement}</I18nProvider>);
  return options;
}
function selectSolana(isSelected: boolean) {
  setIsSolanaNetworkSelected(isSelected);
  document.dispatchEvent(
    new CustomEvent("networkChange", { detail: { chainId: isSelected ? SOLANA_NETWORK_ID : 42161 } })
  );
}
const order: TrackedOrderAction = {
  network: "solana-mainnet",
  program: "program",
  store: "store",
  owner: "wallet-A",
  order: "order",
  actionId: 1n,
  market: "market",
  position: "position",
  kind: "MarketIncrease",
  creationSignature: "creation",
};
const executed = {
  action: order,
  execution: "executed",
  trade: { signature: "execution", event: { fields: { slot: 42n } } },
};

describe("Solana order notification lifecycle", () => {
  it("keeps an unresolved toast open, marks a keeper cancel as an error and closes it once settled", () => {
    vi.useFakeTimers();
    const view = mount();
    const notification = view.begin(true);
    const { toastId } = showToast();
    act(() => notification.submitted({ signatures: ["creation"], orders: [order] }));
    act(() =>
      fakes.watching!.onUpdate({
        action: order,
        submission: "submitted",
        execution: "unresolved",
        closure: "pending",
      } satisfies OrderLifecycleResult)
    );
    act(() => vi.advanceTimersByTime(TOAST_AUTO_CLOSE_TIME));
    expect(fakes.dismiss).not.toHaveBeenCalledWith(toastId);
    act(() =>
      fakes.watching!.onUpdate({
        action: order,
        submission: "submitted",
        execution: "cancelled",
        closure: "closed",
        reason: "executed",
      } satisfies OrderLifecycleResult)
    );
    expect(fakes.update).toHaveBeenCalledWith(toastId, { type: "error" });
    act(() => vi.advanceTimersByTime(TOAST_AUTO_CLOSE_TIME));
    expect(fakes.dismiss).toHaveBeenCalledWith(toastId);
  });

  it("ends tracking on a wallet or network change, even one switched back, and never reopens a toast", async () => {
    for (const close of ["wallet", "network", "dismiss", "unmount"] as const) {
      const view = mount();
      const notification = view.begin(true);
      const { toastId, onClose } = latestToast().options;
      act(() => notification.submitted({ signatures: ["creation"], orders: [order] }));
      const tracking = fakes.watching!;
      if (close === "wallet") {
        act(() => publishSolanaWalletSession({ address: "wallet-B" }));
        act(() => publishSolanaWalletSession({ address: "wallet-A" }));
      }
      if (close === "network") {
        act(() => selectSolana(false));
        act(() => selectSolana(true));
      }
      if (close === "dismiss") act(() => onClose!());
      if (close === "unmount") view.unmount();
      const isSessionEnded = close === "wallet" || close === "network";
      expect(tracking.signal.aborted).toBe(isSessionEnded);
      expect(fakes.dismiss.mock.calls.some(([id]) => id === toastId)).toBe(isSessionEnded);
      act(() => tracking.onUpdate(executed));
      expect(fakes.refresh).toHaveBeenCalledTimes(isSessionEnded ? 0 : 1);
      const count = fakes.toasts.length;
      act(() => notification.failed(new Error("late failure")));
      expect(fakes.toasts.length).toBe(count);
      await act(async () => tracking.finish());
      cleanup();
      fakes.refresh.mockClear();
      fakes.dismiss.mockClear();
    }
  });
});
