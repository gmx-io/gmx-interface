import { FrameMeta, StreamStatus, Subscription, Unsubscribe } from "./types";
import { callListener, ChannelFrame, WsStreamClient } from "./WsStreamClient";

export function createChannelSubscription<T>(
  client: WsStreamClient,
  channel: string,
  transform: (raw: unknown) => T
): Subscription<T> {
  let value: T | undefined;
  let meta: FrameMeta | undefined;
  const listeners = new Set<(value: T) => void>();
  const errorListeners = new Set<(error: { message: string }) => void>();
  const statusUnsubscribers = new Set<Unsubscribe>();

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
      for (const listener of errorListeners) {
        callListener(listener, error);
      }
    }
  );

  return {
    get: () => value,
    getMeta: () => meta,
    get status() {
      return client.status;
    },
    subscribe(listener: (value: T) => void): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeStatus(listener: (status: StreamStatus) => void): Unsubscribe {
      const remove = client.addStatusListener(listener);
      statusUnsubscribers.add(remove);
      return () => {
        statusUnsubscribers.delete(remove);
        remove();
      };
    },
    subscribeError(listener: (error: { message: string }) => void): Unsubscribe {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },
    close() {
      listeners.clear();
      errorListeners.clear();
      statusUnsubscribers.forEach((remove) => remove());
      statusUnsubscribers.clear();
      unsubscribeTransport();
    },
  };
}
