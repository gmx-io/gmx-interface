import { Token } from '@/selectors/token/types';

export function getIsWrap(token1: Token, token2: Token) {
  return (
    (token1.isNative && token2.isWrappedNative) ||
    (token1.shouldWrap && token1.wrappedAddress.equals(token2.address))
  );
}
