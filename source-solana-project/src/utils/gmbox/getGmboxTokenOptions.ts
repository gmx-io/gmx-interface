import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';

export function getGmboxTokenOptions(
  marketInfo?: MarketInfo,
  nativeToken?: TokenData
) {
  if (!marketInfo || !nativeToken) {
    return [];
  }

  const { longToken, shortToken } = marketInfo;

  if (!longToken || !shortToken) return [];

  const options = [longToken];

  if (!marketInfo.isSingle) {
    options.push(shortToken);
  }

  if (
    longToken.address.equals(WRAPPED_NATIVE_TOKEN_ADDRESS) ||
    shortToken.address.equals(WRAPPED_NATIVE_TOKEN_ADDRESS)
  ) {
    options.push(nativeToken);
  }

  return options;
}
