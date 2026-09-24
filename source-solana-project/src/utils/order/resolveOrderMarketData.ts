import type { Order } from '@/selectors/order/types';

type MarketIndexTokenSource = {
  indexToken?: unknown;
};

export function resolveOrderMarketData<TTicker>(
  order: Pick<Order, 'marketTokenAddress'>,
  marketsMap: Map<string, unknown>,
  tokenPriceMap?: Map<string, TTicker>
) {
  const marketTokenAddress = order.marketTokenAddress.toBase58();
  const market = marketsMap.get(marketTokenAddress);
  const indexToken =
    market && typeof market === 'object'
      ? (market as MarketIndexTokenSource).indexToken
      : undefined;
  const indexTokenAddress =
    typeof indexToken === 'string' ? indexToken : undefined;
  const ticker = indexTokenAddress
    ? tokenPriceMap?.get(indexTokenAddress)
    : undefined;

  return {
    marketTokenAddress,
    indexTokenAddress,
    ticker,
    isReady: Boolean(indexTokenAddress && (!tokenPriceMap || ticker)),
  };
}
