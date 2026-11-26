import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { SOLANA_NETWORK_ID } from "config/chains";
import { setIsSolanaNetworkSelected } from "config/solanaNetwork";
import { TOAST_AUTO_CLOSE_TIME } from "config/ui";
import { GmxSdkProvider, useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { publishSolanaWalletSession } from "lib/solana/activeSession";

import type { OrderLifecycleResult, TrackedOrderAction } from "./reduceOrderLifecycle";
import { useSolanaOrderNotifications } from "./useSolanaOrderNotifications";
import { GmsolPendingSubmissionError, GmsolSubmissionExpiredError } from "../transactions/pendingSubmission";
import { GmsolInsufficientSolError, GmsolTransactionError } from "../transactions/sendOrderTransactions";

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
  let sdk: ReturnType<typeof useGmxSdk>;
  function Probe() {
    sdk = useGmxSdk(SOLANA_NETWORK_ID);
    value = useSolanaOrderNotifications();
    return null;
  }
  const view = render(
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  return {
    get sdk() {
      return sdk;
    },
    begin: (trackExecution: boolean) =>
      value.begin({ owner: "wallet-A", operation: "create", orders: [], trackExecution }),
    unmount: view.unmount,
  };
}
// Renders the latest toast as the ToastContainer does: apart from the consumer that opened it.
function showToast() {
  const { content, options } = fakes.toasts[fakes.toasts.length - 1];
  const { container } = render(<I18nProvider i18n={i18n}>{content as ReactElement}</I18nProvider>);
  return { ...options, container, toast: within(container) };
}
function selectSolana(isSelected: boolean) {
  setIsSolanaNetworkSelected(isSelected);
  document.dispatchEvent(
    new CustomEvent("networkChange", { detail: { chainId: isSelected ? SOLANA_NETWORK_ID : 42161 } })
  );
}
const UNKNOWN = "Order submission status unknown. Check the transaction before retrying.";
const PREPARED =
  "Your accounts are prepared and any wrapped SOL is now WSOL in your wallet. Submit again to place the order.";
const sent = (
  cause: unknown,
  signatures: string[] = [],
  p: { pending?: string; failed?: string; confirmed?: string[] } = {}
) => new GmsolTransactionError(cause, signatures, p.pending, [], [], p.failed, p.confirmed);
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
  it("separates rejection, known chain failure, confirmed submission and ambiguous broadcast", () => {
    const view = mount();
    const rejection = Object.assign(new Error("Signature declined"), { code: 4001 });
    const failure = new Error("Solana transaction failed");
    const expired = "The transaction expired before it landed. Nothing was executed.";
    const FAILED = "Order request failed";
    for (const [error, text, detail] of [
      [sent(rejection), FAILED, "Transaction canceled"],
      [sent(rejection, ["preparation"], { confirmed: ["preparation"] }), FAILED, PREPARED],
      [sent(failure, ["preparation", "orders"], { failed: "orders", confirmed: ["preparation"] }), FAILED, PREPARED],
      [sent(failure, ["orders"], { failed: "orders" }), FAILED, undefined],
      [
        sent(new GmsolSubmissionExpiredError("orders"), ["preparation"], { confirmed: ["preparation"] }),
        FAILED,
        PREPARED,
      ],
      [sent(new GmsolSubmissionExpiredError("orders")), FAILED, expired],
      [new GmsolSubmissionExpiredError("orders"), FAILED, expired],
      [sent(new GmsolInsufficientSolError()), FAILED, "Not enough SOL for network fees, keeper fees and account rent"],
      [
        sent(new Error("timed out"), ["preparation", "orders"], { pending: "orders", confirmed: ["preparation"] }),
        UNKNOWN,
        undefined,
      ],
      [new GmsolPendingSubmissionError("orders"), UNKNOWN, undefined],
    ] as const) {
      const notification = view.begin(true);
      const { toast } = showToast();
      act(() => notification.failed(error));
      expect(toast.getByText(text)).toBeTruthy();
      if (detail) expect(toast.getByText(detail)).toBeTruthy();
      expect(Boolean(toast.queryByText(PREPARED))).toBe(detail === PREPARED);
      expect(toast.getByText("Show error")).toBeTruthy();
      expect(toast.queryByText("Fulfilling order request...")).toBeNull();
    }
    const notification = view.begin(false);
    const { toast } = showToast();
    act(() => notification.submitted({ signatures: ["confirmed"] }));
    expect(toast.getByText("Order request sent")).toBeTruthy();
    expect(toast.queryByText("Fulfilling order request...")).toBeNull();
    expect(fakes.watching).toBeUndefined();
  });

  it("renders sending, uncertain submission and confirmed execution as distinct stages", () => {
    const view = mount();
    const notification = view.begin(true);
    const { toast, container } = showToast();
    expect(toast.getByText("Sending order request...")).toBeTruthy();
    expect(toast.queryByText("Fulfilling order request...")).toBeNull();
    const reason = "Trading requires frozen or reviewed GMX-owned lookup tables";
    act(() => notification.failed(new Error(reason)));
    expect(toast.getByText("Order request failed")).toBeTruthy();
    expect(toast.queryByText(reason)).toBeNull();
    fireEvent.click(toast.getByText("Show error"));
    expect(toast.getByText(reason)).toBeTruthy();
    act(() => notification.failed(sent(new Error("Confirmation timed out"), [], { pending: "broadcast" })));
    expect(toast.getByText("Confirmation timed out")).toBeTruthy();
    expect(toast.queryByText(reason)).toBeNull();
    expect(toast.getByText(UNKNOWN)).toBeTruthy();
    expect(toast.queryByText("Fulfilling order request...")).toBeNull();
    expect(container.querySelector(".spin")).toBeNull();
    expect(toast.getByRole("link").getAttribute("href")).toContain("tx/broadcast");
    const confirmed = view.begin(true);
    const { toast: confirmedToast } = showToast();
    act(() => confirmed.submitted({ signatures: ["creation"], orders: [order] }));
    expect(confirmedToast.getByText("Order request sent")).toBeTruthy();
    expect(confirmedToast.getByText("Fulfilling order request...")).toBeTruthy();
    expect(confirmedToast.queryByText("Order filled")).toBeNull();
  });

  it("requires outcome evidence, explains a failed execution and closes only a settled toast", () => {
    vi.useFakeTimers();
    const view = mount();
    const notification = view.begin(true);
    const { toastId, toast } = showToast();
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
    expect(toast.getByText("Fulfilling order request...")).toBeTruthy();
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
    expect(toast.getByText("Order canceled")).toBeTruthy();
    expect(toast.getByText("The order could not be executed")).toBeTruthy();
    expect(toast.queryByText("executed")).toBeNull();
    expect(fakes.update).toHaveBeenCalledWith(toastId, { type: "error" });
    act(() => vi.advanceTimersByTime(TOAST_AUTO_CLOSE_TIME));
    expect(fakes.dismiss).toHaveBeenCalledWith(toastId);
  });

  it("refreshes execution evidence with the shared Solana SDK and submitted owner", () => {
    const view = mount();
    const notification = view.begin(true);
    act(() => notification.submitted({ signatures: ["creation"], orders: [order] }));
    act(() => fakes.watching!.onUpdate(executed));
    expect(fakes.refresh).toHaveBeenCalledWith(view.sdk, "wallet-A", 42);
  });

  it("ends tracking on a wallet or network change, even one switched back, and never reopens a toast", async () => {
    for (const close of ["wallet", "network", "dismiss", "unmount"] as const) {
      const view = mount();
      const notification = view.begin(true);
      const { toastId, onClose, toast } = showToast();
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
      expect(fakes.dismiss.mock.calls.some(([id]) => id === toastId)).toBe(isSessionEnded || close === "dismiss");
      act(() => tracking.onUpdate(executed));
      expect(fakes.refresh).toHaveBeenCalledTimes(isSessionEnded ? 0 : 1);
      const count = fakes.toasts.length;
      act(() => notification.failed(new Error("late failure")));
      expect(fakes.toasts.length).toBe(count);
      expect(Boolean(toast.queryByText("Order request failed"))).toBe(close === "unmount");
      await act(async () => tracking.finish());
      cleanup();
      fakes.refresh.mockClear();
      fakes.dismiss.mockClear();
    }
  });
});
