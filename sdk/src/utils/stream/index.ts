export { WsStreamClient } from "./WsStreamClient";
export type { ChannelFrame } from "./WsStreamClient";
export { createChannelSubscription } from "./subscription";
export type { FrameMeta, StreamStatus, Subscription, Unsubscribe, WebSocketCtor, WebSocketLike } from "./types";

export function toStreamUrl(apiUrl: string): string {
  return apiUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/v1/stream";
}
