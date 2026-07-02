import IsomorphicWebSocket from "isomorphic-ws";

import { FrameMeta, StreamServerFrame, StreamStatus, Unsubscribe, WebSocketCtor, WebSocketLike } from "./types";

const DEFAULT_RECONNECT_BASE_MS = 500;
const DEFAULT_RECONNECT_MAX_MS = 10_000;

export type ChannelFrame = { data: unknown } & FrameMeta;
type ChannelListener = (frame: ChannelFrame) => void;

function resolveWebSocketCtor(injected?: WebSocketCtor): WebSocketCtor {
  return injected ?? (IsomorphicWebSocket as unknown as WebSocketCtor);
}

export class WsStreamClient {
  status: StreamStatus = "closed";

  private ws?: WebSocketLike;
  private readonly url: string;
  private readonly WebSocketImpl: WebSocketCtor;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly listeners = new Map<string, Set<ChannelListener>>();
  private readonly statusListeners = new Set<(status: StreamStatus) => void>();
  private reconnectDelay: number;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private closedByUser = false;

  constructor(params: {
    url: string;
    webSocketImpl?: WebSocketCtor;
    reconnectBaseMs?: number;
    reconnectMaxMs?: number;
  }) {
    this.url = params.url;
    this.WebSocketImpl = resolveWebSocketCtor(params.webSocketImpl);
    this.reconnectBaseMs = params.reconnectBaseMs ?? DEFAULT_RECONNECT_BASE_MS;
    this.reconnectMaxMs = params.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;
    this.reconnectDelay = this.reconnectBaseMs;
  }

  subscribe(channel: string, listener: ChannelListener): Unsubscribe {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(listener);

    this.ensureConnected();
    if (this.status === "live") {
      this.sendOp("subscribe", [channel]);
    }

    return () => {
      const current = this.listeners.get(channel);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(channel);
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

  private connect() {
    this.setStatus(this.status === "closed" ? "connecting" : "reconnecting");

    let ws: WebSocketLike;
    try {
      ws = new this.WebSocketImpl(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = this.reconnectBaseMs;
      this.setStatus("live");
      const channels = [...this.listeners.keys()];
      if (channels.length) {
        this.sendOp("subscribe", channels);
      }
    };
    ws.onmessage = (ev) => this.onMessage(ev.data);
    ws.onclose = () => this.onClose();
    ws.onerror = () => {
      // a close event always follows; reconnection is handled there
    };
  }

  private onMessage(raw: unknown) {
    const text = typeof raw === "string" ? raw : String(raw);
    let frame: StreamServerFrame;
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }
    if ("op" in frame || frame.type !== "snapshot") {
      return;
    }
    if (frame.data === undefined) {
      return;
    }
    const set = this.listeners.get(frame.ch);
    if (!set) {
      return;
    }
    const payload: ChannelFrame = {
      data: frame.data,
      serverTs: frame.serverTs,
      originTs: frame.originTs,
      receivedAt: Date.now(),
      byteLength: text.length,
    };
    for (const listener of set) {
      listener(payload);
    }
  }

  private onClose() {
    this.ws = undefined;
    if (this.closedByUser || this.listeners.size === 0) {
      this.setStatus("closed");
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxMs);
  }

  private sendOp(op: "subscribe" | "unsubscribe", channels: string[]) {
    try {
      this.ws?.send(JSON.stringify({ op, channels }));
    } catch {
      // socket raced into a non-open state; resubscribe runs on reconnect
    }
  }

  private setStatus(status: StreamStatus) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.listeners.clear();
    try {
      this.ws?.close();
    } catch {
      // already closing
    }
    this.ws = undefined;
    this.setStatus("closed");
  }
}
