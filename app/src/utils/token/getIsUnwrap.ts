import { Token } from '@/selectors/token/types';

export function getIsUnwrap(token1: Token, token2: Token) {
  return (
    (token1.isWrappedNative && token2.isNative) ||
    (token2.shouldWrap && token2.wrappedAddress.equals(token1.address))
  );
}
