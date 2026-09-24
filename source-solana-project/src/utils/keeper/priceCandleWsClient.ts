import { createClient, Client } from 'graphql-ws';
import { PRICE_CANDLE_WSS_ENDPOINT } from '@/config/url';

let priceCandleClient: Client | null = null;

export function getPriceCandleWsClient(): Client {
  if (!priceCandleClient) {
    priceCandleClient = createClient({
      url: PRICE_CANDLE_WSS_ENDPOINT,
      keepAlive: 10000,
      lazy: true,
      // Never give up reconnecting: retry forever on any abnormal close.
      retryAttempts: Infinity,
      shouldRetry: () => true,
      // retry time : 1→2→4→8→16→20s capped:20s.
      retryWait: async (retries) => {
        const delay = Math.min(20000, 1000 * 2 ** retries);
        const jitter = Math.floor(Math.random() * 1000);
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      },
      on: {
        connected: () => {
          console.log('[price-candle] WebSocket connected');
        },
        closed: (event) => {
          if ((event as CloseEvent).code !== 1000) {
            console.warn('[price-candle] WebSocket closed abnormally:', event);
          }
        },
        error: (err) => {
          console.error('[price-candle] WebSocket error:', err);
        },
      },
    });
  }
  return priceCandleClient;
}

export async function disposePriceCandleWsClient() {
  if (priceCandleClient) {
    await priceCandleClient.dispose();
    priceCandleClient = null;
  }
}
