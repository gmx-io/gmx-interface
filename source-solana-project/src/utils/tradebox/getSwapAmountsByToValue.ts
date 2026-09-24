import { BN_ZERO } from '@/config/constants';
import { TokenData, TokensRatio } from '@/selectors/token/types';
import { FindSwapPath, SwapAmounts } from '@/selectors/trade/types';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { getTokenAmountByRatio } from '@/utils/token/getTokenAmountByRatio';
import { BN } from '@coral-xyz/anchor';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

export function getSwapAmountsByToValue(p: {
  tokenInRaw: TokenData;
  tokenOutRaw: TokenData;
  amountOut: BN;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  wrappedNativeToken: TokenData;
}): SwapAmounts {
  const {
    tokenInRaw,
    tokenOutRaw,
    amountOut,
    triggerRatio,
    isLimit,
    findSwapPath,
    wrappedNativeToken,
  } = p;

  const isTokenInNativeToken = tokenInRaw.isNative;
  const isTokenOutNativeToken = tokenOutRaw.isNative;

  const tokenIn = isTokenInNativeToken ? wrappedNativeToken : tokenInRaw;
  const tokenOut = isTokenOutNativeToken ? wrappedNativeToken : tokenOutRaw;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const usdOut = convertTokenAmountToUsd(
    amountOut,
    tokenOut.decimals,
    priceOut
  );

  const minOutputAmount = amountOut;

  let amountIn = BN_ZERO;
  let usdIn = BN_ZERO;

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined,
  };

  if (amountOut.lte(BN_ZERO)) {
    return defaultAmounts;
  }

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
    amountIn = amountOut;
    usdIn = usdOut;

    return {
      amountIn,
      usdIn,
      amountOut,
      usdOut,
      minOutputAmount,
      priceIn,
      priceOut,
      swapPathStats: undefined,
    };
  }

  const baseUsdIn = usdOut;
  const swapPathStats = findSwapPath(baseUsdIn, { byLiquidity: isLimit });

  if (!swapPathStats) {
    return defaultAmounts;
  }

  if (isLimit) {
    if (!triggerRatio) {
      return defaultAmounts;
    }

    amountIn = getTokenAmountByRatio({
      fromToken: tokenOut,
      toToken: tokenIn,
      fromTokenAmount: amountOut,
      ratio: triggerRatio.ratio,
      shouldInvertRatio: isSameTokenAddress(
        triggerRatio.largestToken.address,
        tokenIn.address
      ),
    });

    usdIn = convertTokenAmountToUsd(amountIn, tokenIn.decimals, priceIn)!;
    usdIn = usdIn
      .add(swapPathStats.totalSwapFeeUsd)
      .sub(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountIn =
      convertUsdToTokenAmount(usdIn, tokenIn.decimals, priceIn) ?? BN_ZERO;
  } else {
    const adjustedUsdIn = swapPathStats.usdOut.gt(BN_ZERO)
      ? baseUsdIn.mul(usdOut).div(swapPathStats.usdOut)
      : BN_ZERO;

    usdIn = adjustedUsdIn;
    amountIn =
      convertUsdToTokenAmount(usdIn, tokenIn.decimals, priceIn) ?? BN_ZERO;
  }

  if (amountIn.isNeg()) {
    amountIn = BN_ZERO;
    usdIn = BN_ZERO;
  }

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats,
  };
}
