import { cleanup, render } from "@testing-library/react";
import { SetStateAction, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import type { OrderMetricId } from "lib/metrics/types";
import { StatusCode } from "sdk/utils/express";
import { TokenBalanceType } from "sdk/utils/tokens/types";

import type { PendingExpressTxnParams, PendingExpressTxns, RelayTaskStatus } from "../types";
import { usePendingExpressTxnNotifications } from "../usePendingExpressTxnNotifications";
import { removePendingExpressTxnDebits, removePendingExpressTxnPositionsUpdates } from "../utils";

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
const POSITION_KEY = "0x5d2c7cd7bd6c3b4ed1a2c4a2b6a1e1a4bd7f5c3f0b3e9c3f6e1d2a7b8c9d0e1f";

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
    vi.restoreAllMocks();
  });

  it.each([
    {
      name: "with",
      metricId: METRIC_ID,
      failedEvents: [{ event: "increasePosition.failed", errorContext: "relayer" }],
    },
    { name: "without", metricId: undefined, failedEvents: [] },
  ])(
    "reports a relay balance rejection of a new order once, $name a metric id TRD-139",
    async ({ metricId, failedEvents }) => {
      const errorToastSpy = vi.spyOn(helperToast, "error");

      renderUntilSettled(
        {
          txn: {
            key: "txn",
            taskId: "task",
            metricId,
            gasPaymentTokenAddress: USDC,
            isGmxAccount: false,
            payAmounts: { [USDC]: 10n ** 6n },
            isViewed: true,
          },
        },
        {
          task: { taskId: "task", statusCode: StatusCode.Rejected, message: "ERC20: transfer amount exceeds balance" },
        }
      );
      await vi.advanceTimersByTimeAsync(500);

      expect(getFailedEvents()).toEqual(failedEvents);
      expect(errorToastSpy).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    {
      name: "Add TP/SL rejected while a market order is pending",
      txn: { payAmounts: { [USDC]: 100_000n }, pendingPositionsKeys: [], createdAt: 2000 },
      pendingDebit: -100_100_000n,
      positionUpdatedAt: 1000,
      expectedDebit: -100_000_000n,
      isPositionKept: true,
    },
    {
      name: "the only pending market order rejected",
      txn: { payAmounts: { [USDC]: 100_000_000n }, pendingPositionsKeys: [POSITION_KEY], createdAt: 1000 },
      pendingDebit: -100_000_000n,
      positionUpdatedAt: 1000,
      expectedDebit: undefined,
      isPositionKept: false,
    },
    {
      name: "the older of two market orders on one position rejected",
      txn: { payAmounts: { [USDC]: 100_000_000n }, pendingPositionsKeys: [POSITION_KEY], createdAt: 1000 },
      pendingDebit: -150_000_000n,
      positionUpdatedAt: 3000,
      expectedDebit: -50_000_000n,
      isPositionKept: true,
    },
  ])(
    "rolls back only the failed txn's own debit and pending position, $name TRD-139",
    ({ txn, pendingDebit, positionUpdatedAt, expectedDebit, isPositionKept }) => {
      const pendingExpressTxn: Partial<PendingExpressTxnParams> = { ...txn, isGmxAccount: false };

      const debits = removePendingExpressTxnDebits(
        { [USDC]: { balanceType: TokenBalanceType.Wallet, diff: pendingDebit, isPending: true } },
        pendingExpressTxn
      );
      const positionsUpdates = removePendingExpressTxnPositionsUpdates(
        {
          [POSITION_KEY]: {
            isIncrease: true,
            positionKey: POSITION_KEY,
            sizeDeltaUsd: 1000n * 10n ** 30n,
            sizeDeltaInTokens: 10n ** 17n,
            collateralDeltaAmount: 100_000_000n,
            updatedAt: positionUpdatedAt,
            updatedAtBlock: 1n,
          },
        },
        pendingExpressTxn
      );

      expect(debits[USDC]?.diff).toBe(expectedDebit);
      expect(POSITION_KEY in positionsUpdates).toBe(isPositionKept);
    }
  );
});
