import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { MarketsInfo } from '@/selectors/market/types';
import { getByKey } from '@/utils/lib/object';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';

export function getSwapPathOutputAddresses(p: {
  marketsInfo: MarketsInfo;
  initialCollateralAddress: string;
  swapPath: string[];
  wrappedNativeTokenAddress: string;
  shouldUnwrapNativeToken: boolean;
  isIncrease: boolean;
}) {
  const {
    marketsInfo,
    initialCollateralAddress,
    swapPath,
    shouldUnwrapNativeToken,
    isIncrease,
  } = p;

  if (swapPath.length === 0) {
    if (isIncrease) {
      // During increase target collateral token is always SPL token, it can not be native token.
      // Thus we do not need to check if initial collateral token is wrapped token to unwrap it.
      // So we can safely return initial collateral token address as out token address, when there is no swap path.

      return {
        outTokenAddress: initialCollateralAddress,
        outMarketAddress: undefined,
      };
    }

    if (
      shouldUnwrapNativeToken &&
      isWrappedNativeToken(initialCollateralAddress)
    ) {
      return {
        outTokenAddress: NATIVE_TOKEN_ADDRESS.toBase58(),
        outMarketAddress: undefined,
      };
    }

    return {
      outTokenAddress: initialCollateralAddress,
      outMarketAddress: undefined,
    };
  }

  const [firstMarketAddress, ...marketAddresses] = swapPath;

  let outMarket = getByKey(marketsInfo, firstMarketAddress);

  if (!outMarket) {
    return {
      outTokenAddress: undefined,
      outMarketAddress: undefined,
    };
  }

  let outTokenType = getTokenPoolType(outMarket, initialCollateralAddress);
  let outToken =
    outTokenType === 'long' ? outMarket.shortToken : outMarket.longToken;

  for (const marketAddress of marketAddresses) {
    outMarket = getByKey(marketsInfo, marketAddress);

    if (!outMarket) {
      return {
        outTokenAddress: undefined,
        outMarketAddress: undefined,
      };
    }

    outTokenType = outMarket.longTokenAddress.equals(outToken.address)
      ? 'short'
      : 'long';
    outToken = outToken =
      outTokenType === 'long' ? outMarket.longToken : outMarket.shortToken;
  }

  let outTokenAddress: string;
  if (isIncrease) {
    // Here swap path is not empty, this means out token came from swapping tokens,
    // thus it can not be native token by design.
    outTokenAddress = outToken.address.toBase58();
  } else {
    if (
      shouldUnwrapNativeToken &&
      isWrappedNativeToken(outToken.address.toBase58())
    ) {
      outTokenAddress = NATIVE_TOKEN_ADDRESS.toBase58();
    } else {
      outTokenAddress = outToken.address.toBase58();
    }
  }

  return {
    outTokenAddress,
    outMarketAddress: outMarket.marketTokenAddress.toBase58(),
  };
}
