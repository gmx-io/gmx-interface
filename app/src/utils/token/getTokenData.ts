import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { TokensData } from '@/selectors/token/types';
import { Address } from '@coral-xyz/anchor';

export function getTokenData(
  tokensData?: any,
  address?: Address,
  convertTo?: 'wrapped' | 'native'
) {
  const addressStr = address?.toString();
  if (!addressStr || !tokensData?.[addressStr]) {
    return undefined;
  }

  const token = tokensData[addressStr] || tokensData?.get(addressStr);
  if (convertTo === 'wrapped' && token.isNative && token.wrappedAddress) {
    return tokensData[token.wrappedAddress.toBase58()];
  }

  if (convertTo === 'native' && token.isWrappedNative) {
    return tokensData[NATIVE_TOKEN_ADDRESS.toBase58()];
  }

  return token;
}
