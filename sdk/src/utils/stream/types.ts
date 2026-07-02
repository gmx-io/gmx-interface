export type StreamStatus = "connecting" | "live" | "reconnecting" | "closed";

export type Unsubscribe = () => void;

export type FrameMeta = {
  serverTs: number;
  receivedAt: number;
  byteLength: number;
  // Origin (oracle/keeper) timestamp of the payload, when the producer forwards it.
  // Lets the consumer measure true end-to-end freshness against the same reference REST uses.
  originTs?: number;
};

export interface Subscription<T> {
  get(): T | undefined;
  getMeta(): FrameMeta | undefined;
  subscribe(listener: (value: T) => void): Unsubscribe;
  subscribeStatus(listener: (status: StreamStatus) => void): Unsubscribe;
  readonly status: StreamStatus;
  close(): void;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export type WebSocketCtor = new (url: string) => WebSocketLike;

// Wire protocol — mirrors gmx-api src/stream/protocol.ts.
export type StreamServerFrame =
  | { op: "ack"; channels: string[] }
  | { op: "error"; message: string }
  | { ch: string; type: "snapshot"; serverTs: number; originTs?: number; data: unknown };
