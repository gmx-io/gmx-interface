import type { ContractsChainId } from "configs/chains";
import { HttpError } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { parseTradingCapacity } from "utils/markets/api";
import type { TradingCapacity } from "utils/markets/types";
import { isUint256, parseUint256DecimalString } from "utils/numbers";
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
  gasPaymentToken?: string;
  referralCode?: string;
  uiFeeReceiver?: string;
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
  tradingCapacity?: TradingCapacity;
};

export type OrderValidationWarning =
  | {
      code: "INSUFFICIENT_LIQUIDITY";
      message: string;
      details: TradingCapacity & { requestedSizeUsd: bigint };
    }
  | {
      code: "TRADING_CAPACITY_UNAVAILABLE";
      message: string;
      details: {
        reason: "STALE_MARKET_DATA" | "JIT_DATA_UNAVAILABLE" | "JIT_ACCOUNT_ELIGIBILITY_UNKNOWN" | "COLLATERAL_SWAP";
      };
    }
  | {
      code: "UNKNOWN_VALIDATION_WARNING";
      originalCode: string;
      message: string;
      details?: unknown;
    };

export type PrepareOrderErrorCode =
  | "INVALID_PARAMS"
  | "MARKET_NOT_FOUND"
  | "TOKEN_NOT_FOUND"
  | "NO_SWAP_PATH"
  | "POSITION_NOT_FOUND";

export type PrepareOrderFieldValidationErrors = Record<string, { message: string; value?: unknown }>;

export type PrepareOrderError =
  | {
      code: "INSUFFICIENT_LIQUIDITY";
      message: string;
      details: TradingCapacity & { requestedSizeUsd: bigint };
    }
  | {
      code: PrepareOrderErrorCode;
      message: string;
    }
  | {
      code?: undefined;
      message: string;
    }
  | {
      code?: undefined;
      message: PrepareOrderFieldValidationErrors;
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
  validationWarnings?: OrderValidationWarning[];
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
  status:
    | "prepared"
    | "relay_accepted"
    | "relay_pending"
    | "relay_submitted"
    | "created"
    | "executed"
    | "cancelled"
    | "relay_failed"
    | "relay_reverted";
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
  status:
    | "prepared"
    | "relay_accepted"
    | "relay_pending"
    | "relay_submitted"
    | "created"
    | "executed"
    | "cancelled"
    | "relay_failed"
    | "relay_reverted";
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
  gasPaymentToken?: string;
  uiFeeReceiver?: string;
  mode: TransactionMode;
  from: string;
  subaccountAddress?: string;
  subaccountApproval?: Record<string, any>;
};

const PREPARE_ORDER_ERROR_CODES: readonly PrepareOrderErrorCode[] = [
  "INVALID_PARAMS",
  "MARKET_NOT_FOUND",
  "TOKEN_NOT_FOUND",
  "NO_SWAP_PATH",
  "POSITION_NOT_FOUND",
];

function isParsedTradingCapacity(value: unknown): value is TradingCapacity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const capacity = value as Record<string, unknown>;
  return (
    typeof capacity.availableLiquidity === "bigint" &&
    typeof capacity.baseAvailableLiquidity === "bigint" &&
    typeof capacity.jitAvailableLiquidity === "bigint" &&
    typeof capacity.limitingFactor === "string" &&
    typeof capacity.jitDataStatus === "string" &&
    typeof capacity.marketDataStatus === "string"
  );
}

function isPrepareOrderFieldValidationErrors(value: unknown): value is PrepareOrderFieldValidationErrors {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (fieldError) =>
      typeof fieldError === "object" &&
      fieldError !== null &&
      !Array.isArray(fieldError) &&
      typeof (fieldError as Record<string, unknown>).message === "string"
  );
}

function parsePrepareOrderErrorBody(value: unknown): PrepareOrderError | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const body = value as Record<string, unknown>;
  if (body.code === "INSUFFICIENT_LIQUIDITY") {
    const capacity = parseTradingCapacity(body.details);
    const details = body.details as Record<string, unknown> | null | undefined;
    const requestedSizeUsd = parseUint256DecimalString(details?.requestedSizeUsd);
    if (!isParsedTradingCapacity(capacity) || requestedSizeUsd === undefined || typeof body.message !== "string") {
      return undefined;
    }

    return {
      code: body.code,
      message: body.message,
      details: {
        ...capacity,
        requestedSizeUsd,
      },
    };
  }

  if (PREPARE_ORDER_ERROR_CODES.includes(body.code as PrepareOrderErrorCode) && typeof body.message === "string") {
    return {
      code: body.code as PrepareOrderErrorCode,
      message: body.message,
    };
  }

  if (body.code !== undefined) {
    return undefined;
  }

  if (typeof body.message === "string") {
    return { message: body.message };
  }

  if (isPrepareOrderFieldValidationErrors(body.message)) {
    return { message: body.message };
  }

  return undefined;
}

export function parsePrepareOrderError(error: unknown): PrepareOrderError | undefined {
  if (!(error instanceof HttpError) || error.statusCode !== 400) {
    return undefined;
  }

  return parsePrepareOrderErrorBody(error.body);
}

/** Validates an already deserialized prepare error. Use parsePrepareOrderError for a caught HttpError. */
export function isPrepareOrderError(value: unknown): value is PrepareOrderError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const error = value as Record<string, unknown>;
  if (error.code === "INSUFFICIENT_LIQUIDITY") {
    const details = error.details as Record<string, unknown> | null | undefined;
    return Boolean(
      isParsedTradingCapacity(error.details) &&
        isUint256(details?.requestedSizeUsd) &&
        typeof error.message === "string"
    );
  }

  if (PREPARE_ORDER_ERROR_CODES.includes(error.code as PrepareOrderErrorCode)) {
    return typeof error.message === "string";
  }

  return (
    error.code === undefined &&
    (typeof error.message === "string" || isPrepareOrderFieldValidationErrors(error.message))
  );
}

function parseEstimates(raw: any): OrderEstimates | undefined {
  if (!raw) return undefined;

  const tradingCapacity = raw.tradingCapacity === undefined ? undefined : parseTradingCapacity(raw.tradingCapacity);

  return {
    positionPriceImpactDeltaUsd: BigInt(raw.positionPriceImpactDeltaUsd ?? "0"),
    swapPriceImpactDeltaUsd: BigInt(raw.swapPriceImpactDeltaUsd ?? "0"),
    executionFeeAmount: BigInt(raw.executionFeeAmount ?? "0"),
    acceptablePrice: BigInt(raw.acceptablePrice ?? "0"),
    sizeDeltaUsd: BigInt(raw.sizeDeltaUsd ?? "0"),
    positionFeeUsd: BigInt(raw.positionFeeUsd ?? "0"),
    borrowingFeeUsd: BigInt(raw.borrowingFeeUsd ?? "0"),
    fundingFeeUsd: BigInt(raw.fundingFeeUsd ?? "0"),
    tradingCapacity,
  };
}

function parseValidationWarning(raw: any): OrderValidationWarning {
  if (raw?.code === "INSUFFICIENT_LIQUIDITY") {
    const capacity = parseTradingCapacity(raw.details);
    const requestedSizeUsd = parseUint256DecimalString(raw.details?.requestedSizeUsd);
    if (!isParsedTradingCapacity(capacity) || requestedSizeUsd === undefined || typeof raw.message !== "string") {
      throw new Error("Invalid insufficient-liquidity warning in prepare response");
    }

    return {
      code: raw.code,
      message: raw.message,
      details: {
        ...capacity,
        requestedSizeUsd,
      },
    };
  }

  if (
    raw?.code === "TRADING_CAPACITY_UNAVAILABLE" &&
    typeof raw.message === "string" &&
    ["STALE_MARKET_DATA", "JIT_DATA_UNAVAILABLE", "JIT_ACCOUNT_ELIGIBILITY_UNKNOWN", "COLLATERAL_SWAP"].includes(
      raw.details?.reason
    )
  ) {
    return {
      code: raw.code,
      message: raw.message,
      details: { reason: raw.details.reason },
    };
  }

  if (typeof raw?.code !== "string" || raw.code.length === 0 || typeof raw.message !== "string") {
    throw new Error("Invalid validation warning in prepare response");
  }

  return {
    code: "UNKNOWN_VALIDATION_WARNING",
    originalCode: raw.code,
    message: raw.message,
    ...(raw.details === undefined ? {} : { details: raw.details }),
  };
}

function parseValidationWarnings(raw: unknown): OrderValidationWarning[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new Error("Invalid validation warnings in prepare response");
  }

  return raw.map(parseValidationWarning);
}

function parsePrepareResponse(raw: any): PrepareOrderResponse {
  return {
    ...raw,
    estimates: parseEstimates(raw.estimates),
    validationWarnings: parseValidationWarnings(raw.validationWarnings),
  };
}

export async function prepareOrder(ctx: { api: IHttp }, request: PrepareOrderRequest): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/v1/orders/txns/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function submitOrder(ctx: { api: IHttp }, request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
  return ctx.api.postJson<SubmitOrderResponse>("/v1/orders/txns/submit", request);
}

export async function prepareEditOrder(
  ctx: { api: IHttp },
  request: PrepareEditOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/v1/orders/txns/edit/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function prepareCancelOrder(
  ctx: { api: IHttp },
  request: PrepareCancelOrderRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/v1/orders/txns/cancel/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function prepareCollateral(
  ctx: { api: IHttp },
  request: PrepareCollateralRequest
): Promise<PrepareOrderResponse> {
  return ctx.api.postJson<PrepareOrderResponse>("/v1/orders/txns/collateral/prepare", request, {
    transform: parsePrepareResponse,
  });
}

export async function fetchOrderStatus(ctx: { api: IHttp }, request: OrderStatusRequest): Promise<OrderStatusResponse> {
  return ctx.api.postJson<OrderStatusResponse>("/v1/orders/txns/status", request);
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
