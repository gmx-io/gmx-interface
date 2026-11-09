// a wallet that turned a batch down or failed it keeps the step-by-step flow until the page reloads
const disabledSessionKeys = new Set<string>();
const listeners = new Set<() => void>();

export function getWalletBatchingSessionKey({
  connectorUid,
  account,
  chainId,
}: {
  connectorUid: string;
  account: string;
  chainId: number;
}) {
  return `${connectorUid}:${account}:${chainId}`;
}

export function getIsWalletBatchingDisabledForSession(sessionKey: string) {
  return disabledSessionKeys.has(sessionKey);
}

export function disableWalletBatchingForSession(sessionKey: string) {
  if (disabledSessionKeys.has(sessionKey)) {
    return;
  }

  disabledSessionKeys.add(sessionKey);
  listeners.forEach((listener) => listener());
}

export function subscribeToWalletBatchingSession(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
