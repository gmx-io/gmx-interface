interface GlvMarketReference {
  marketToken?: unknown;
  marketTokenAddress?: unknown;
  [key: string]: unknown;
}

interface MarketOpenState {
  closed?: boolean;
}

function getMarketToken(market: GlvMarketReference): string | undefined {
  const marketToken = market.marketToken ?? market.marketTokenAddress;
  if (marketToken === undefined || marketToken === null) return undefined;

  const value = String(marketToken);
  return value ? value : undefined;
}

export function areGlvMarketsOpen(
  glvMarkets: unknown,
  marketInfosMap: ReadonlyMap<string, unknown>
): boolean {
  if (!Array.isArray(glvMarkets) || glvMarkets.length === 0) return false;

  return glvMarkets.every((market: unknown) => {
    if (!market || typeof market !== 'object') return false;

    const marketToken = getMarketToken(market as GlvMarketReference);
    if (!marketToken) return false;

    const marketInfo = marketInfosMap.get(marketToken) as
      | MarketOpenState
      | undefined;
    return marketInfo?.closed === false;
  });
}
