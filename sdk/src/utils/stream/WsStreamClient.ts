import IsomorphicWebSocket from "isomorphic-ws";

import { FrameMeta, StreamServerFrame, StreamStatus, Unsubscribe, WebSocketCtor, WebSocketLike } from "./types";

const DEFAULT_RECONNECT_BASE_MS = 500;
const DEFAULT_RECONNECT_MAX_MS = 10_000;
const DEFAULT_PROBE_INTERVAL_MS = 15_000;
const DEFAULT_PROBE_TIMEOUT_MS = 10_000;
// a socket that stayed up this long proves the path works; one dropped sooner keeps backing off
const STABLE_CONNECTION_MS = 30_000;
const REFUSED_MESSAGE = "subscription refused";

export type ChannelFrame = { data: unknown } & FrameMeta;
type ChannelListener = (frame: ChannelFrame) => void;
type ErrorListener = (error: { message: string }) => void;
type ChannelSubscriber = { onFrame: ChannelListener; onError?: ErrorListener };
type OpFrame = Extract<StreamServerFrame, { op: string }>;

function resolveWebSocketCtor(injected?: WebSocketCtor): WebSocketCtor {
  return injected ?? IsomorphicWebSocket;
}

export function callListener<T>(listener: (value: T) => void, value: T) {
  try {
    listener(value);
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
  }
}

export class WsStreamClient {
  status: StreamStatus = "closed";

  private ws?: WebSocketLike;
  private readonly url: string;
  private readonly WebSocketImpl: WebSocketCtor;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly probeIntervalMs: number;
  private readonly probeTimeoutMs: number;
  private readonly random: () => number;
  private readonly listeners = new Map<string, Set<ChannelSubscriber>>();
  private readonly statusListeners = new Set<(status: StreamStatus) => void>();
  private readonly lastFrameByChannel = new Map<string, ChannelFrame>();
  private readonly originTsByChannel = new Map<string, number>();
  private readonly refusalByChannel = new Map<string, { message: string }>();
  private pendingOps: { op: "subscribe" | "unsubscribe"; channels: string[] }[] = [];
  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private probeTimer?: ReturnType<typeof setTimeout>;
  private probeTimeoutTimer?: ReturnType<typeof setTimeout>;
  private messageCount = 0;
  private openedAt?: number;
  private closedByUser = false;

  constructor(params: {
    url: string;
    webSocketImpl?: WebSocketCtor;
    reconnectBaseMs?: number;
    reconnectMaxMs?: number;
    probeIntervalMs?: number;
    probeTimeoutMs?: number;
    random?: () => number;
  }) {
    this.url = params.url;
    this.WebSocketImpl = resolveWebSocketCtor(params.webSocketImpl);
    this.reconnectBaseMs = params.reconnectBaseMs ?? DEFAULT_RECONNECT_BASE_MS;
    this.reconnectMaxMs = params.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;
    this.probeIntervalMs = params.probeIntervalMs ?? DEFAULT_PROBE_INTERVAL_MS;
    this.probeTimeoutMs = params.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
    this.random = params.random ?? Math.random;
  }

  subscribe(channel: string, listener: ChannelListener, onError?: ErrorListener): Unsubscribe {
    const subscriber: ChannelSubscriber = { onFrame: listener, onError };
    const existing = this.listeners.get(channel);
    if (existing) {
      existing.add(subscriber);
      const frame = this.lastFrameByChannel.get(channel);
      const refusal = this.refusalByChannel.get(channel);
      queueMicrotask(() => this.replay(channel, subscriber, frame, refusal));
    } else {
      this.listeners.set(channel, new Set([subscriber]));
    }

    this.ensureConnected();
    if (!existing && this.status === "live") {
      this.sendOp("subscribe", [channel]);
    }

    return () => {
      const current = this.listeners.get(channel);
      if (!current?.delete(subscriber)) {
        return;
      }
      if (current.size === 0) {
        this.listeners.delete(channel);
        this.lastFrameByChannel.delete(channel);
        this.originTsByChannel.delete(channel);
        this.refusalByChannel.delete(channel);
        if (this.status === "live") {
          this.sendOp("unsubscribe", [channel]);
        }
      }
      if (this.listeners.size === 0) {
        this.close();
      }
    };
  }

  addStatusListener(listener: (status: StreamStatus) => void): Unsubscribe {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private ensureConnected() {
    if (this.ws || this.reconnectTimer) {
      return;
    }
    this.closedByUser = false;
    this.connect();
  }

  private canConnect() {
    return !this.ws && !this.closedByUser && this.listeners.size > 0;
  }

  private connect() {
    if (!this.canConnect()) {
      return;
    }
    this.setStatus(this.status === "closed" ? "connecting" : "reconnecting");
    if (!this.canConnect()) {
      return;
    }
    this.pendingOps = [];
    this.refusalByChannel.clear();
    this.openedAt = undefined;

    let ws: WebSocketLike;
    try {
      ws = new this.WebSocketImpl(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) {
        return;
      }
      this.openedAt = Date.now();
      const channels = [...this.listeners.keys()];
      if (channels.length) {
        this.sendOp("subscribe", channels);
      }
      this.setStatus("live");
    };
    ws.onmessage = (ev: { data: unknown }) => {
      if (this.ws === ws) {
        this.onMessage(ev.data);
      }
    };
    ws.onclose = () => {
      if (this.ws === ws) {
        this.onClose();
      }
    };
    ws.onerror = () => {
      // a close event always follows; reconnection is handled there
    };
  }

  private onMessage(raw: unknown) {
    this.messageCount += 1;
    const text = typeof raw === "string" ? raw : String(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return;
    }
    const frame = parsed as StreamServerFrame;
    if ("op" in frame) {
      this.onOp(frame);
      return;
    }
    if (frame.type !== "snapshot") {
      return;
    }
    if (frame.data === undefined) {
      return;
    }
    const set = this.listeners.get(frame.ch);
    if (!set) {
      return;
    }
    if (typeof frame.originTs === "number") {
      const newest = this.originTsByChannel.get(frame.ch);
      if (newest !== undefined && frame.originTs < newest) {
        return;
      }
      this.originTsByChannel.set(frame.ch, frame.originTs);
    }
    const payload: ChannelFrame = {
      data: frame.data,
      serverTs: frame.serverTs,
      originTs: frame.originTs,
      receivedAt: Date.now(),
      byteLength: text.length,
    };
    this.lastFrameByChannel.set(frame.ch, payload);
    this.refusalByChannel.delete(frame.ch);
    for (const subscriber of set) {
      callListener(subscriber.onFrame, payload);
    }
  }

  private onOp(frame: OpFrame) {
    if (frame.op === "error") {
      if (!Array.isArray(frame.channels)) {
        return;
      }
      const pending = this.pendingOps[0];
      for (const channel of frame.channels) {
        if (pending?.op === "subscribe") {
          pending.channels = pending.channels.filter((requested) => requested !== channel);
        }
        this.refuse(channel, frame.message);
      }
      return;
    }
    if (frame.op !== "ack") {
      return;
    }
    const pending = this.pendingOps.shift();
    if (pending?.op !== "subscribe" || !Array.isArray(frame.channels)) {
      return;
    }
    for (const channel of pending.channels) {
      if (!frame.channels.includes(channel)) {
        this.refuse(channel, REFUSED_MESSAGE);
      }
    }
  }

  private refuse(channel: string, message: string) {
    const set = this.listeners.get(channel);
    if (!set) {
      return;
    }
    const error = { message };
    this.refusalByChannel.set(channel, error);
    for (const subscriber of set) {
      if (subscriber.onError) {
        callListener(subscriber.onError, error);
      }
    }
  }

  private replay(
    channel: string,
    subscriber: ChannelSubscriber,
    frame: ChannelFrame | undefined,
    refusal: { message: string } | undefined
  ) {
    if (!this.listeners.get(channel)?.has(subscriber)) {
      return;
    }
    // only while still current: anything newer already reached this subscriber directly
    if (frame && frame === this.lastFrameByChannel.get(channel)) {
      callListener(subscriber.onFrame, frame);
    }
    if (refusal && refusal === this.refusalByChannel.get(channel) && subscriber.onError) {
      callListener(subscriber.onError, refusal);
    }
  }

  private onClose() {
    this.ws = undefined;
    this.noteSocketEnded();
    if (this.closedByUser || this.listeners.size === 0) {
      this.setStatus("closed");
      return;
    }
    this.scheduleReconnect();
  }

  private noteSocketEnded() {
    if (this.openedAt !== undefined && Date.now() - this.openedAt >= STABLE_CONNECTION_MS) {
      this.reconnectAttempt = 0;
    }
    this.openedAt = undefined;
  }

  private scheduleReconnect() {
    const ceiling = Math.min(this.reconnectMaxMs, this.reconnectBaseMs * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(
      () => {
        this.reconnectTimer = undefined;
        this.connect();
      },
      ceiling / 2 + (this.random() * ceiling) / 2
    );
    this.setStatus("reconnecting");
  }

  private startProbe() {
    this.probeTimer = setTimeout(() => {
      const messagesAtProbe = this.messageCount;
      this.sendOp("subscribe", []);
      if (!this.probeTimeoutTimer) {
        this.probeTimeoutTimer = setTimeout(() => {
          this.probeTimeoutTimer = undefined;
          if (this.messageCount === messagesAtProbe) {
            this.dropSocket();
            this.noteSocketEnded();
            this.scheduleReconnect();
          }
        }, this.probeTimeoutMs);
      }
      this.startProbe();
    }, this.probeIntervalMs);
  }

  private stopProbe() {
    clearTimeout(this.probeTimer);
    clearTimeout(this.probeTimeoutTimer);
    this.probeTimer = undefined;
    this.probeTimeoutTimer = undefined;
  }

  private sendOp(op: "subscribe" | "unsubscribe", channels: string[]) {
    try {
      this.ws?.send(JSON.stringify({ op, channels }));
      this.pendingOps.push({ op, channels });
    } catch {
      // socket raced into a non-open state; resubscribe runs on reconnect
    }
  }

  private setStatus(status: StreamStatus) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    if (status === "live") {
      this.startProbe();
    } else {
      this.stopProbe();
    }
    for (const listener of this.statusListeners) {
      if (this.status !== status) {
        return;
      }
      callListener(listener, status);
    }
  }

  private dropSocket() {
    const ws = this.ws;
    this.ws = undefined;
    if (!ws) {
      return;
    }
    // onerror stays attached: ws in Node throws on an unhandled "error" when a CONNECTING socket is closed
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch {
      // already closing
    }
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.listeners.clear();
    this.lastFrameByChannel.clear();
    this.originTsByChannel.clear();
    this.refusalByChannel.clear();
    this.reconnectAttempt = 0;
    this.dropSocket();
    this.setStatus("closed");
  }
}
