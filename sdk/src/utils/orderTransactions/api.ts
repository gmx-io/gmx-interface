import type { ContractsChainId } from "configs/chains";
import { HttpError } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { parseTradingCapacity } from "utils/markets/api";
import type { TradingCapacity } from "utils/markets/types";
import { isUint256, parseUint256DecimalString } from "utils/numbers";
import { getRecord, getString, isRecord } from "utils/objects";
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
      code: "UNKNOWN_PREPARE_ORDER_ERROR";
      originalCode: string;
      message: string;
      traceId?: string;
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

function isDeserializedTradingCapacity(value: unknown): value is TradingCapacity {
  const raw = getRecord(value);
  if (!raw) {
    return false;
  }

  const parsed = parseTradingCapacity(raw);
  return parsed !== undefined && Object.entries(parsed).every(([key, parsedValue]) => raw[key] === parsedValue);
}

function isPrepareOrderFieldValidationErrors(value: unknown): value is PrepareOrderFieldValidationErrors {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((fieldError) => isRecord(fieldError) && typeof fieldError.message === "string");
}

function parsePrepareOrderErrorBody(value: unknown): PrepareOrderError | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const body = value;
  if (body.code === "INSUFFICIENT_LIQUIDITY") {
    const details = getRecord(body.details);
    const capacity = parseTradingCapacity(details);
    const requestedSizeUsd = parseUint256DecimalString(details?.requestedSizeUsd);
    if (!capacity || requestedSizeUsd === undefined || typeof body.message !== "string") {
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

  if (typeof body.code === "string" && body.code.length > 0 && typeof body.message === "string") {
    return {
      code: "UNKNOWN_PREPARE_ORDER_ERROR",
      originalCode: body.code,
      message: body.message,
      ...(typeof body.traceId === "string" ? { traceId: body.traceId } : {}),
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
  if (!isRecord(value)) {
    return false;
  }

  const error = value;
  if (error.code === "INSUFFICIENT_LIQUIDITY") {
    const details = getRecord(error.details);
    const requestedSizeUsd = details?.requestedSizeUsd;
    return Boolean(
      isDeserializedTradingCapacity(details) && isUint256(requestedSizeUsd) && typeof error.message === "string"
    );
  }

  if (PREPARE_ORDER_ERROR_CODES.includes(error.code as PrepareOrderErrorCode)) {
    return typeof error.message === "string";
  }

  if (error.code === "UNKNOWN_PREPARE_ORDER_ERROR") {
    return (
      typeof error.originalCode === "string" &&
      error.originalCode.length > 0 &&
      typeof error.message === "string" &&
      (error.traceId === undefined || typeof error.traceId === "string")
    );
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

function parseValidationWarning(raw: unknown): OrderValidationWarning | undefined {
  const warning = getRecord(raw);
  const code = getString(warning?.code);
  const message = getString(warning?.message);

  if (!warning || !code || !message) {
    return undefined;
  }

  const details = getRecord(warning.details);
  if (code === "INSUFFICIENT_LIQUIDITY") {
    const capacity = parseTradingCapacity(details);
    const requestedSizeUsd = parseUint256DecimalString(details?.requestedSizeUsd);
    if (capacity && requestedSizeUsd !== undefined) {
      return {
        code,
        message,
        details: {
          ...capacity,
          requestedSizeUsd,
        },
      };
    }
  }

  const reason = getString(details?.reason);
  if (
    code === "TRADING_CAPACITY_UNAVAILABLE" &&
    (reason === "STALE_MARKET_DATA" ||
      reason === "JIT_DATA_UNAVAILABLE" ||
      reason === "JIT_ACCOUNT_ELIGIBILITY_UNKNOWN" ||
      reason === "COLLATERAL_SWAP")
  ) {
    return {
      code,
      message,
      details: { reason },
    };
  }

  return {
    code: "UNKNOWN_VALIDATION_WARNING",
    originalCode: code,
    message,
    ...(warning.details === undefined ? {} : { details: warning.details }),
  };
}

function parseValidationWarnings(raw: unknown): OrderValidationWarning[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    return undefined;
  }

  return raw.map(parseValidationWarning).filter((warning): warning is OrderValidationWarning => warning !== undefined);
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
