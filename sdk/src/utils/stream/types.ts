export type StreamConnectionStatus = "connecting" | "live" | "reconnecting" | "closed";

export type StreamCandlePeriod = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

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
  subscribeConnectionStatus(listener: (status: StreamConnectionStatus) => void): Unsubscribe;
  subscribeError(listener: (error: { message: string }) => void): Unsubscribe;
  readonly connectionStatus: StreamConnectionStatus;
  close(): void;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: any) => void) | null;
  onmessage: ((ev: any) => void) | null;
  onclose: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
}

export type WebSocketCtor = new (url: string, ...rest: any[]) => WebSocketLike;

// Wire protocol — mirrors gmx-api src/lib/stream/protocol.ts.
export type StreamServerFrame =
  | { op: "ack"; channels: string[] }
  | { op: "error"; message: string; channels: string[] }
  | { ch: string; type: "snapshot"; serverTs: number; originTs?: number; data: unknown };
