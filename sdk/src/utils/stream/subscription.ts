import { FrameMeta, StreamStatus, Subscription, Unsubscribe } from "./types";
import { ChannelFrame, WsStreamClient } from "./WsStreamClient";

export function createChannelSubscription<T>(
  client: WsStreamClient,
  channel: string,
  transform: (raw: unknown) => T
): Subscription<T> {
  let value: T | undefined;
  let meta: FrameMeta | undefined;
  const listeners = new Set<(value: T) => void>();

  const unsubscribeTransport = client.subscribe(channel, (frame: ChannelFrame) => {
    value = transform(frame.data);
    meta = {
      serverTs: frame.serverTs,
      receivedAt: frame.receivedAt,
      byteLength: frame.byteLength,
      originTs: frame.originTs,
    };
    for (const listener of listeners) {
      listener(value);
    }
  });

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
      return client.addStatusListener(listener);
    },
    close() {
      listeners.clear();
      unsubscribeTransport();
    },
  };
}
