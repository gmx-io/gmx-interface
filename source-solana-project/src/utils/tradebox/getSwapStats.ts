import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { SwapStats } from '@/selectors/trade/types';
import { applySwapImpactWithCap } from '@/utils/fee/applySwapImpactWithCap';
import { getPriceImpactForSwap } from '@/utils/fee/getPriceImpactForSwap';
import { getSwapFee } from '@/utils/fee/getSwapFee';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';
import { BN } from '@coral-xyz/anchor';
import { isNativeToken } from '@/utils/token/isNativeToken';

export function getSwapStats(p: {
  marketInfo: MarketInfo;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdIn: BN;
  shouldApplyPriceImpact: boolean;
}): SwapStats {
  const {
    marketInfo,
    tokenInAddress,
    tokenOutAddress,
    usdIn,
    shouldApplyPriceImpact,
  } = p;

  const isWrap = isNativeToken(tokenInAddress);
  const isUnwrap = isNativeToken(tokenOutAddress);

  const tokenIn =
    getTokenPoolType(marketInfo, tokenInAddress) === 'long'
      ? marketInfo.longToken
      : marketInfo.shortToken;
  const tokenOut =
    getTokenPoolType(marketInfo, tokenOutAddress) === 'long'
      ? marketInfo.longToken
      : marketInfo.shortToken;

  const priceIn = tokenIn.prices.minPrice;
  const priceOut = tokenOut.prices.maxPrice;

  const amountIn =
    convertUsdToTokenAmount(usdIn, tokenIn.decimals, priceIn) ?? BN_ZERO;

  let priceImpactDeltaUsd: BN;

  try {
    priceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      tokenIn,
      tokenOut,
      usdIn,
      usdIn.neg()
    );
  } catch (e) {
    return {
      swapFeeUsd: BN_ZERO,
      swapFeeAmount: BN_ZERO,
      isWrap,
      isUnwrap,
      marketAddress: marketInfo.marketTokenAddress.toBase58(),
      tokenInAddress,
      tokenOutAddress,
      priceImpactDeltaUsd: BN_ZERO,
      amountIn,
      amountInAfterFees: amountIn,
      usdIn,
      amountOut: BN_ZERO,
      usdOut: BN_ZERO,
      isOutLiquidity: true,
    };
  }

  const swapFeeAmount = getSwapFee(
    marketInfo,
    amountIn,
    priceImpactDeltaUsd.gt(BN_ZERO)
  );
  const swapFeeUsd = getSwapFee(
    marketInfo,
    usdIn,
    priceImpactDeltaUsd.gt(BN_ZERO)
  );
  const amountInAfterFees = amountIn.sub(swapFeeAmount);
  const usdInAfterFees = usdIn.sub(swapFeeUsd);

  let usdOut = usdInAfterFees;
  let amountOut =
    convertUsdToTokenAmount(usdOut, tokenOut.decimals, priceOut) ?? BN_ZERO;

  let cappedImpactDeltaUsd: BN;

  if (priceImpactDeltaUsd.gt(BN_ZERO)) {
    const { impactDeltaAmount: positiveImpactAmountTokenOut, cappedDiffUsd } =
      applySwapImpactWithCap(marketInfo, tokenOut, priceImpactDeltaUsd);
    cappedImpactDeltaUsd = convertTokenAmountToUsd(
      positiveImpactAmountTokenOut,
      tokenOut.decimals,
      priceOut
    )!;

    if (cappedDiffUsd.gt(BN_ZERO)) {
      const { impactDeltaAmount: positiveImpactAmountTokenIn } =
        applySwapImpactWithCap(marketInfo, tokenIn, cappedDiffUsd);
      if (positiveImpactAmountTokenIn.gt(BN_ZERO)) {
        cappedImpactDeltaUsd = cappedImpactDeltaUsd.add(
          convertTokenAmountToUsd(
            positiveImpactAmountTokenIn,
            tokenIn.decimals,
            priceIn
          )
        );
      }
    }
  } else {
    const { impactDeltaAmount: negativeImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenIn,
      priceImpactDeltaUsd
    );
    cappedImpactDeltaUsd = convertTokenAmountToUsd(
      negativeImpactAmount,
      tokenIn.decimals,
      priceIn
    )!;
  }

  if (shouldApplyPriceImpact) {
    usdOut = usdOut.add(cappedImpactDeltaUsd);
  }

  if (usdOut.lt(BN_ZERO)) {
    usdOut = BN_ZERO;
  }

  amountOut =
    convertUsdToTokenAmount(usdOut, tokenOut.decimals, priceOut) ?? BN_ZERO;

  const liquidity = getMarketAvailableLiquidityUsdForCollateral(
    marketInfo,
    getTokenPoolType(marketInfo, tokenOutAddress) === 'long'
  );

  const isOutLiquidity = liquidity.lt(usdOut);

  return {
    swapFeeUsd,
    swapFeeAmount,
    isWrap,
    isUnwrap,
    marketAddress: marketInfo.marketTokenAddress.toBase58(),
    tokenInAddress,
    tokenOutAddress,
    priceImpactDeltaUsd: cappedImpactDeltaUsd,
    amountIn,
    amountInAfterFees,
    usdIn,
    amountOut,
    usdOut,
    isOutLiquidity,
  };
}
