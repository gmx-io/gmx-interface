import type { ContractsChainId } from "configs/chains";
import { IHttp } from "utils/http/types";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "utils/signer";

import { validateOrderTypedData } from "./validateTypedData";

export type OrderKind = "increase" | "decrease" | "swap";
export type SimpleOrderType = "market" | "limit" | "stop-market" | "take-profit" | "stop-loss" | "twap";
export type TransactionMode = "express" | "classic";

export type PrepareOrderRequest = {
  kind: OrderKind;
  /** Market symbol (e.g. "ETH/USD"). Required for increase/decrease, ignored for swap. */
  symbol?: string;
  direction?: "long" | "short";
  orderType: SimpleOrderType;
  /** Position size in USD (30-decimal string). Required for increase/decrease. */
  size?: string;
  triggerPrice?: string;
  /** Slippage tolerance in basis points (e.g. 30 = 0.3%). Default: 30. */
  slippage?: number;
  collateralToPay?: { amount: string; token: string };
  receiveToken?: string;
  /** Manual swap path (array of market addresses). Skips automatic path finding. */
  manualSwapPath?: string[];
  mode: TransactionMode;
  from: string;
  // TODO: EIP-1271 (smart contract wallets) not yet supported
  // signingScheme?: "ecdsa" | "eip1271";
  // TODO: multichain signing not yet supported
  // signingNetwork?: string;
  /** Subaccount address — if provided, the subaccount relay router is used */
  subaccountAddress?: string;
  /** Signed subaccount approval data */
  subaccountApproval?: Record<string, any>;
};

export type OrderEstimates = {
  positionPriceImpactDeltaUsd: string;
  swapPriceImpactDeltaUsd: string;
  executionFeeAmount: string;
  acceptablePrice: string;
  sizeDeltaUsd: string;
  positionFeeUsd: string;
  borrowingFeeUsd: string;
  fundingFeeUsd: string;
};

export type PrepareOrderResponse = {
  requestId: string;
  idempotencyKey?: string;
  payloadType: "transaction" | "typed-data";
  mode: TransactionMode;
  // TODO: EIP-1271 (smart contract wallets) not yet supported
  // signingScheme?: "ecdsa" | "eip1271";
  payload: Record<string, any>;
  estimates?: OrderEstimates;
  expiresAt?: number;
  warnings?: string[];
  traceId?: string;
};

export type SubmitOrderRequest = {
  mode: TransactionMode;
  /** Request ID from the prepare response — used for transaction tracking */
  requestId?: string;
  signature?: string;
  from?: string;
  eip712Data?: Record<string, any>;
  // TODO: EIP-1271 (smart contract wallets) not yet supported
  // signingScheme?: "ecdsa" | "eip1271";
  // TODO: multichain signing not yet supported
  // signingNetwork?: string;
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

// ---------------------------------------------------------------------------
// Simulate
// ---------------------------------------------------------------------------

export type SimulateOrderRequest = {
  kind: OrderKind;
  symbol?: string;
  direction?: "long" | "short";
  orderType: SimpleOrderType;
  size?: string;
  triggerPrice?: string;
  /** Slippage tolerance in basis points (e.g. 30 = 0.3%). Default: 30. */
  slippage?: number;
  collateralToPay?: { amount: string; token: string };
  receiveToken?: string;
  from: string;
};

export type SimulateOrderResponse = {
  success: boolean;
  error?: { code: string; message: string };
  traceId?: string;
};

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export type PrepareEditOrderRequest = {
  orderIds: string[];
  newSize?: string;
  newTriggerPrice?: string;
  newAcceptablePrice?: string;
  newAutoCancel?: boolean;
  executionFeeTopUp?: string;
  mode: TransactionMode;
  // TODO: EIP-1271 (smart contract wallets) not yet supported
  // signingScheme?: "ecdsa" | "eip1271";
  from: string;
  // TODO: multichain signing not yet supported
  // signingNetwork?: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export type PrepareCancelOrderRequest = {
  orderId?: string;
  orderIds?: string[];
  all?: boolean;
  mode: TransactionMode;
  // TODO: EIP-1271 (smart contract wallets) not yet supported
  // signingScheme?: "ecdsa" | "eip1271";
  from: string;
  // TODO: multichain signing not yet supported
  // signingNetwork?: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

export async function prepareOrder(ctx: { api: IHttp }, request: PrepareOrderRequest): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/prepare", request);
}

export async function submitOrder(ctx: { api: IHttp }, request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
  return ctx.api.postJson<SubmitOrderResponse>("/orders/txns/submit", request);
}

export async function simulateOrder(
  ctx: { api: IHttp },
  request: SimulateOrderRequest
): Promise<SimulateOrderResponse> {
  return ctx.api.postJson<SimulateOrderResponse>("/orders/txns/simulate", request);
}

export async function prepareEditOrder(
  ctx: { api: IHttp },
  request: PrepareEditOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/edit/prepare", request);
}

export async function prepareCancelOrder(
  ctx: { api: IHttp },
  request: PrepareCancelOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/orders/txns/cancel/prepare", request);
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
  /** For subaccount orders, pass the main account address so receiver validation accepts it */
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

// ---------------------------------------------------------------------------
// Full flow: prepare → sign → submit
// ---------------------------------------------------------------------------

export async function executeExpressOrder(
  ctx: { api: IHttp; chainId?: ContractsChainId },
  request: PrepareOrderRequest,
  signer: IAbstractSigner,
  /** For subaccount orders, pass the main account address for receiver validation */
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
