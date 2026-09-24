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

export function getSwapAmountsByFromValue(p: {
  tokenInRaw: TokenData;
  tokenOutRaw: TokenData;
  amountIn: BN;
  triggerRatio?: TokensRatio;
  isLimit: boolean;
  findSwapPath: FindSwapPath;
  wrappedNativeToken: TokenData;
}): SwapAmounts {
  const {
    tokenInRaw,
    tokenOutRaw,
    amountIn,
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

  const usdIn = convertTokenAmountToUsd(amountIn, tokenIn.decimals, priceIn);

  let amountOut = BN_ZERO;
  let usdOut = BN_ZERO;
  let minOutputAmount = BN_ZERO;

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

  if (amountIn.lte(BN_ZERO)) {
    return defaultAmounts;
  }

  if (getIsEquivalentTokens(tokenIn, tokenOut)) {
    amountOut = amountIn;
    usdOut = usdIn;
    minOutputAmount = amountOut;

    return {
      ...defaultAmounts,
      amountOut,
      usdOut,
      minOutputAmount,
    };
  }

  const swapPathStats = findSwapPath(defaultAmounts.usdIn, {
    byLiquidity: isLimit,
  });

  if (!swapPathStats) {
    return defaultAmounts;
  }

  if (isLimit) {
    if (!triggerRatio) {
      return defaultAmounts;
    }

    amountOut = getTokenAmountByRatio({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      ratio: triggerRatio.ratio,
      shouldInvertRatio: isSameTokenAddress(
        triggerRatio.largestToken.address,
        tokenOut.address
      ),
    });

    usdOut = convertTokenAmountToUsd(amountOut, tokenOut.decimals, priceOut)!;
    usdOut = usdOut
      .sub(swapPathStats.totalSwapFeeUsd)
      .add(swapPathStats.totalSwapPriceImpactDeltaUsd);
    amountOut =
      convertUsdToTokenAmount(usdOut, tokenOut.decimals, priceOut) ?? BN_ZERO;
    minOutputAmount = amountOut;
  } else {
    usdOut = swapPathStats.usdOut;
    amountOut = swapPathStats.amountOut;
    minOutputAmount = amountOut;
  }

  if (amountOut.isNeg()) {
    amountOut = BN_ZERO;
    usdOut = BN_ZERO;
    minOutputAmount = BN_ZERO;
  }

  return {
    ...defaultAmounts,
    amountOut,
    usdOut,
    minOutputAmount,
    swapPathStats,
  };
}
