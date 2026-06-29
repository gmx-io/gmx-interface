import { ARBITRUM, getViemChain } from "configs/chains";
import { sleep } from "utils/common";
import type { IHttp } from "utils/http/types";
import type {
  PrepareCancelOrderRequest,
  PrepareCollateralRequest,
  PrepareEditOrderRequest,
  OrderStatusResponse,
  PrepareOrderRequest,
  PrepareOrderResponse,
  SubmitOrderRequest,
  SubmitOrderResponse,
} from "utils/orderTransactions/api";
import { PrivateKeySigner } from "utils/signer";
import type { IAbstractSigner } from "utils/signer";
import type { SubaccountStatusRequest, SubaccountStatusResponse } from "utils/subaccount/api";

import { GmxApiSdk } from "../index";

export const TEST_CHAIN_ID = ARBITRUM;

export const TEST_SYMBOL = "ETH/USD [WETH-USDC]";
export const TEST_SIZE_USD = 10n * 10n ** 30n; // $10
export const TEST_COLLATERAL = { amount: 1000000n, token: "USDC" }; // 1 USDC

const TERMINAL_STATUSES = new Set(["executed", "cancelled", "relay_failed", "relay_reverted"]);
const ORDER_PREPARE_PATHS = new Set([
  "/v1/orders/txns/prepare",
  "/v1/orders/txns/edit/prepare",
  "/v1/orders/txns/cancel/prepare",
  "/v1/orders/txns/collateral/prepare",
]);

export type RecordedOrderPrepareRequest =
  | PrepareOrderRequest
  | PrepareEditOrderRequest
  | PrepareCancelOrderRequest
  | PrepareCollateralRequest;

export class RecordingApi implements IHttp {
  url: string;
  orderPrepareRequests: RecordedOrderPrepareRequest[] = [];
  orderSubmitRequests: SubmitOrderRequest[] = [];

  constructor(private delegate: IHttp) {
    this.url = delegate.url;
  }

  fetchJson<TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ): Promise<TResult> {
    return this.delegate.fetchJson(path, opts);
  }

  postJson<TResult>(path: string, body: unknown, opts?: { transform?: (result: any) => TResult }): Promise<TResult> {
    if (ORDER_PREPARE_PATHS.has(path)) {
      this.orderPrepareRequests.push(body as RecordedOrderPrepareRequest);
    } else if (path === "/v1/orders/txns/submit") {
      this.orderSubmitRequests.push(body as SubmitOrderRequest);
    }

    return this.delegate.postJson(path, body, opts);
  }
}

export function buildPreparedOrderResponse(requestId: string): PrepareOrderResponse {
  return {
    requestId,
    mode: "express",
    payloadType: "typed-data",
    payload: {
      batchParams: {},
      relayParams: {},
    },
  };
}

export class ScriptedOrderApi implements IHttp {
  url = "http://test";
  prepareRequests: PrepareOrderRequest[] = [];
  submitRequests: SubmitOrderRequest[] = [];
  subaccountStatusRequests: SubaccountStatusRequest[] = [];

  constructor(
    private readonly prepareResponse: PrepareOrderResponse,
    private readonly submitResponses: SubmitOrderResponse[] = [],
    private readonly subaccountStatusResponses: SubaccountStatusResponse[] = []
  ) {}

  fetchJson<TResult>(
    path: string,
    _opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ): Promise<TResult> {
    return Promise.reject(new Error(`Unexpected fetchJson call ${path}`));
  }

  postJson<TResult>(path: string, body: unknown, opts?: { transform?: (result: any) => TResult }): Promise<TResult> {
    if (path === "/v1/orders/txns/prepare") {
      this.prepareRequests.push(body as PrepareOrderRequest);
      return Promise.resolve(
        opts?.transform ? opts.transform(this.prepareResponse) : (this.prepareResponse as TResult)
      );
    }

    if (path === "/v1/orders/txns/submit") {
      this.submitRequests.push(body as SubmitOrderRequest);
      const response = this.submitResponses.shift();
      if (!response) {
        return Promise.reject(new Error("Unexpected submit call"));
      }
      return Promise.resolve(response as TResult);
    }

    if (path === "/v1/subaccounts/status") {
      this.subaccountStatusRequests.push(body as SubaccountStatusRequest);
      const response = this.subaccountStatusResponses.shift();
      if (!response) {
        return Promise.reject(new Error("Unexpected subaccount status call"));
      }
      return Promise.resolve(response as TResult);
    }

    return Promise.reject(new Error(`Unexpected API path ${path}`));
  }
}

export function buildSubaccountStatusResponse(
  overrides: Partial<SubaccountStatusResponse> = {}
): SubaccountStatusResponse {
  return {
    active: true,
    maxAllowedCount: "10",
    currentActionsCount: "0",
    remainingActions: "10",
    expiresAt: String(Math.floor(Date.now() / 1000) + 86400),
    approvalNonce: "0",
    multichainApprovalNonce: "0",
    integrationId: null,
    ...overrides,
  };
}

export function getTestSdk() {
  // eslint-disable-next-line no-restricted-globals
  const apiUrl = process.env.GMX_TEST_API_URL;
  return new GmxApiSdk({ chainId: TEST_CHAIN_ID, ...(apiUrl && { apiUrl }) });
}

export function getTestSigner(): PrivateKeySigner | undefined {
  // eslint-disable-next-line no-restricted-globals
  const pk = process.env.GMX_TEST_PRIVATE_KEY;
  if (!pk) return undefined;
  // eslint-disable-next-line no-restricted-globals
  const rpcUrl = process.env.GMX_TEST_RPC_URL;
  return new PrivateKeySigner(pk as `0x${string}`, rpcUrl ? { rpcUrl, chain: getViemChain(TEST_CHAIN_ID) } : undefined);
}

export function requireSigner(): PrivateKeySigner {
  const signer = getTestSigner();
  if (!signer) {
    throw new Error("GMX_TEST_PRIVATE_KEY env var is required for this test");
  }
  return signer;
}

export function hasRpcUrl(): boolean {
  // eslint-disable-next-line no-restricted-globals
  return !!process.env.GMX_TEST_RPC_URL;
}

export async function waitForOrderStatus(
  sdk: GmxApiSdk,
  requestId: string,
  timeoutMs = 60000
): Promise<OrderStatusResponse> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await sdk.fetchOrderStatus({ requestId });

    if (TERMINAL_STATUSES.has(status.status)) {
      if (status.status !== "executed") {
        logOrderFailure(status);
      }
      return status;
    }

    await sleep(2000);
  }

  return sdk.fetchOrderStatus({ requestId });
}

function logOrderFailure(status: OrderStatusResponse): void {
  const parts = [`[order:${status.status}]`, `id=${status.requestId}`];

  if (status.error) {
    parts.push(`error=${status.error.code}: ${status.error.message}`);
  }
  if (status.cancellationReason) {
    parts.push(`reason=${status.cancellationReason}`);
  }
  if (status.traceId) {
    parts.push(`trace=${status.traceId}`);
  }
  if (status.taskId) {
    parts.push(`task=${status.taskId}`);
  }
  if (status.createdTxnHash) {
    parts.push(`createTx=${status.createdTxnHash}`);
  }
  if (status.executionTxnHash) {
    parts.push(`execTx=${status.executionTxnHash}`);
  }

  // eslint-disable-next-line no-console
  console.warn(parts.join(" "));
}

export async function expressFlow(
  sdk: GmxApiSdk,
  signer: IAbstractSigner,
  request: PrepareOrderRequest
): Promise<{ prepared: PrepareOrderResponse; signature: string; submitted: SubmitOrderResponse }> {
  const prepared = await sdk.prepareOrder(request);
  const signature = await sdk.signOrder(prepared, signer);
  const submitted = await sdk.submitOrder({
    mode: prepared.mode,
    requestId: prepared.requestId,
    signature,
    from: signer.address,
    idempotencyKey: prepared.idempotencyKey,
    eip712Data: {
      batchParams: prepared.payload.batchParams,
      relayParams: prepared.payload.relayParams,
      subaccountApproval: request.subaccountApproval,
    },
  });

  return { prepared, signature, submitted };
}

export async function waitForOrdersUpdate(
  sdk: GmxApiSdk,
  account: string,
  predicate: (orders: any[]) => boolean,
  timeoutMs = 15000
): Promise<any[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(2000);
    const orders = await sdk.fetchOrders({ address: account });
    if (predicate(orders)) return orders;
  }
  return sdk.fetchOrders({ address: account });
}

export async function waitForPositionUpdate(
  sdk: GmxApiSdk,
  account: string,
  predicate: (positions: any[]) => boolean,
  timeoutMs = 15000
): Promise<any[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(2000);
    const positions = await sdk.fetchPositionsInfo({ address: account });
    if (predicate(positions)) return positions;
  }
  // Final attempt
  return sdk.fetchPositionsInfo({ address: account });
}

export async function activateTestSubaccount(
  sdkSub: GmxApiSdk,
  signer: IAbstractSigner,
  account: string
): Promise<void> {
  const subAddr = await sdkSub.generateSubaccount(signer);
  const status = await sdkSub.fetchSubaccountStatus({ account, subaccountAddress: subAddr });
  const maxAllowedCount = Number(status.currentActionsCount) + 50;

  await sdkSub.activateSubaccount(signer, {
    expiresInSeconds: 86400,
    maxAllowedCount,
  });
}
