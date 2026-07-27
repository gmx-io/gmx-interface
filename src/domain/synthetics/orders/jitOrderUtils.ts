import { GlvShiftParam } from "domain/synthetics/jit/utils";
import { decodeErrorFromViemError, isCustomError } from "lib/errors";
import { OrderType } from "sdk/utils/orders/types";
import { BatchOrderTxnParams, CreateOrderPayload } from "sdk/utils/orderTransactions";
import { setOrderDataListMetadataIsJit } from "sdk/utils/twap/uiFeeReceiver";

export function encodeJitBatchOrderMetadata(
  batchParams: BatchOrderTxnParams,
  simulationParams?: {
    jitShiftParamsList?: GlvShiftParam[];
    nativeReserveLiquidity?: bigint;
  }
): BatchOrderTxnParams {
  const { jitShiftParamsList, nativeReserveLiquidity } = simulationParams ?? {};

  const firstCreateOrder = batchParams.createOrderParams[0];

  if (
    !firstCreateOrder ||
    !getNeedsJitOrder({
      orderPayload: firstCreateOrder.orderPayload,
      jitShiftParamsList,
      nativeReserveLiquidity,
    })
  ) {
    return batchParams;
  }

  return {
    ...batchParams,
    createOrderParams: [
      {
        ...firstCreateOrder,
        orderPayload: {
          ...firstCreateOrder.orderPayload,
          dataList: setOrderDataListMetadataIsJit(firstCreateOrder.orderPayload.dataList, true),
        },
      },
      ...batchParams.createOrderParams.slice(1),
    ],
  };
}

export function getNeedsJitOrder({
  orderPayload,
  jitShiftParamsList,
  nativeReserveLiquidity,
}: {
  orderPayload: CreateOrderPayload;
  jitShiftParamsList?: GlvShiftParam[];
  nativeReserveLiquidity?: bigint;
}) {
  return (
    orderPayload.orderType === OrderType.MarketIncrease &&
    jitShiftParamsList !== undefined &&
    jitShiftParamsList.length > 0 &&
    nativeReserveLiquidity !== undefined &&
    orderPayload.numbers.sizeDeltaUsd > nativeReserveLiquidity
  );
}

const JIT_SHIFT_ERROR_NAMES = new Set([
  "GlvInsufficientMarketTokenBalance",
  "GlvShiftMaxPriceImpactExceeded",
  "GlvMaxMarketTokenBalanceUsdExceeded",
  "GlvDisabledMarket",
  "GlvShiftIntervalNotYetPassed",
]);

export function isJitShiftError(error: unknown): boolean {
  if (error instanceof Error && isCustomError(error)) {
    return JIT_SHIFT_ERROR_NAMES.has(error.name);
  }

  const decoded = decodeErrorFromViemError(error);
  return decoded !== undefined && JIT_SHIFT_ERROR_NAMES.has(decoded.name);
}
