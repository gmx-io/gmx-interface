const STORAGE_CHANNEL_NAME = "gmx-subaccount-storage";

type SubaccountStorageMessage = {
  chainId: number;
  account: string;
};

export async function withSubaccountTabLock<T>(chainId: number, account: string, fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;

  if (!locks) {
    return fn();
  }

  return locks.request(`gmx-subaccount:${chainId}:${account}`, () => fn());
}

export function notifySubaccountStorageChanged(chainId: number, account: string): void {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(STORAGE_CHANNEL_NAME);
  channel.postMessage({ chainId, account } satisfies SubaccountStorageMessage);
  channel.close();
}

export function subscribeSubaccountStorageChanges(chainId: number, account: string, onChange: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }

  const channel = new BroadcastChannel(STORAGE_CHANNEL_NAME);

  channel.onmessage = (event: MessageEvent<SubaccountStorageMessage>) => {
    if (event.data?.chainId === chainId && event.data?.account === account) {
      onChange();
    }
  };

  return () => channel.close();
}
