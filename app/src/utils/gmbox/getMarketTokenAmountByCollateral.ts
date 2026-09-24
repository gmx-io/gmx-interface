import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { applySwapImpactWithCap } from '@/utils/fee/applySwapImpactWithCap';
import {
  convertTokenAmountToUsd,
  convertUsdToMarketTokenAmount,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { BN } from '@coral-xyz/anchor';

export function getMarketTokenAmountByCollateral(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  tokenIn: TokenData;
  tokenOut: TokenData;
  amount: BN;
  priceImpactDeltaUsd: BN;
  swapFeeUsd: BN;
}): BN {
  const {
    marketInfo,
    marketToken,
    tokenIn,
    tokenOut,
    amount,
    priceImpactDeltaUsd,
    swapFeeUsd,
  } = p;

  const swapFeeAmount =
    convertUsdToTokenAmount(
      swapFeeUsd,
      tokenIn.decimals,
      tokenIn.prices.minPrice
    ) ?? BN_ZERO;

  let amountInAfterFees = amount.sub(swapFeeAmount);
  let mintAmount = BN_ZERO;

  if (priceImpactDeltaUsd.gt(BN_ZERO)) {
    const { impactDeltaAmount: positiveImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenOut,
      priceImpactDeltaUsd
    );

    const usdValue = convertTokenAmountToUsd(
      positiveImpactAmount,
      tokenOut.decimals,
      tokenOut.prices.maxPrice
    );

    mintAmount = mintAmount.add(
      convertUsdToMarketTokenAmount(marketInfo, marketToken, usdValue) ??
        BN_ZERO
    );
  } else {
    const { impactDeltaAmount: negativeImpactAmount } = applySwapImpactWithCap(
      marketInfo,
      tokenIn,
      priceImpactDeltaUsd
    );
    amountInAfterFees = amountInAfterFees.add(negativeImpactAmount);
  }

  const usdValue = convertTokenAmountToUsd(
    amountInAfterFees,
    tokenIn.decimals,
    tokenIn.prices.minPrice
  );
  mintAmount = mintAmount.add(
    convertUsdToMarketTokenAmount(marketInfo, marketToken, usdValue) ?? BN_ZERO
  );

  return mintAmount;
}
