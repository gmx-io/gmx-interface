import { Token } from '@/selectors/token/types';

export function getIsEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address.equals(token2.address)) {
    return true;
  }

  if (
    token1.wrappedAddress?.equals(token2.address) ||
    token2.wrappedAddress?.equals(token1.address)
  ) {
    return true;
  }

  return false;
}
