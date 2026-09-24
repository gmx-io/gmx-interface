import { Token } from '@/selectors/token/types';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';

export function getMarketIndexName(
  p: ({ indexToken: Token } | { glvToken: Token }) & { isSpotOnly: boolean } & {
    longToken?: Token;
    shortToken?: Token;
  }
) {
  const { isSpotOnly, longToken, shortToken } = p;

  const isSingleSided = longToken?.symbol === shortToken?.symbol;

  const indexName =
    'indexToken' in p
      ? `${p.indexToken.symbol}/USD`
      : isSingleSided
        ? `${getNormalizedTokenSymbol(longToken?.symbol ?? '')}/${getNormalizedTokenSymbol(shortToken?.symbol ?? '')}`
        : `${getNormalizedTokenSymbol(longToken?.symbol ?? '')}/${getNormalizedTokenSymbol(shortToken?.symbol ?? '')}`;

  if (isSpotOnly) {
    return `SWAP-ONLY`;
  }

  return indexName;
}
