import { Token } from '@/selectors/token/types';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';

export function getMarketFullName(p: {
  longToken: Token;
  shortToken: Token;
  indexToken: Token;
  isSpotOnly: boolean;
}) {
  const { indexToken, longToken, shortToken, isSpotOnly } = p;

  return `${getMarketIndexName({ indexToken, isSpotOnly, longToken, shortToken })} [${getMarketPoolName({ longToken, shortToken })}]`;
}
