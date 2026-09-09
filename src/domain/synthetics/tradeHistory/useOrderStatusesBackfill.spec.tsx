import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { zeroAddress } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PendingOrderData } from "context/SyntheticsEvents/types";
import { getPositionKey } from "domain/synthetics/positions";
import { getPendingTpSlOrders } from "domain/tpsl/pendingOrders";
import type { PendingTpSlOrderBatch } from "domain/tpsl/types";
import type { TradeAction as RawTradeAction } from "sdk/codegen/subsquid";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import {
  applyOrderBackfillMatches,
  getPendingTpSlOrdersForBackfill,
  type OrderBackfillMatch,
} from "./orderStatusesBackfill";
import { useOrderStatusesBackfill } from "./useOrderStatusesBackfill";
import { fetchRawTradeActions, type RawTradeActionsResult } from "./useTradeHistory";

vi.mock("./useTradeHistory", () => ({ fetchRawTradeActions: vi.fn() }));

const mockedFetch = vi.mocked(fetchRawTradeActions);
const chainId = 42161;
const account = "0x1111111111111111111111111111111111111111";
const pendingOrder: PendingOrderData = {
  account,
  marketAddress: "0x2222222222222222222222222222222222222222",
  initialCollateralTokenAddress: "0x3333333333333333333333333333333333333333",
  initialCollateralDeltaAmount: 0n,
  swapPath: [],
  sizeDeltaUsd: 100n,
  minOutputAmount: 0n,
  triggerPrice: 1500n,
  acceptablePrice: 0n,
  autoCancel: false,
  isLong: true,
  orderType: OrderType.LimitDecrease,
  decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
  shouldUnwrapNativeToken: false,
  externalSwapQuote: undefined,
  txnType: "create",
  isTwap: false,
  createdAt: 1_700_000_000_000,
};
const batch: PendingTpSlOrderBatch = {
  id: "batch",
  chainId,
  orders: [pendingOrder],
  existingOrderKeys: [],
  transactionHash: "0xcreate",
};
const creationAction: RawTradeAction = {
  id: "creation",
  eventName: TradeActionType.OrderCreated,
  account,
  marketAddress: pendingOrder.marketAddress,
  initialCollateralTokenAddress: pendingOrder.initialCollateralTokenAddress,
  initialCollateralDeltaAmount: "0",
  sizeDeltaUsd: "100",
  minOutputAmount: "0",
  triggerPrice: "1500",
  swapPath: [],
  orderType: OrderType.LimitDecrease,
  decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
  orderKey: "0xorder",
  isLong: true,
  shouldUnwrapNativeToken: false,
  timestamp: 1_700_000_010,
  transactionHash: "0xcreate",
  uiFeeReceiver: zeroAddress,
};

type HookProps = Parameters<typeof useOrderStatusesBackfill>[0];

function Harness(props: HookProps) {
  useOrderStatusesBackfill(props);
  return null;
}

function renderBackfill(props: HookProps) {
  const cache = new Map();
  const swrConfig = { provider: () => cache, dedupingInterval: 0, revalidateOnFocus: false };
  const element = (nextProps: HookProps) => (
    <SWRConfig value={swrConfig}>
      <Harness {...nextProps} />
    </SWRConfig>
  );
  const view = render(element(props));
  return (nextProps: HookProps) => view.rerender(element(nextProps));
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("useOrderStatusesBackfill", () => {
  it.each([TradeActionType.OrderExecuted, TradeActionType.OrderCancelled])(
    "recovers missed creation and %s from response envelopes without fetched orders",
    async (eventName) => {
      const settlementAction: RawTradeAction = {
        ...creationAction,
        id: "settlement",
        eventName,
        sizeDeltaUsd: "80",
        transactionHash: "0xsettlement",
      };
      const creationResponse = Promise.withResolvers<RawTradeActionsResult>();
      const settlementResponse = Promise.withResolvers<RawTradeActionsResult>();
      mockedFetch.mockReturnValueOnce(creationResponse.promise).mockReturnValue(settlementResponse.promise);

      const input = { batches: [batch], chainId, account, orderStatuses: {}, relayTaskStatuses: {} };
      const onMatches = vi.fn<(matches: OrderBackfillMatch[]) => void>();
      const props: HookProps = {
        chainId,
        pendingOrders: getPendingTpSlOrdersForBackfill(input),
        orderStatuses: {},
        onMatches,
      };
      const rerender = renderBackfill(props);

      await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
      await act(async () => {
        creationResponse.resolve({ tradeActions: [creationAction], totalCount: 1 });
      });
      expect(onMatches).toHaveBeenCalledTimes(1);
      expect(mockedFetch.mock.calls[0][0]).toMatchObject({ transactionHashes: ["0xcreate"] });
      const createdStatuses = applyOrderBackfillMatches({}, onMatches.mock.calls[0][0]);
      expect(createdStatuses["0xorder"]).toMatchObject({
        createdTxnHash: "0xcreate",
        data: { contractTriggerPrice: pendingOrder.triggerPrice, sizeDeltaUsd: pendingOrder.sizeDeltaUsd },
      });

      const resolutionInput = {
        ...input,
        positionKey: getPositionKey(
          account,
          pendingOrder.marketAddress,
          pendingOrder.initialCollateralTokenAddress,
          pendingOrder.isLong
        ),
        ordersInfoData: {},
        orderStatuses: createdStatuses,
      };
      const created = getPendingTpSlOrders(resolutionInput);
      expect(created.pendingOrders).toHaveLength(1);
      const keyedBatch = { ...batch, orders: created.batchUpdates[batch.id] };
      const settlementOrders = getPendingTpSlOrdersForBackfill({
        ...input,
        batches: [keyedBatch],
        orderStatuses: createdStatuses,
      });
      rerender({ ...props, pendingOrders: settlementOrders, orderStatuses: createdStatuses });

      await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
      await act(async () => {
        settlementResponse.resolve({ tradeActions: [settlementAction], totalCount: 1 });
      });
      expect(onMatches).toHaveBeenCalledTimes(2);
      expect(mockedFetch.mock.calls[1][0]).toMatchObject({ orderKeys: ["0xorder"], transactionHashes: undefined });
      expect(onMatches.mock.calls[1][0][0]).toMatchObject({ eventName, transactionHash: "0xsettlement" });
      const settledStatuses = applyOrderBackfillMatches(createdStatuses, onMatches.mock.calls[1][0]);
      const settled = getPendingTpSlOrders({
        ...resolutionInput,
        batches: [keyedBatch],
        orderStatuses: settledStatuses,
      });
      expect(settled.pendingOrders).toEqual([]);
      expect(settled.completedBatchIds).toEqual([batch.id]);

      rerender({ ...props, pendingOrders: settlementOrders, orderStatuses: settledStatuses });
      expect(onMatches).toHaveBeenCalledTimes(2);
    }
  );
});
