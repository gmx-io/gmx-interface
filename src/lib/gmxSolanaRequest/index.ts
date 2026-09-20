import { createGmxSolanaRequest, createGmxSolanaWebSocket } from "sdk/utils/gmxSolanaRequest";
import type { GmxSolanaWebSocketOptions } from "sdk/utils/gmxSolanaRequest";

export { HttpError } from "sdk/utils/gmxSolanaRequest";

export const gmxSolanaRequest = createGmxSolanaRequest(() => import.meta.env.VITE_GMX_SOLANA_API_ENDPOINT);

export function createGmxSolanaWebSocketClient(options?: GmxSolanaWebSocketOptions) {
  return createGmxSolanaWebSocket(() => import.meta.env.VITE_GMX_SOLANA_WSS_ENV, options);
}
