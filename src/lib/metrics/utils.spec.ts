import { afterEach, describe, expect, it, vi } from "vitest";

import type { EventLogData } from "context/SyntheticsEvents";

import { metrics } from "./Metrics";
import {
  initGLVSwapMetricData,
  initGMSwapMetricData,
  initShiftGmMetricData,
  sendOrderCancelledMetric,
  sendOrderCreatedMetric,
  sendOrderExecutedMetric,
  sendOrderSimulatedMetric,
  sendOrderSubmittedMetric,
  sendOrderTxnSubmittedMetric,
  sendTxnErrorMetric,
  sendTxnSentMetric,
  sendTxnValidationErrorMetric,
} from "./utils";

const tokenAmounts = {
  srcChainId: undefined,
  longTokenAddress: undefined,
  shortTokenAddress: undefined,
  longTokenAmount: undefined,
  shortTokenAmount: undefined,
  marketTokenAmount: undefined,
  executionFeeTokenAmount: undefined,
  executionFeeTokenDecimals: undefined,
  isFirstBuy: undefined,
};

const cancelledEvent: EventLogData = {
  addressItems: { items: {}, arrayItems: {} },
  uintItems: { items: {}, arrayItems: {} },
  intItems: { items: {}, arrayItems: {} },
  boolItems: { items: {}, arrayItems: {} },
  bytes32Items: { items: {}, arrayItems: {} },
  bytesItems: { items: {}, arrayItems: {} },
  stringItems: { items: { reason: "cancelled" }, arrayItems: {} },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  { chainId: 42161, isExpress: false, isExpress1CT: false, isCollateralFromMultichain: false },
  { chainId: 43114, isExpress: false, isExpress1CT: false, isCollateralFromMultichain: false },
  { chainId: 42161, isExpress: true, isExpress1CT: false, isCollateralFromMultichain: true },
])("LP funnel context %j", (context) => {
  it.each(["buyGM", "sellGM", "buyGLV", "sellGLV", "shiftGM"] as const)(
    "keeps the order's chain and payment mode in all emitted %s stages",
    (metricType) => {
      const pushEvent = vi.spyOn(metrics, "pushEvent").mockImplementation(() => undefined);
      const metricData =
        metricType === "shiftGM"
          ? initShiftGmMetricData({
              ...context,
              executionFee: undefined,
              fromMarketToken: undefined,
              toMarketToken: undefined,
              minMarketTokenAmount: undefined,
            })
          : metricType === "buyGM" || metricType === "sellGM"
            ? initGMSwapMetricData({
                ...context,
                ...tokenAmounts,
                isDeposit: metricType === "buyGM",
                marketInfo: undefined,
                marketToken: undefined,
                marketTokenUsd: undefined,
              })
            : initGLVSwapMetricData({
                ...context,
                ...tokenAmounts,
                isDeposit: metricType === "buyGLV",
                marketName: undefined,
                glvAddress: undefined,
                selectedMarketForGlv: undefined,
                glvTokenAmount: undefined,
                glvTokenUsd: undefined,
                glvToken: undefined,
              });

      const { metricId } = metricData;
      sendOrderSubmittedMetric(metricId);
      sendOrderSimulatedMetric(metricId);
      sendOrderTxnSubmittedMetric(metricId);
      sendTxnSentMetric(metricId);
      sendOrderCreatedMetric(metricId);
      sendOrderExecutedMetric(metricId);
      sendTxnValidationErrorMetric(metricId);
      sendTxnErrorMetric(metricId, { message: "User denied transaction signature", code: 4001 }, "sending");
      sendTxnErrorMetric(metricId, new Error("transaction failed"), "sending");
      sendOrderCancelledMetric(metricId, cancelledEvent);

      expect(pushEvent.mock.calls.map(([event]) => event.event)).toEqual([
        `${metricType}.submitted`,
        `${metricType}.simulated`,
        `${metricType}.txnSubmitted`,
        `${metricType}.sent`,
        `${metricType}.created`,
        `${metricType}.executed`,
        `${metricType}.failed`,
        `${metricType}.rejected`,
        `${metricType}.failed`,
        `${metricType}.failed`,
      ]);
      for (const [event] of pushEvent.mock.calls) {
        expect(event.data).toMatchObject({ ...context, requestId: metricData.requestId });
      }
    }
  );
});

describe("cross-chain LP metrics", () => {
  it.each(["GM", "GLV"] as const)("uses the connected chain for %s, as trade and approval metrics do", (kind) => {
    const params = {
      ...tokenAmounts,
      chainId: 42161,
      srcChainId: 8453,
      longTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      longTokenAmount: 1_000_000n,
      isDeposit: true,
      isExpress: true,
      isExpress1CT: false,
      isCollateralFromMultichain: true,
    };
    const metricData =
      kind === "GM"
        ? initGMSwapMetricData({ ...params, marketInfo: undefined, marketToken: undefined, marketTokenUsd: undefined })
        : initGLVSwapMetricData({
            ...params,
            marketName: undefined,
            glvAddress: undefined,
            selectedMarketForGlv: undefined,
            glvTokenAmount: undefined,
            glvTokenUsd: undefined,
            glvToken: undefined,
          });

    expect(metricData.chainId).toBe(8453);
    expect(metricData.longTokenAmount).toBe(1);
  });
});
