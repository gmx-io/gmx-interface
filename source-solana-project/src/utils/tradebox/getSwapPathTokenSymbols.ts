import { MarketInfo, MarketsInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';

export function getSwapPathTokenSymbols(
  marketsInfo: MarketsInfo | undefined,
  initialCollateralToken: TokenData,
  swapPath: string[]
): string[] | undefined {
  if (!marketsInfo || !swapPath) {
    return undefined;
  }

  let pathTokenSymbolsLoading = false;

  const pathTokenSymbols: string[] = swapPath
    .map((marketAddress) => marketsInfo[marketAddress])
    .reduce(
      (acc: TokenData[], marketInfo: MarketInfo | undefined) => {
        if (!marketInfo || pathTokenSymbolsLoading) {
          pathTokenSymbolsLoading = true;
          return [];
        }

        const last = acc[acc.length - 1];

        if (last.address.equals(marketInfo.longToken.address)) {
          acc.push(marketInfo.shortToken);
        } else if (last.address.equals(marketInfo.shortToken.address)) {
          acc.push(marketInfo.longToken);
        }

        return acc;
      },
      [initialCollateralToken] as TokenData[]
    )
    .map((token: TokenData) => token?.symbol);

  if (pathTokenSymbolsLoading) {
    return undefined;
  }

  return pathTokenSymbols;
}
