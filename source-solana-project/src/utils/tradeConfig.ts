import { TRADE_CONFIG_LOCALSTORAGE_KEY } from '@/config/localStorage';

const TRADE_CONFIG_REQUEST_TIMEOUT_MS = 3000;

type TradeConfig = {
  enableSlowTrigger?: boolean;
  slowInterfaceTrigger?: number;
};

/** Fetch and cache the remote config without making startup dependent on it. */
export async function preloadTradeConfig(): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    TRADE_CONFIG_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(import.meta.env.VITE_TRADE_CONFIG_URL, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Trade config request failed: ${response.status}`);
    }

    const config: unknown = await response.json();
    localStorage.setItem(TRADE_CONFIG_LOCALSTORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Unable to preload trade config:', error);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getTradeConfig(): TradeConfig {
  try {
    const config = localStorage.getItem(TRADE_CONFIG_LOCALSTORAGE_KEY);
    return config ? (JSON.parse(config) as TradeConfig) : {};
  } catch (error) {
    console.warn('Unable to read trade config:', error);
    return {};
  }
}
