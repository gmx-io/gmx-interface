import { ARBITRUM, getViemChain } from "configs/chains";
import type {
  PrepareOrderRequest,
  PrepareOrderResponse,
  SubmitOrderResponse,
  OrderStatusResponse,
} from "utils/orderTransactions/api";
import { PrivateKeySigner } from "utils/signer";
import type { IAbstractSigner } from "utils/signer";

import { GmxApiSdk } from "../index";

export const TEST_CHAIN_ID = ARBITRUM;

export const TEST_SYMBOL = "ETH/USD [WETH-USDC]";
export const TEST_SIZE_USD = 10n * 10n ** 30n; // $10
export const TEST_COLLATERAL = { amount: 1000000n, token: "USDC" }; // 1 USDC


const TERMINAL_STATUSES = new Set(["executed", "cancelled", "relay_failed", "relay_reverted"]);

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
  return new PrivateKeySigner(
    pk as `0x${string}`,
    rpcUrl ? { rpcUrl, chain: getViemChain(TEST_CHAIN_ID) } : undefined
  );
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
  const parts = [
    `[order:${status.status}]`,
    `id=${status.requestId}`,
  ];

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
