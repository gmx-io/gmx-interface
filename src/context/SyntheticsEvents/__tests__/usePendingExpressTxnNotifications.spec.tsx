import { cleanup, render } from "@testing-library/react";
import { SetStateAction, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metrics } from "lib/metrics";
import type { OrderMetricId } from "lib/metrics/types";
import { StatusCode } from "sdk/utils/express";

import type { PendingExpressTxns, RelayTaskStatus } from "../types";
import { usePendingExpressTxnNotifications } from "../usePendingExpressTxnNotifications";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ executionFeeBufferBps: undefined, setIsSettingsVisible: () => undefined }),
}));
vi.mock("context/SubaccountContext/SubaccountContextProvider", () => ({
  useSubaccountContext: () => ({ invalidateSubaccountApproval: () => false }),
}));
vi.mock("context/TokensBalancesContext/TokensBalancesContextProvider", () => ({
  useTokensBalancesUpdates: () => ({
    setOptimisticTokensBalancesUpdates: () => undefined,
    optimisticTokensBalancesUpdates: {},
    websocketTokenBalancesUpdates: {},
  }),
}));

const ARBITRUM = 42161;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const METRIC_ID: OrderMetricId = "position:trd-139";

type Props = {
  pendingExpressTxns: PendingExpressTxns;
  setPendingExpressTxns: (action: SetStateAction<PendingExpressTxns>) => void;
  relayTaskStatuses: { [taskId: string]: RelayTaskStatus };
};

function TestComponent({ pendingExpressTxns, setPendingExpressTxns, relayTaskStatuses }: Props) {
  const pendingOrderToastIdRef = useRef<number>();

  usePendingExpressTxnNotifications({
    pendingExpressTxns,
    setPendingExpressTxns,
    relayTaskStatuses,
    chainId: ARBITRUM,
    tokensData: undefined,
    setPendingPositionsUpdates: () => undefined,
    pendingOrderToastIdRef,
  });

  return null;
}

// re-renders with the state the effect wrote, like the provider does, until it stops writing
function renderUntilSettled(initialTxns: PendingExpressTxns, relayTaskStatuses: Props["relayTaskStatuses"]) {
  let pendingExpressTxns = initialTxns;
  let isChanged = false;

  const setPendingExpressTxns = (action: SetStateAction<PendingExpressTxns>) => {
    const next = typeof action === "function" ? action(pendingExpressTxns) : action;
    isChanged = isChanged || next !== pendingExpressTxns;
    pendingExpressTxns = next;
  };

  const view = render(<TestComponent {...{ pendingExpressTxns, setPendingExpressTxns, relayTaskStatuses }} />);

  for (let run = 0; run < 10 && isChanged; run++) {
    isChanged = false;
    view.rerender(<TestComponent {...{ pendingExpressTxns, setPendingExpressTxns, relayTaskStatuses }} />);
  }

  return pendingExpressTxns;
}

function getFailedEvents() {
  return metrics.queue.flatMap((item) =>
    item.type === "event" && item.payload.event.endsWith(".failed")
      ? [{ event: item.payload.event, errorContext: item.payload.customFields.errorContext }]
      : []
  );
}

describe("usePendingExpressTxnNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    metrics.queue = [];
    metrics.setCachedMetricData({ metricId: METRIC_ID, metricType: "increasePosition", requestId: "trd-139" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("sends the failed metric of a relay balance rejection once TRD-139", () => {
    const pendingExpressTxns = renderUntilSettled(
      {
        txn: {
          key: "txn",
          taskId: "task",
          metricId: METRIC_ID,
          gasPaymentTokenAddress: USDC,
          isGmxAccount: false,
          payAmounts: { [USDC]: 10n ** 6n },
          // the order status toast marks a new order's txn viewed before the relay answers
          isViewed: true,
          isRelayerMetricSent: false,
        },
      },
      {
        task: { taskId: "task", statusCode: StatusCode.Rejected, message: "ERC20: transfer amount exceeds balance" },
      }
    );

    expect(getFailedEvents()).toEqual([{ event: "increasePosition.failed", errorContext: "relayer" }]);
    expect(pendingExpressTxns.txn).toMatchObject({ isViewed: true, isRelayerMetricSent: true });
  });
});
