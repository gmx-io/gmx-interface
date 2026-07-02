import type { AnyChainId } from "configs/chains";
import { toBigInt } from "utils/numbers";
import { nowInSeconds } from "utils/time";

import type { SubaccountApprovalPrepareResponse, SubaccountStatusResponse } from "./api";
import type {
  SdkSubaccountApproval,
  SdkSubaccountStatus,
  SignedSubaccountApproval,
  StoredSubaccountApproval,
} from "./types";

export function parseSubaccountStatus(status: SubaccountStatusResponse): SdkSubaccountStatus {
  return {
    active: status.active,
    maxAllowedCount: toBigInt(status.maxAllowedCount) ?? 0n,
    currentActionsCount: toBigInt(status.currentActionsCount) ?? 0n,
    remainingActions: toBigInt(status.remainingActions) ?? 0n,
    expiresAt: toBigInt(status.expiresAt) ?? 0n,
    approvalNonce: toBigInt(status.approvalNonce) ?? 0n,
    multichainApprovalNonce: toBigInt(status.multichainApprovalNonce) ?? 0n,
    integrationId: status.integrationId ?? undefined,
  };
}

export function isSubaccountStatusUsable(status: SdkSubaccountStatus | undefined): boolean {
  return (
    status !== undefined && status.active && status.remainingActions > 0n && status.expiresAt > BigInt(nowInSeconds())
  );
}

export function isEmptySubaccountApproval(approval: SdkSubaccountApproval): boolean {
  return approval.signature === "0x";
}

export function isSameSubaccountApproval(a: SdkSubaccountApproval, b: SdkSubaccountApproval): boolean {
  return a.signature === b.signature && toBigInt(a.nonce) === toBigInt(b.nonce);
}

export function shouldRefreshExplicitSubaccountApproval(
  approval: SdkSubaccountApproval,
  status: SdkSubaccountStatus | undefined,
  pendingApproval: StoredSubaccountApproval | undefined
): boolean {
  if (isEmptySubaccountApproval(approval)) {
    return false;
  }

  if (pendingApproval?.submittedRequestId && isSameSubaccountApproval(approval, pendingApproval.message)) {
    return true;
  }

  return (
    status !== undefined &&
    (isSubaccountApprovalSynced(approval, status) ||
      isSubaccountApprovalNonceExpired(approval, status) ||
      isSubaccountApprovalExpired(approval))
  );
}

export function isSubaccountApprovalNonceExpired(
  approval: SdkSubaccountApproval,
  status: SdkSubaccountStatus
): boolean {
  return toBigInt(approval.nonce) !== status.approvalNonce;
}

export function isSubaccountApprovalSynced(approval: SdkSubaccountApproval, status: SdkSubaccountStatus): boolean {
  return (
    status.active &&
    status.maxAllowedCount === toBigInt(approval.maxAllowedCount) &&
    status.expiresAt === toBigInt(approval.expiresAt)
  );
}

export function isSubaccountApprovalExpired(approval: SdkSubaccountApproval): boolean {
  const now = BigInt(nowInSeconds());
  return (toBigInt(approval.expiresAt) ?? 0n) <= now || (toBigInt(approval.deadline) ?? 0n) <= now;
}

export function toSignedSubaccountApproval(
  prepared: SubaccountApprovalPrepareResponse,
  signature: string
): SignedSubaccountApproval {
  return {
    subaccount: prepared.message.subaccount,
    shouldAdd: Boolean(prepared.message.shouldAdd),
    expiresAt: toBigInt(prepared.message.expiresAt) ?? 0n,
    maxAllowedCount: toBigInt(prepared.message.maxAllowedCount) ?? 0n,
    actionType: prepared.message.actionType,
    nonce: toBigInt(prepared.message.nonce ?? prepared.nonce) ?? 0n,
    desChainId: toBigInt(prepared.message.desChainId) ?? 0n,
    deadline: toBigInt(prepared.message.deadline) ?? 0n,
    integrationId: prepared.message.integrationId,
    signature,
    signedAt: Date.now(),
    signatureChainId: prepared.domain.chainId as AnyChainId,
    subaccountRouterAddress: prepared.relayRouterAddress,
  };
}
