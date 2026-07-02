import { describe, expect, it, vi } from "vitest";

import { createChannelSubscription } from "../subscription";
import type { StreamStatus } from "../types";
import type { ChannelFrame, WsStreamClient } from "../WsStreamClient";

function makeFakeClient() {
  let frameListener: ((frame: ChannelFrame) => void) | undefined;
  let statusListener: ((status: StreamStatus) => void) | undefined;
  const transportUnsub = vi.fn();
  const statusUnsub = vi.fn();
  const client = {
    status: "live" as StreamStatus,
    subscribe: vi.fn((_channel: string, listener: (frame: ChannelFrame) => void) => {
      frameListener = listener;
      return transportUnsub;
    }),
    addStatusListener: vi.fn((listener: (status: StreamStatus) => void) => {
      statusListener = listener;
      return statusUnsub;
    }),
  };
  return {
    client: client as unknown as WsStreamClient,
    raw: client,
    transportUnsub,
    emitFrame: (frame: ChannelFrame) => frameListener?.(frame),
    emitStatus: (status: StreamStatus) => statusListener?.(status),
  };
}

function frame(data: unknown, over: Partial<ChannelFrame> = {}): ChannelFrame {
  return { data, serverTs: 1000, receivedAt: 1002, byteLength: 20, originTs: 900, ...over };
}

describe("createChannelSubscription", () => {
  it("subscribes to the channel transport on creation", () => {
    const { client, raw } = makeFakeClient();
    createChannelSubscription(client, "prices", (value) => value);
    expect(raw.subscribe).toHaveBeenCalledWith("prices", expect.any(Function));
  });

  it("returns undefined value and meta before the first frame", () => {
    const { client } = makeFakeClient();
    const sub = createChannelSubscription(client, "prices", (value) => value);
    expect(sub.get()).toBeUndefined();
    expect(sub.getMeta()).toBeUndefined();
  });

  it("applies the transform and exposes value + meta after a frame", () => {
    const { client, emitFrame } = makeFakeClient();
    const sub = createChannelSubscription<number>(client, "prices", (value) => (value as number) * 2);
    emitFrame(frame(5));
    expect(sub.get()).toBe(10);
    expect(sub.getMeta()).toEqual({ serverTs: 1000, receivedAt: 1002, byteLength: 20, originTs: 900 });
  });

  it("fans out the transformed value to all listeners", () => {
    const { client, emitFrame } = makeFakeClient();
    const sub = createChannelSubscription<number>(client, "prices", (value) => (value as number) + 1);
    const l1 = vi.fn();
    const l2 = vi.fn();
    sub.subscribe(l1);
    sub.subscribe(l2);
    emitFrame(frame(7));
    expect(l1).toHaveBeenCalledWith(8);
    expect(l2).toHaveBeenCalledWith(8);
  });

  it("stops a listener after its unsubscribe", () => {
    const { client, emitFrame } = makeFakeClient();
    const sub = createChannelSubscription(client, "prices", (value) => value);
    const listener = vi.fn();
    const off = sub.subscribe(listener);
    off();
    emitFrame(frame(1));
    expect(listener).not.toHaveBeenCalled();
  });

  it("reflects the live client status", () => {
    const { client, raw } = makeFakeClient();
    const sub = createChannelSubscription(client, "prices", (value) => value);
    expect(sub.status).toBe("live");
    raw.status = "reconnecting";
    expect(sub.status).toBe("reconnecting");
  });

  it("forwards status changes via subscribeStatus", () => {
    const { client, raw, emitStatus } = makeFakeClient();
    const sub = createChannelSubscription(client, "prices", (value) => value);
    const cb = vi.fn();
    sub.subscribeStatus(cb);
    expect(raw.addStatusListener).toHaveBeenCalled();
    emitStatus("reconnecting");
    expect(cb).toHaveBeenCalledWith("reconnecting");
  });

  it("close() unsubscribes the transport and stops listeners", () => {
    const { client, emitFrame, transportUnsub } = makeFakeClient();
    const sub = createChannelSubscription(client, "prices", (value) => value);
    const listener = vi.fn();
    sub.subscribe(listener);

    sub.close();
    expect(transportUnsub).toHaveBeenCalled();

    listener.mockClear();
    emitFrame(frame(1));
    expect(listener).not.toHaveBeenCalled();
  });
});
