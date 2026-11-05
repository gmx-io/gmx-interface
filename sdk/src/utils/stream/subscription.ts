import { FrameMeta, StreamConnectionStatus, Subscription, Unsubscribe } from "./types";
import { callListener, ChannelFrame, WsStreamClient } from "./WsStreamClient";

export function createChannelSubscription<T>(
  client: WsStreamClient,
  channel: string,
  transform: (raw: unknown) => T
): Subscription<T> {
  let value: T | undefined;
  let meta: FrameMeta | undefined;
  const listeners = new Set<(value: T) => void>();
  const refusalListeners = new Set<(error: { message: string }) => void>();
  const connectionStatusUnsubscribers = new Set<Unsubscribe>();

  const unsubscribeTransport = client.subscribe(
    channel,
    (frame: ChannelFrame) => {
      value = transform(frame.data);
      meta = {
        serverTs: frame.serverTs,
        receivedAt: frame.receivedAt,
        byteLength: frame.byteLength,
        originTs: frame.originTs,
      };
      for (const listener of listeners) {
        callListener(listener, value);
      }
    },
    (error) => {
      for (const listener of refusalListeners) {
        callListener(listener, error);
      }
    }
  );

  return {
    get: () => value,
    getMeta: () => meta,
    get connectionStatus() {
      return client.connectionStatus;
    },
    subscribe(listener: (value: T) => void): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeConnectionStatus(listener: (status: StreamConnectionStatus) => void): Unsubscribe {
      const remove = client.subscribeConnectionStatus(listener);
      connectionStatusUnsubscribers.add(remove);
      return () => {
        connectionStatusUnsubscribers.delete(remove);
        remove();
      };
    },
    subscribeRefusal(listener: (error: { message: string }) => void): Unsubscribe {
      refusalListeners.add(listener);
      return () => {
        refusalListeners.delete(listener);
      };
    },
    close() {
      listeners.clear();
      refusalListeners.clear();
      connectionStatusUnsubscribers.forEach((remove) => remove());
      connectionStatusUnsubscribers.clear();
      unsubscribeTransport();
    },
  };
}
