import { TokensData } from '@/selectors/token/types';
import { Token } from '@/selectors/token/types';

export function isMarketToken(
  token?: Token,
  marketTokensData?: TokensData
): boolean {
  if (!marketTokensData || !token) {
    return false;
  }

  return token.address.toBase58() in marketTokensData;
}
