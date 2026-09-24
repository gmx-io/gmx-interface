import { Token } from '@/selectors/token/types';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export function getTokenPoolType(
  marketInfo: {
    longToken: Token;
    shortToken: Token;
  },
  tokenAddress: string
): 'long' | 'short' | undefined {
  const { longToken, shortToken } = marketInfo;

  if (
    isSameTokenAddress(longToken.address, shortToken.address) &&
    isSameTokenAddress(tokenAddress, longToken.address)
  ) {
    return 'long';
  }

  if (
    isSameTokenAddress(tokenAddress, longToken.address) ||
    (isNativeToken(tokenAddress) && longToken.isWrappedNative)
  ) {
    return 'long';
  }

  if (
    isSameTokenAddress(tokenAddress, shortToken.address) ||
    (isNativeToken(tokenAddress) && shortToken.isWrappedNative)
  ) {
    return 'short';
  }

  return undefined;
}
