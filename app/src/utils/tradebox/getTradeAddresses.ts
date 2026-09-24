import { TradeOptions } from '@/selectors/trade/types';

export function getTradeAddresses(
  { isSwap, isLong }: { isSwap: boolean; isLong: boolean },
  tradeOptions: TradeOptions
) {
  const swapToTokenAddress = tradeOptions.tokens.swapToTokenAddress;
  const indexTokenAddress = tradeOptions.tokens.indexTokenAddress;
  const fromTokenAddress = tradeOptions.tokens.fromTokenAddress;
  const toTokenAddress = isSwap
    ? tradeOptions.tokens.swapToTokenAddress
    : tradeOptions.tokens.indexTokenAddress;
  const collateralTokenAddress = tradeOptions.collateralTokenAddress;
  const marketTokenAddress = toTokenAddress
    ? tradeOptions?.markets[toTokenAddress]?.[
        isLong ? 'longTokenAddress' : 'shortTokenAddress'
      ]
    : undefined;
  const receiveTokenAddress = tradeOptions.receiveTokenAddress;
  return {
    swapToTokenAddress,
    indexTokenAddress,
    marketTokenAddress,
    fromTokenAddress,
    toTokenAddress,
    collateralTokenAddress,
    receiveTokenAddress,
  };
}
