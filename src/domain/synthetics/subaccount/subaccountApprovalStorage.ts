import { SOURCE_CHAIN_IDS, type ContractsChainId, type SourceChainId } from "config/chains";
import { getSubaccountApprovalKey } from "config/localStorage";
import { isSourceChain } from "config/multichain";
import { readLocalStorageItem, removeLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import { getSubaccountApprovalContextSrcChainId } from "./utils";

export function serializeSubaccountApproval(approval: SignedSubaccountApproval | undefined): string {
  if (!approval) {
    return "";
  }

  return JSON.stringify(approval, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

export function deserializeSubaccountApproval(stored: string): SignedSubaccountApproval | undefined {
  if (!stored) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      maxAllowedCount: BigInt(parsed.maxAllowedCount),
      expiresAt: BigInt(parsed.expiresAt),
      deadline: BigInt(parsed.deadline),
      nonce: BigInt(parsed.nonce),
      desChainId: BigInt(parsed.desChainId),
    };
  } catch (e) {
    return undefined;
  }
}

export function readStoredSubaccountApproval(
  chainId: ContractsChainId,
  account: string,
  srcChainId: SourceChainId | undefined
): SignedSubaccountApproval | undefined {
  const key = getSubaccountApprovalKey(chainId, account, srcChainId);

  if (!key) {
    return undefined;
  }

  return readLocalStorageItem(key, { deserializer: deserializeSubaccountApproval });
}

export function writeStoredSubaccountApproval(
  chainId: ContractsChainId,
  account: string,
  approval: SignedSubaccountApproval
): void {
  const key = getSubaccountApprovalKey(chainId, account, getSubaccountApprovalContextSrcChainId(chainId, approval));

  if (!key) {
    return;
  }

  writeLocalStorageItem(key, approval, { serializer: serializeSubaccountApproval });
}

function getRelatedSourceChainIds(chainId: ContractsChainId): SourceChainId[] {
  return SOURCE_CHAIN_IDS.filter((sourceChainId) => isSourceChain(sourceChainId, chainId));
}

export function removeAllStoredSubaccountApprovals(chainId: ContractsChainId, account: string): void {
  const contextSrcChainIds: (SourceChainId | undefined)[] = [undefined, ...getRelatedSourceChainIds(chainId)];

  for (const srcChainId of contextSrcChainIds) {
    const key = getSubaccountApprovalKey(chainId, account, srcChainId);

    if (key) {
      removeLocalStorageItem(key);
    }
  }
}

export function migrateLegacySubaccountApprovalSlot(chainId: ContractsChainId, account: string | undefined): void {
  if (!account) {
    return;
  }

  const legacyApproval = readStoredSubaccountApproval(chainId, account, undefined);

  if (!legacyApproval) {
    return;
  }

  const contextSrcChainId = getSubaccountApprovalContextSrcChainId(chainId, legacyApproval);

  if (contextSrcChainId === undefined) {
    return;
  }

  const existingContextApproval = readStoredSubaccountApproval(chainId, account, contextSrcChainId);

  if (!existingContextApproval) {
    writeStoredSubaccountApproval(chainId, account, legacyApproval);

    if (!readStoredSubaccountApproval(chainId, account, contextSrcChainId)) {
      return;
    }
  }

  const legacyKey = getSubaccountApprovalKey(chainId, account, undefined);

  if (legacyKey) {
    removeLocalStorageItem(legacyKey);
  }
}

export function findFallbackSubaccountApproval(
  chainId: ContractsChainId,
  account: string,
  subaccountAddress: string
): SignedSubaccountApproval | undefined {
  const contextSrcChainIds: (SourceChainId | undefined)[] = [undefined, ...getRelatedSourceChainIds(chainId)];

  let latestApproval: SignedSubaccountApproval | undefined;

  for (const srcChainId of contextSrcChainIds) {
    const candidate = readStoredSubaccountApproval(chainId, account, srcChainId);

    if (!candidate || candidate.subaccount !== subaccountAddress) {
      continue;
    }

    if (!latestApproval || candidate.signedAt > latestApproval.signedAt) {
      latestApproval = candidate;
    }
  }

  return latestApproval;
}
