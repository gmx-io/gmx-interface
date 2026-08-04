import type { TokenApproveBatchReason } from "lib/userAnalytics/types";

export type AtomicCapabilityStatus = "supported" | "ready" | "unsupported" | "unknown";

export type Eip5792Capabilities = Record<
  number,
  | {
      atomic?: {
        status?: string;
      };
    }
  | undefined
>;

export type AtomicCapabilitySessionKey = {
  connectorUid: string;
  account: string;
  chainId: number;
};

const disabledAtomicBatchingReasons = new Map<string, TokenApproveBatchReason | undefined>();
const atomicBatchingOverrideListeners = new Set<() => void>();

export function getAtomicCapabilityStatus(
  capabilities: Eip5792Capabilities | undefined,
  chainId: number
): AtomicCapabilityStatus {
  if (!capabilities) {
    return "unknown";
  }

  const atomicStatus = (capabilities[chainId]?.atomic ?? capabilities[0]?.atomic)?.status;

  if (!atomicStatus) {
    return "unsupported";
  }

  if (atomicStatus === "supported" || atomicStatus === "ready" || atomicStatus === "unsupported") {
    return atomicStatus;
  }

  return "unknown";
}

export function getAtomicCapabilityQueryKey({
  connectorUid,
  account,
  chainId,
}: {
  connectorUid: string | undefined;
  account: string | undefined;
  chainId: number;
}) {
  return ["eip5792AtomicCapability", connectorUid, account, chainId] as const;
}

function serializeAtomicCapabilitySessionKey({ connectorUid, account, chainId }: AtomicCapabilitySessionKey) {
  return JSON.stringify([connectorUid, account, chainId]);
}

export function isAtomicBatchingDisabledForSession(key: AtomicCapabilitySessionKey) {
  return disabledAtomicBatchingReasons.has(serializeAtomicCapabilitySessionKey(key));
}

export function disableAtomicBatchingForSession(key: AtomicCapabilitySessionKey, reason?: TokenApproveBatchReason) {
  const serializedKey = serializeAtomicCapabilitySessionKey(key);

  if (disabledAtomicBatchingReasons.has(serializedKey)) {
    return;
  }

  disabledAtomicBatchingReasons.set(serializedKey, reason);
  atomicBatchingOverrideListeners.forEach((listener) => listener());
}

export function consumeAtomicBatchingFallbackReason(key: AtomicCapabilitySessionKey) {
  const serializedKey = serializeAtomicCapabilitySessionKey(key);
  const reason = disabledAtomicBatchingReasons.get(serializedKey);

  if (reason) {
    disabledAtomicBatchingReasons.set(serializedKey, undefined);
  }

  return reason;
}

export function resetAtomicBatchingSessionOverride(key?: AtomicCapabilitySessionKey) {
  const didChange = key
    ? disabledAtomicBatchingReasons.delete(serializeAtomicCapabilitySessionKey(key))
    : disabledAtomicBatchingReasons.size > 0;

  if (!key) {
    disabledAtomicBatchingReasons.clear();
  }

  if (didChange) {
    atomicBatchingOverrideListeners.forEach((listener) => listener());
  }
}

export function subscribeToAtomicBatchingSessionOverrides(listener: () => void) {
  atomicBatchingOverrideListeners.add(listener);

  return () => atomicBatchingOverrideListeners.delete(listener);
}
