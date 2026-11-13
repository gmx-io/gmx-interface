import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { SOLANA_NETWORK_ID } from "config/chains";
import { GmxSdkProvider, useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import type { OrderLifecycleResult, TrackedOrderAction } from "domain/gmsol/orderTracking/reduceOrderLifecycle";

import type { SolanaOrderNotificationState } from "components/StatusNotification/SolanaOrderStatusNotification";

import { useSolanaOrderNotifications } from "./useSolanaOrderNotifications";

const fakes = vi.hoisted(() => ({
  refresh: vi.fn(),
  owner: "wallet-A",
  networkId: -501,
  rendered: [] as { content: unknown; options: { autoClose?: number | false; onClose?: () => void } }[],
  watching: undefined as { signal: AbortSignal; onUpdate: (result: unknown) => void; finish: () => void } | undefined,
}));
vi.mock("lib/chains", () => ({ useChainId: () => ({ networkId: fakes.networkId }) }));
vi.mock("lib/wallets/solanaWalletSession", () => ({ useSolanaWalletSession: () => ({ address: fakes.owner }) }));
vi.mock("react-toastify", () => ({
  toast: Object.assign(
    (content: unknown, options: { onClose?: () => void }) => {
      fakes.rendered.push({ content, options });
      return fakes.rendered.length;
    },
    {
      update: (_id: unknown, options: { render: unknown; autoClose?: number | false; onClose?: () => void }) =>
        fakes.rendered.push({ content: options.render, options }),
      dismiss: () => undefined,
    }
  ),
}));
vi.mock("domain/gmsol/orderTracking/watchSubmittedOrders", () => ({
  watchSubmittedOrders: ({ signal, onUpdate }: { signal: AbortSignal; onUpdate: (result: unknown) => void }) =>
    new Promise<void>((resolve) => {
      fakes.watching = { signal, onUpdate, finish: resolve };
    }),
}));
vi.mock("domain/gmsol/useGmsolAccountData", () => ({
  refreshGmsolAccountDataAfterTransaction: (...args: unknown[]) => fakes.refresh(...args),
}));

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  setAbFlagEnabled("solanaNetwork", true);
  fakes.owner = "wallet-A";
  fakes.networkId = SOLANA_NETWORK_ID;
  fakes.rendered.length = 0;
  fakes.watching = undefined;
  fakes.refresh.mockClear();
});
afterEach(() => {
  fakes.watching?.finish();
  cleanup();
  setAbFlagEnabled("solanaNetwork", false);
  vi.restoreAllMocks();
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
    result: {
      get current() {
        return value;
      },
    },
    rerender: () =>
      view.rerender(
        <GmxSdkProvider>
          <Probe />
        </GmxSdkProvider>
      ),
    unmount: view.unmount,
  };
}
function latest() {
  return (fakes.rendered[fakes.rendered.length - 1].content as ReactElement<{ state: SolanaOrderNotificationState }>)
    .props.state;
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

describe("Solana order notification lifecycle", () => {
  it("separates rejection, known chain failure, confirmed submission and ambiguous broadcast", () => {
    const view = mount();
    for (const [error, submission] of [
      [new Error("User rejected"), "failed"],
      [{ submittedSignatures: ["preparation"], confirmedSignatures: ["preparation"] }, "failed"],
      [{ submittedSignatures: ["failed"], failedSignature: "failed" }, "failed"],
      [{ submittedSignatures: ["broadcast"], pendingSignature: "broadcast" }, "unknown"],
    ] as const) {
      const notification = view.result.current.begin({ title: "Order", trackExecution: true });
      notification.failed(error);
      expect(latest().submission).toBe(submission);
      expect(latest().execution).toBe("unresolved");
    }
    const notification = view.result.current.begin({ title: "Limit order", trackExecution: false });
    notification.submitted({ signatures: ["confirmed"] });
    expect(latest()).toMatchObject({ submission: "submitted", execution: "unresolved", trackExecution: false });
    expect(fakes.watching).toBeUndefined();
  });

  it("renders sending, uncertain submission and confirmed execution as distinct stages", () => {
    const view = mount();
    const notification = view.result.current.begin({ title: "Order", trackExecution: true });
    const content = () => (
      <I18nProvider i18n={i18n}>{fakes.rendered[fakes.rendered.length - 1].content as ReactElement}</I18nProvider>
    );
    const toastView = render(content());
    expect(toastView.queryByText("Fulfilling order request...")).toBeNull();
    notification.failed({ pendingSignature: "broadcast" });
    toastView.rerender(content());
    expect(toastView.getByText("Order submission status unknown. Check the transaction before retrying.")).toBeTruthy();
    expect(toastView.queryByText("Fulfilling order request...")).toBeNull();
    expect(toastView.container.querySelector(".spin")).toBeNull();
    expect(toastView.getByRole("link").getAttribute("href")).toContain("tx/broadcast");
    const confirmed = view.result.current.begin({ title: "Order", trackExecution: true });
    confirmed.submitted({ signatures: ["creation"], orders: [order] });
    toastView.rerender(content());
    expect(toastView.getByText("Order request sent")).toBeTruthy();
    expect(toastView.getByText("Fulfilling order request...")).toBeTruthy();
    expect(toastView.queryByText("Order filled")).toBeNull();
  });

  it("requires outcome evidence, preserves cancellation reason and keeps settled toast expiry", async () => {
    const view = mount();
    const notification = view.result.current.begin({ title: "Order", trackExecution: true });
    notification.submitted({ signatures: ["creation"], orders: [order] });
    expect(latest()).toMatchObject({ submission: "submitted", execution: "unresolved" });
    await waitFor(() => expect(fakes.watching).toBeDefined());
    fakes.watching!.onUpdate({
      action: order,
      submission: "submitted",
      execution: "unresolved",
      closure: "pending",
    } satisfies OrderLifecycleResult);
    expect(latest().execution).toBe("unresolved");
    fakes.watching!.onUpdate({
      action: order,
      submission: "submitted",
      execution: "cancelled",
      closure: "closed",
      reason: "Insufficient collateral",
    } satisfies OrderLifecycleResult);
    expect(latest()).toMatchObject({ execution: "cancelled", reason: "Insufficient collateral" });
    const terminalOptions = fakes.rendered[fakes.rendered.length - 1].options;
    expect(terminalOptions.autoClose).toBeGreaterThan(0);
    await act(async () => fakes.watching!.finish());
    expect(fakes.rendered[fakes.rendered.length - 1].options.autoClose).toBeUndefined();
  });

  it("refreshes execution evidence with the shared Solana SDK and submitted owner", async () => {
    const view = mount();
    const notification = view.result.current.begin({ title: "Order", trackExecution: true });
    notification.submitted({ signatures: ["creation"], orders: [order] });
    await waitFor(() => expect(fakes.watching).toBeDefined());
    fakes.watching!.onUpdate({
      execution: "executed",
      trade: { signature: "execution", event: { fields: { slot: 42n } } },
    });
    await waitFor(() => expect(fakes.refresh).toHaveBeenCalledWith(view.sdk, "wallet-A", 42));
  });

  it("aborts on wallet or network changes and prevents dismissed/unmounted flows from updating another session", async () => {
    for (const close of ["wallet", "network", "dismiss", "unmount"] as const) {
      const view = mount();
      const notification = view.result.current.begin({ title: "Order", trackExecution: true });
      const options = fakes.rendered[fakes.rendered.length - 1].options;
      notification.submitted({ signatures: ["creation"], orders: [order] });
      await waitFor(() => expect(fakes.watching).toBeDefined());
      if (close === "wallet") {
        fakes.owner = "wallet-B";
        view.rerender();
      }
      if (close === "network") {
        fakes.networkId = 42161;
        view.rerender();
      }
      if (close === "dismiss") options.onClose!();
      if (close === "unmount") view.unmount();
      expect(fakes.watching!.signal.aborted).toBe(true);
      const count = fakes.rendered.length;
      fakes.watching!.onUpdate({ action: order, execution: "executed" });
      notification.failed(new Error("late failure"));
      expect(fakes.rendered.length).toBe(count);
      fakes.watching!.finish();
      view.unmount();
      fakes.owner = "wallet-A";
      fakes.networkId = SOLANA_NETWORK_ID;
      fakes.watching = undefined;
    }
  });
});
