import { MarketInfo } from '@/selectors/market/types';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export function isMarketIndexToken(
  marketInfo: MarketInfo,
  tokenAddress: string
) {
  return (
    isSameTokenAddress(tokenAddress, marketInfo.indexToken.address) ||
    (isNativeToken(tokenAddress) && marketInfo.indexToken.isWrappedNative)
  );
}
