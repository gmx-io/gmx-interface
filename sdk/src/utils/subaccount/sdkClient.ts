import type { ContractsChainId } from "configs/chains";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "configs/express";
import type { IHttp } from "utils/http/types";
import {
  prepareOrder as prepareOrderRaw,
  signPreparedOrder,
  submitOrder as submitOrderRaw,
} from "utils/orderTransactions/api";
import type {
  PrepareCancelOrderRequest,
  PrepareCollateralRequest,
  PrepareEditOrderRequest,
  PrepareOrderRequest,
  PrepareOrderResponse,
  SubmitOrderRequest,
  SubmitOrderResponse,
} from "utils/orderTransactions/api";
import type { IAbstractSigner } from "utils/signer";
import { nowInSeconds } from "utils/time";

import { fetchSubaccountStatus, prepareSubaccountApproval, signSubaccountApproval } from "./api";
import { generateSubaccount } from "./generateSubaccount";
import { getEmptySubaccountApproval } from "./getEmptySubaccountApproval";
import {
  isEmptySubaccountApproval,
  isSameSubaccountApproval,
  isSubaccountApprovalExpired,
  isSubaccountApprovalNonceExpired,
  isSubaccountApprovalSynced,
  isSubaccountStatusUsable,
  parseSubaccountStatus,
  shouldRefreshExplicitSubaccountApproval,
  toSignedSubaccountApproval,
} from "./state";
import type { SdkSubaccountApproval, SdkSubaccountStatus, SubaccountState } from "./types";

export type SdkSubaccountClientContext = {
  ctx: { chainId: ContractsChainId; api: IHttp };
  owner: object;
  preparedSubaccountApprovals: Map<string, SdkSubaccountApproval>;
  getSubaccount: () => SubaccountState | undefined;
  setSubaccount: (subaccount: SubaccountState | undefined) => void;
};

export type SubaccountPrepareRequest =
  | PrepareOrderRequest
  | PrepareEditOrderRequest
  | PrepareCancelOrderRequest
  | PrepareCollateralRequest;

export type PrepareWithContext<TRequest extends SubaccountPrepareRequest> = (
  ctx: { api: IHttp },
  request: TRequest
) => Promise<PrepareOrderResponse>;

const sdkSubaccountSigners = new WeakMap<object, Awaited<ReturnType<typeof generateSubaccount>>["signer"]>();
const MAX_PREPARED_SUBACCOUNT_APPROVALS = 100;
const SUBACCOUNT_STATUS_CACHE_TTL_MS = 15000;
const LOW_SUBACCOUNT_ACTIONS_REFRESH_THRESHOLD = 1n;
const SUBMITTED_ORDER_STATUSES = new Set<SubmitOrderResponse["status"]>([
  "relay_accepted",
  "relay_pending",
  "relay_submitted",
  "created",
  "executed",
]);
const FINAL_ORDER_STATUSES = new Set<SubmitOrderResponse["status"]>(["created", "executed"]);

function hasSdkSubaccountSigner(owner: object): boolean {
  return sdkSubaccountSigners.has(owner);
}

function getSdkSubaccountSigner(owner: object) {
  return sdkSubaccountSigners.get(owner);
}

function isSameAddress(a: string | undefined, b: string | undefined): boolean {
  return a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();
}

function hasDifferentSubaccountAccount(subaccount: SubaccountState, account: string): boolean {
  return subaccount.account !== undefined && !isSameAddress(subaccount.account, account);
}

function throwSubaccountAccountMismatch(subaccount: SubaccountState, account: string): never {
  throw new Error(
    `Subaccount ${subaccount.address} belongs to account ${subaccount.account}; requested account is ${account}.`
  );
}

function throwSubaccountAddressMismatch(source: string, provided: string, expected: string): never {
  throw new Error(`${source} ${provided} does not match generated subaccount ${expected}.`);
}

function resetSdkSubaccount(client: SdkSubaccountClientContext): void {
  sdkSubaccountSigners.delete(client.owner);
  client.preparedSubaccountApprovals.clear();
  client.setSubaccount(undefined);
}

function getUsableSubaccountApproval(client: SdkSubaccountClientContext): SdkSubaccountApproval | undefined {
  const subaccount = client.getSubaccount();

  if (!subaccount || !isSubaccountStatusUsable(subaccount.onchainData)) {
    return undefined;
  }

  return getEmptySubaccountApproval(client.ctx.chainId, subaccount.address);
}

function isSubaccountStatusCacheFresh(subaccount: SubaccountState, account: string): boolean {
  return (
    isSameAddress(subaccount.account, account) &&
    subaccount.onchainData !== undefined &&
    subaccount.lastStatusFetchedAt !== undefined &&
    Date.now() - subaccount.lastStatusFetchedAt < SUBACCOUNT_STATUS_CACHE_TTL_MS
  );
}

function assertSdkSubaccountRequest(
  request: SubaccountPrepareRequest,
  subaccount: SubaccountState,
  approval: SdkSubaccountApproval | undefined
): void {
  if (request.subaccountAddress && !isSameAddress(request.subaccountAddress, subaccount.address)) {
    throwSubaccountAddressMismatch("subaccountAddress", request.subaccountAddress, subaccount.address);
  }

  if (approval?.subaccount && !isSameAddress(approval.subaccount, subaccount.address)) {
    throwSubaccountAddressMismatch("subaccountApproval.subaccount", approval.subaccount, subaccount.address);
  }
}

function shouldRefreshSubaccountApprovalForPrepare(
  approval: SdkSubaccountApproval,
  subaccount: SubaccountState,
  account: string
): boolean {
  if (isEmptySubaccountApproval(approval)) {
    return false;
  }

  return (
    !isSubaccountStatusCacheFresh(subaccount, account) ||
    shouldRefreshExplicitSubaccountApproval(approval, subaccount.onchainData, subaccount.approval)
  );
}

function shouldRefreshLowActionSubaccountStatus(
  status: SdkSubaccountStatus | undefined,
  alreadyRefreshed: boolean
): boolean {
  return (
    !alreadyRefreshed && status !== undefined && status.remainingActions <= LOW_SUBACCOUNT_ACTIONS_REFRESH_THRESHOLD
  );
}

function prunePreparedSubaccountApprovals(client: SdkSubaccountClientContext): void {
  while (client.preparedSubaccountApprovals.size > MAX_PREPARED_SUBACCOUNT_APPROVALS) {
    const oldestRequestId = client.preparedSubaccountApprovals.keys().next().value;
    if (!oldestRequestId) {
      return;
    }
    client.preparedSubaccountApprovals.delete(oldestRequestId);
  }
}

function isOrderSubmitAccepted(response: SubmitOrderResponse): boolean {
  return response.error === undefined && SUBMITTED_ORDER_STATUSES.has(response.status);
}

function markSubaccountApprovalSubmitted(
  subaccount: SubaccountState | undefined,
  approval: SdkSubaccountApproval | undefined,
  requestId: string | undefined
): void {
  if (!approval || !requestId || isEmptySubaccountApproval(approval)) {
    return;
  }

  const pendingApproval = subaccount?.approval;

  if (pendingApproval && isSameSubaccountApproval(pendingApproval.message, approval)) {
    pendingApproval.submittedRequestId = requestId;
  }
}

function markSubaccountActionSubmitted(
  subaccount: SubaccountState | undefined,
  approval: SdkSubaccountApproval | undefined
): void {
  if (!subaccount?.onchainData || !approval || !isEmptySubaccountApproval(approval)) {
    return;
  }

  subaccount.onchainData.currentActionsCount += 1n;
  subaccount.onchainData.remainingActions =
    subaccount.onchainData.remainingActions > 0n ? subaccount.onchainData.remainingActions - 1n : 0n;
}

export function hasActiveSdkSubaccount(client: SdkSubaccountClientContext): boolean {
  const subaccount = client.getSubaccount();

  return (
    hasSdkSubaccountSigner(client.owner) &&
    (subaccount?.approval !== undefined || isSubaccountStatusUsable(subaccount?.onchainData))
  );
}

export function getSdkSubaccountApprovalMessage(client: SdkSubaccountClientContext): SdkSubaccountApproval | undefined {
  const subaccount = client.getSubaccount();

  if (!subaccount) {
    return undefined;
  }

  if (subaccount.approval) {
    return subaccount.approval.message;
  }

  return getUsableSubaccountApproval(client);
}

export async function generateSdkSubaccount(
  client: SdkSubaccountClientContext,
  mainSigner: IAbstractSigner
): Promise<string> {
  client.preparedSubaccountApprovals.clear();
  const result = await generateSubaccount(mainSigner);

  sdkSubaccountSigners.set(client.owner, result.signer);
  client.setSubaccount({
    account: mainSigner.address,
    address: result.address,
  });

  return result.address;
}

export function reconcileSdkSubaccountApproval(subaccount: SubaccountState | undefined): void {
  const approval = subaccount?.approval?.message;
  const status = subaccount?.onchainData;

  if (!subaccount || !approval || !status) {
    return;
  }

  if (
    isSubaccountApprovalSynced(approval, status) ||
    isSubaccountApprovalNonceExpired(approval, status) ||
    isSubaccountApprovalExpired(approval)
  ) {
    subaccount.approval = undefined;
  }
}

export async function refreshSdkSubaccountState(
  client: SdkSubaccountClientContext,
  account: string
): Promise<SdkSubaccountStatus | undefined> {
  const subaccount = client.getSubaccount();

  if (!subaccount) {
    return undefined;
  }

  if (hasDifferentSubaccountAccount(subaccount, account)) {
    throwSubaccountAccountMismatch(subaccount, account);
  }

  const status = parseSubaccountStatus(
    await fetchSubaccountStatus(client.ctx, {
      account,
      subaccountAddress: subaccount.address,
    })
  );

  subaccount.account = account;
  subaccount.onchainData = status;
  subaccount.lastStatusFetchedAt = Date.now();
  reconcileSdkSubaccountApproval(subaccount);

  return status;
}

async function getSdkSubaccountStatus(
  client: SdkSubaccountClientContext,
  account: string,
  options?: { force?: boolean }
): Promise<SdkSubaccountStatus | undefined> {
  const subaccount = client.getSubaccount();

  if (!subaccount) {
    return undefined;
  }

  if (hasDifferentSubaccountAccount(subaccount, account)) {
    throwSubaccountAccountMismatch(subaccount, account);
  }

  if (!options?.force && isSubaccountStatusCacheFresh(subaccount, account)) {
    reconcileSdkSubaccountApproval(subaccount);
    return subaccount.onchainData;
  }

  return refreshSdkSubaccountState(client, account);
}

export async function activateSdkSubaccount(
  client: SdkSubaccountClientContext,
  mainSigner: IAbstractSigner,
  options?: { expiresInSeconds?: number; maxAllowedCount?: number | bigint },
  knownStatus?: SdkSubaccountStatus
): Promise<string> {
  const existingSubaccount = client.getSubaccount();

  if (existingSubaccount && hasDifferentSubaccountAccount(existingSubaccount, mainSigner.address)) {
    resetSdkSubaccount(client);
  }

  if (!client.getSubaccount()) {
    await generateSdkSubaccount(client, mainSigner);
  }

  const status = knownStatus ?? (await getSdkSubaccountStatus(client, mainSigner.address, { force: true }));
  const subaccount = client.getSubaccount()!;
  const requestedExpiresAt = BigInt(nowInSeconds() + (options?.expiresInSeconds ?? DEFAULT_SUBACCOUNT_EXPIRY_DURATION));
  const expiresAt = status && status.expiresAt > requestedExpiresAt ? status.expiresAt : requestedExpiresAt;
  const requestedMaxAllowedCount =
    options?.maxAllowedCount !== undefined
      ? BigInt(options.maxAllowedCount)
      : (status?.currentActionsCount ?? 0n) + BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);

  if (
    status &&
    isSubaccountStatusUsable(status) &&
    status.maxAllowedCount >= requestedMaxAllowedCount &&
    status.expiresAt >= requestedExpiresAt
  ) {
    subaccount.approval = undefined;
    return subaccount.address;
  }

  const prepared = await prepareSubaccountApproval(client.ctx, {
    account: mainSigner.address,
    subaccountAddress: subaccount.address,
    shouldAdd: status?.active !== true,
    expiresAt: String(expiresAt),
    maxAllowedCount: String(requestedMaxAllowedCount),
  });

  const signature = await signSubaccountApproval(prepared, mainSigner, {
    chainId: client.ctx.chainId,
    expectedSubaccountAddress: subaccount.address,
  });

  const message = toSignedSubaccountApproval(prepared, signature);

  subaccount.approval = {
    message,
  };

  return subaccount.address;
}

export async function getSdkSubaccountApprovalForOrder(
  client: SdkSubaccountClientContext,
  account: string,
  mainSigner?: IAbstractSigner,
  options?: { forceRefresh?: boolean }
): Promise<SdkSubaccountApproval | undefined> {
  const subaccount = client.getSubaccount();

  if (!subaccount || !hasSdkSubaccountSigner(client.owner)) {
    return undefined;
  }

  if (hasDifferentSubaccountAccount(subaccount, account)) {
    if (mainSigner && isSameAddress(mainSigner.address, account)) {
      await activateSdkSubaccount(client, mainSigner);
      return client.getSubaccount()?.approval?.message ?? getUsableSubaccountApproval(client);
    }

    throwSubaccountAccountMismatch(subaccount, account);
  }

  const forceStatusRefresh = Boolean(options?.forceRefresh || subaccount.approval?.submittedRequestId !== undefined);
  let status = await getSdkSubaccountStatus(client, account, {
    force: forceStatusRefresh,
  });

  // After forced refresh due to submittedRequestId, clear the flag if approval still exists (relay failed but approval is still valid)
  if (subaccount.approval?.submittedRequestId !== undefined) {
    subaccount.approval.submittedRequestId = undefined;
  }

  const pendingApproval = subaccount.approval;

  if (pendingApproval) {
    if (pendingApproval.submittedRequestId) {
      throw new Error(
        `Subaccount approval is pending in request ${pendingApproval.submittedRequestId}. ` +
          "Refresh subaccount state after it is submitted on-chain before preparing another subaccount order."
      );
    }

    if (!isSubaccountApprovalExpired(pendingApproval.message)) {
      return pendingApproval.message;
    }

    subaccount.approval = undefined;
  }

  if (isSubaccountStatusUsable(status)) {
    if (shouldRefreshLowActionSubaccountStatus(status, forceStatusRefresh)) {
      status = await getSdkSubaccountStatus(client, account, { force: true });
    }
  }

  if (isSubaccountStatusUsable(status)) {
    return getUsableSubaccountApproval(client);
  }

  if (mainSigner) {
    await activateSdkSubaccount(client, mainSigner, undefined, status);
    return client.getSubaccount()?.approval?.message ?? getUsableSubaccountApproval(client);
  }

  throw new Error("Subaccount is not active. Call activateSubaccount(mainSigner) before preparing express orders.");
}

export async function prepareWithSubaccount<TRequest extends SubaccountPrepareRequest>(
  client: SdkSubaccountClientContext,
  request: TRequest,
  prepareFn: PrepareWithContext<TRequest>,
  mainSigner?: IAbstractSigner
): Promise<PrepareOrderResponse> {
  let enrichedRequest = request;
  let subaccountApproval: SdkSubaccountApproval | undefined;
  const subaccount = client.getSubaccount();

  if (request.mode === "express" && subaccount && hasSdkSubaccountSigner(client.owner)) {
    if (hasDifferentSubaccountAccount(subaccount, request.from)) {
      throwSubaccountAccountMismatch(subaccount, request.from);
    }

    subaccountApproval = request.subaccountApproval as SdkSubaccountApproval | undefined;
    assertSdkSubaccountRequest(request, subaccount, subaccountApproval);

    if (subaccountApproval && shouldRefreshSubaccountApprovalForPrepare(subaccountApproval, subaccount, request.from)) {
      subaccountApproval = await getSdkSubaccountApprovalForOrder(client, request.from, mainSigner, {
        forceRefresh: true,
      });
    } else if (!subaccountApproval) {
      subaccountApproval = await getSdkSubaccountApprovalForOrder(client, request.from, mainSigner);
    } else if (isEmptySubaccountApproval(subaccountApproval)) {
      let status = await getSdkSubaccountStatus(client, request.from);
      if (shouldRefreshLowActionSubaccountStatus(status, false)) {
        status = await getSdkSubaccountStatus(client, request.from, { force: true });
      }
      if (!isSubaccountStatusUsable(status)) {
        throw new Error("Subaccount is not active. Call activateSubaccount(mainSigner) before preparing express orders.");
      }
    }

    if (subaccountApproval) {
      assertSdkSubaccountRequest(request, client.getSubaccount()!, subaccountApproval);
      enrichedRequest = {
        ...request,
        subaccountAddress: request.subaccountAddress ?? client.getSubaccount()!.address,
        subaccountApproval,
      };
    }
  }

  const prepared = await prepareFn(client.ctx, enrichedRequest);

  if (prepared.requestId && subaccountApproval) {
    client.preparedSubaccountApprovals.set(prepared.requestId, subaccountApproval);
    prunePreparedSubaccountApprovals(client);
  }

  return prepared;
}

export function signOrderWithSubaccount(
  client: SdkSubaccountClientContext,
  prepared: PrepareOrderResponse,
  signer: IAbstractSigner
): Promise<string> {
  const subSigner = client.preparedSubaccountApprovals.has(prepared.requestId)
    ? getSdkSubaccountSigner(client.owner)
    : undefined;
  const effectiveSigner = subSigner ?? signer;
  const accountAddress = subSigner ? signer.address : undefined;

  return signPreparedOrder(prepared, effectiveSigner, client.ctx.chainId, accountAddress);
}

export async function submitOrderWithSubaccount(
  client: SdkSubaccountClientContext,
  request: SubmitOrderRequest
): Promise<SubmitOrderResponse> {
  const subaccountApproval = request.requestId ? client.preparedSubaccountApprovals.get(request.requestId) : undefined;
  const enrichedRequest =
    subaccountApproval && request.eip712Data
      ? {
          ...request,
          eip712Data: {
            ...request.eip712Data,
            subaccountApproval,
          },
        }
      : request;

  const response = await submitOrderRaw(client.ctx, enrichedRequest);

  if (isOrderSubmitAccepted(response)) {
    markSubaccountApprovalSubmitted(
      client.getSubaccount(),
      subaccountApproval,
      request.requestId ?? response.requestId
    );
    if (FINAL_ORDER_STATUSES.has(response.status)) {
      markSubaccountActionSubmitted(client.getSubaccount(), subaccountApproval);
    }
    if (request.requestId) {
      client.preparedSubaccountApprovals.delete(request.requestId);
    }
  }

  return response;
}

export async function executeExpressOrderWithSubaccount(
  client: SdkSubaccountClientContext,
  request: PrepareOrderRequest,
  signer: IAbstractSigner
): Promise<SubmitOrderResponse> {
  const prepared = await prepareWithSubaccount(client, request, prepareOrderRaw, signer);
  const signature = await signOrderWithSubaccount(client, prepared, signer);
  const isSubaccountOrder = client.preparedSubaccountApprovals.has(prepared.requestId);

  return submitOrderWithSubaccount(client, {
    mode: prepared.mode,
    requestId: prepared.requestId,
    signature,
    from: isSubaccountOrder ? request.from : signer.address,
    idempotencyKey: prepared.idempotencyKey,
    eip712Data: {
      batchParams: prepared.payload.batchParams,
      relayParams: prepared.payload.relayParams,
    },
  });
}

export function clearSdkSubaccount(client: SdkSubaccountClientContext): void {
  resetSdkSubaccount(client);
}
