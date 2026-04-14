import type { ContractsChainId } from "configs/chains";
import { IHttp } from "utils/http/types";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "utils/signer";

import { validateOrderTypedData } from "./validateTypedData";

export type OrderKind = "increase" | "decrease" | "swap";
export type SimpleOrderType = "market" | "limit" | "stop-market" | "take-profit" | "stop-loss" | "twap";
export type TransactionMode = "express" | "classic";

export type PrepareOrderRequest = {
  kind: OrderKind;
  symbol?: string;
  direction?: "long" | "short";
  orderType: SimpleOrderType;
  size?: bigint;
  triggerPrice?: bigint;
  slippage?: number;
  collateralToken?: string;
  collateralToPay?: { amount: bigint; token: string };
  receiveToken?: string;
  keepLeverage?: boolean;
  manualSwapPath?: string[];
  acceptablePriceImpactBps?: bigint;
  executionFeeBufferBps?: number;
  twapConfig?: { duration: number; parts: number; frequency?: number };
  tpsl?: { type: "take-profit" | "stop-loss"; triggerPrice: bigint; size?: bigint }[];
  mode: TransactionMode;
  from: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

export type OrderEstimates = {
  positionPriceImpactDeltaUsd: bigint;
  swapPriceImpactDeltaUsd: bigint;
  executionFeeAmount: bigint;
  acceptablePrice: bigint;
  sizeDeltaUsd: bigint;
  positionFeeUsd: bigint;
  borrowingFeeUsd: bigint;
  fundingFeeUsd: bigint;
};

export type PrepareOrderResponse = {
  requestId: string;
  idempotencyKey?: string;
  payloadType: "transaction" | "typed-data";
  mode: TransactionMode;
  payload: Record<string, any>;
  estimates?: OrderEstimates;
  expiresAt?: number;
  warnings?: string[];
  traceId?: string;
};

export type SubmitOrderRequest = {
  mode: TransactionMode;
  requestId?: string;
  signature?: string;
  from?: string;
  eip712Data?: Record<string, any>;
  idempotencyKey?: string;
};

export type SubmitOrderResponse = {
  requestId: string;
  status: "accepted" | "pending" | "submitted" | "executed" | "failed" | "reverted" | "expired";
  txHash?: string;
  taskId?: string;
  error?: { code: string; message: string };
  traceId?: string;
};

export type OrderStatusRequest = {
  requestId?: string;
  idempotencyKey?: string;
};

export type OrderStatusResponse = {
  requestId: string;
  status: "accepted" | "pending" | "submitted" | "executed" | "failed" | "reverted" | "expired";
  txHash?: string;
  createdTxnHash?: string;
  executionTxnHash?: string;
  orderKeys?: string[];
  cancellationReason?: string;
  taskId?: string;
  error?: { code: string; message: string };
  createdAt?: string;
  updatedAt?: string;
  traceId?: string;
};

export type PrepareEditOrderRequest = {
  orderIds: string[];
  newSize?: bigint;
  newTriggerPrice?: bigint;
  newAcceptablePrice?: bigint;
  newAutoCancel?: boolean;
  executionFeeTopUp?: bigint;
  mode: TransactionMode;
  from: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

export type PrepareCancelOrderRequest = {
  orderId?: string;
  orderIds?: string[];
  all?: boolean;
  mode: TransactionMode;
  from: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

export type CollateralOperation = "deposit" | "withdraw";

export type PrepareCollateralRequest = {
  operation: CollateralOperation;
  positionKey: string;
  amount: bigint;
  slippage?: number;
  executionFeeBufferBps?: number;
  mode: TransactionMode;
  from: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

function parseEstimates(raw: any): OrderEstimates | undefined {
  if (!raw) return undefined;
  return {
    positionPriceImpactDeltaUsd: BigInt(raw.positionPriceImpactDeltaUsd),
    swapPriceImpactDeltaUsd: BigInt(raw.swapPriceImpactDeltaUsd),
    executionFeeAmount: BigInt(raw.executionFeeAmount),
    acceptablePrice: BigInt(raw.acceptablePrice),
    sizeDeltaUsd: BigInt(raw.sizeDeltaUsd),
    positionFeeUsd: BigInt(raw.positionFeeUsd),
    borrowingFeeUsd: BigInt(raw.borrowingFeeUsd),
    fundingFeeUsd: BigInt(raw.fundingFeeUsd),
  };
}

function parsePrepareResponse(raw: any): PrepareOrderResponse {
  return { ...raw, estimates: parseEstimates(raw.estimates) };
}

export async function prepareOrder(ctx: { api: IHttp }, request: PrepareOrderRequest): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function submitOrder(ctx: { api: IHttp }, request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
  return ctx.api.postJson<SubmitOrderResponse>("/orders/txns/submit", request);
}

export async function prepareEditOrder(
  ctx: { api: IHttp },
  request: PrepareEditOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/edit/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function prepareCancelOrder(
  ctx: { api: IHttp },
  request: PrepareCancelOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/cancel/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function prepareCollateral(
  ctx: { api: IHttp },
  request: PrepareCollateralRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/collateral/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function fetchOrderStatus(
  ctx: { api: IHttp },
  request: OrderStatusRequest
): Promise<OrderStatusResponse> {
  return ctx.api.postJson<OrderStatusResponse>("/orders/txns/status", request);
}

export async function signPreparedOrder(
  prepared: PrepareOrderResponse,
  signer: IAbstractSigner,
  chainId?: ContractsChainId,
  accountAddress?: string
): Promise<string> {
  if (prepared.payloadType !== "typed-data") {
    throw new Error(
      `Cannot sign payloadType "${prepared.payloadType}" with signTypedData. ` +
        `Classic transactions must be signed and sent by the wallet directly.`
    );
  }

  const typedData = prepared.payload.typedData;
  if (!typedData) {
    throw new Error("Missing typedData in prepare response payload");
  }

  const domain = typedData.domain as TypedDataDomain;
  const types = typedData.types as TypedDataTypes;
  const message = typedData.message as Record<string, any>;

  if (chainId !== undefined) {
    validateOrderTypedData(domain, types, message, chainId, signer.address, accountAddress);
  }

  return signer.signTypedData(domain, types, message);
}

export async function executeExpressOrder(
  ctx: { api: IHttp; chainId?: ContractsChainId },
  request: PrepareOrderRequest,
  signer: IAbstractSigner,
  accountAddress?: string
): Promise<SubmitOrderResponse> {
  const prepared = await prepareOrder(ctx, request);

  const signature = await signPreparedOrder(prepared, signer, ctx.chainId, accountAddress);

  return submitOrder(ctx, {
    mode: prepared.mode,
    requestId: prepared.requestId,
    signature,
    from: accountAddress ?? signer.address,
    idempotencyKey: prepared.idempotencyKey,
    eip712Data: {
      batchParams: prepared.payload.batchParams,
      relayParams: prepared.payload.relayParams,
      subaccountApproval: request.subaccountApproval,
    },
  });
}
