export const WHALES_PATH = "/whales";

export function buildWhaleMarketUrl(market: string): string {
  return `/whales/market/${market}`;
}

export function buildWhaleAccountUrl(account: string): string {
  return `/whales/account/${account}`;
}
