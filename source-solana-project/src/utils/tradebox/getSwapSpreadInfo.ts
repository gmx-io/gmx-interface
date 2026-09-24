import { ONE_BPS } from '@/config/constants';
import { HIGH_SPREAD_THRESHOLD } from '@/config/factors';
import { TokenData } from '@/selectors/token/types';
import { getSpread } from '@/utils/token/getSpread';

import { isSameTokenAddress } from '../token/isSameTokenAddress';

export function getSwapSpreadInfo(
  fromToken: TokenData,
  toToken: TokenData,
  isLong: boolean,
  nativeTokenAddress: string
) {
  const fromTokenSpread = getSpread(fromToken.prices);
  const toTokenSpread = getSpread(toToken.prices);
  if (fromTokenSpread && toTokenSpread) {
    let value = fromTokenSpread.add(toTokenSpread);
    const fromTokenAddress = fromToken.isNative
      ? nativeTokenAddress
      : fromToken.address.toBase58();
    const toTokenAddress = toToken.isNative
      ? nativeTokenAddress
      : toToken.address.toBase58();

    if (isLong && isSameTokenAddress(fromTokenAddress, toTokenAddress)) {
      value = fromTokenSpread;
    }
    // HIGH_SPREAD_THRESHOLD = 10000 => 100%
    return {
      value,
      isHigh: value.div(ONE_BPS).toNumber() > HIGH_SPREAD_THRESHOLD,
    };
  }
}
