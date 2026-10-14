import { IHttp } from "utils/http/types";

import type {
  TransitAuthorizationParams,
  TransitAuthorizationResponse,
  TransitFeeTierResponse,
  TransitOrder,
  TransitOrdersParams,
  TransitOrdersResponse,
  TransitQuote,
  TransitQuoteParams,
  TransitRoute,
  TransitRoutesParams,
} from "./types";

export async function fetchApiTransitRoutes(
  ctx: { api: IHttp },
  params?: TransitRoutesParams
): Promise<TransitRoute[]> {
  const raw: any = await ctx.api.fetchJson("/v1/paxos/transit/routes", {
    query: { filter: params?.filter, feeTier: params?.feeTier },
  });
  return (raw.routes ?? []).map(parseRoute);
}

export async function fetchApiTransitFeeTier(
  ctx: { api: IHttp },
  params: { userAddress: string }
): Promise<TransitFeeTierResponse> {
  const raw: any = await ctx.api.fetchJson("/v1/paxos/transit/fee-tier", {
    query: { userAddress: params.userAddress },
  });
  return {
    feeTier: raw.feeTier,
    zeroFeeCapacity: BigInt(raw.zeroFeeCapacity),
  };
}

export async function fetchApiTransitAuthorization(
  ctx: { api: IHttp },
  params: TransitAuthorizationParams
): Promise<TransitAuthorizationResponse> {
  return ctx.api.fetchJson<TransitAuthorizationResponse>("/v1/paxos/transit/authorization", {
    query: {
      userAddress: params.userAddress,
      tokenAddress: params.tokenAddress,
      spenderAddress: params.spenderAddress,
      amount: params.amount.toString(),
      chainId: params.chainId,
    },
  });
}

export async function fetchApiTransitQuote(ctx: { api: IHttp }, params: TransitQuoteParams): Promise<TransitQuote> {
  const raw: any = await ctx.api.fetchJson("/v1/paxos/transit/orders/quote", {
    query: {
      userAddress: params.userAddress,
      offerAsset: params.offerAsset,
      wantAsset: params.wantAsset,
      offerAmount: params.offerAmount.toString(),
      sourceChainId: params.sourceChainId,
      destinationChainId: params.destinationChainId,
      permitSignature: params.permitSignature,
      permitDeadline: params.permitDeadline,
      responseFormat: params.responseFormat,
      feeTier: params.feeTier,
    },
  });
  return parseQuote(raw);
}

export async function fetchApiTransitOrder(ctx: { api: IHttp }, params: { orderId: string }): Promise<TransitOrder> {
  const raw: any = await ctx.api.fetchJson(`/v1/paxos/transit/orders/${encodeURIComponent(params.orderId)}`);
  return parseOrder(raw.order);
}

export async function fetchApiTransitOrders(
  ctx: { api: IHttp },
  params: TransitOrdersParams
): Promise<TransitOrdersResponse> {
  const raw: any = await ctx.api.fetchJson("/v1/paxos/transit/orders", {
    query: {
      userAddress: params.userAddress,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      filter: params.filter,
    },
  });
  return {
    orders: (raw.orders ?? []).map(parseOrder),
    nextPageToken: raw.nextPageToken || undefined,
  };
}

function parseRoute(raw: any): TransitRoute {
  return {
    sourceChainId: Number(raw.sourceChainId),
    destinationChainId: Number(raw.destinationChainId),
    destinationChainEID: Number(raw.destinationChainEID),
    offerAsset: raw.offerAsset,
    wantAsset: raw.wantAsset,
    minOrderSize: BigInt(raw.minOrderSize),
    tokenMetadataMap: raw.tokenMetadataMap ?? {},
  };
}

function parseQuote(raw: any): TransitQuote {
  return {
    transaction: {
      to: raw.transaction.to,
      data: raw.transaction.data,
      value: BigInt(raw.transaction.value ?? 0),
      abi: raw.transaction.abi,
      functionName: raw.transaction.functionName,
      args: raw.transaction.args,
    },
    amountOut: BigInt(raw.amountOut),
    protocolFee: BigInt(raw.protocolFee),
    fillCostFee: BigInt(raw.fillCostFee),
    conversionRateFee: BigInt(raw.conversionRateFee),
    conversionRateHundredthsBps: Number(raw.conversionRateHundredthsBps),
    integratorFee: BigInt(raw.integratorFee ?? 0),
    totalFees: BigInt(raw.totalFees),
    estimatedLatencyMs: raw.estimatedLatencyMs === undefined ? undefined : Number(raw.estimatedLatencyMs),
  };
}

function parseOrder(raw: any): TransitOrder {
  return {
    id: raw.id,
    offerAsset: raw.offerAsset,
    wantAsset: raw.wantAsset,
    amountDue: BigInt(raw.amountDue),
    remainingAmountDue: BigInt(raw.remainingAmountDue),
    offerAmount: BigInt(raw.offerAmount),
    receiver: raw.receiver,
    distributorCode: raw.distributorCode,
    destinationChainId: Number(raw.destinationChainId),
    sourceChainId: Number(raw.sourceChainId),
    receiveTime: Number(raw.receiveTime),
    status: raw.status,
    user: raw.user,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    tokenMetadata: raw.tokenMetadata ?? {},
    orderExecuteds: (raw.orderExecuteds ?? []).map((execution: any) => ({
      id: execution.id,
      amount: BigInt(execution.amount),
      remaining: BigInt(execution.remaining),
      timestamp: Number(execution.timestamp),
      txHash: execution.txHash,
      chainId: Number(execution.chainId),
    })),
  };
}
