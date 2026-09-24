import { BN_ONE, BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { convertUsdToTokenAmount } from '@/utils/legacy/convert';
import {
  expandDecimals,
  roundUpMagnitudeDivision,
} from '@/utils/legacy/decimals';
import { getTokenPoolType } from '@/utils/market/getTokenPoolType';
import { BN } from '@coral-xyz/anchor';

export function applySwapImpactWithCap(
  marketInfo: MarketInfo,
  token: TokenData,
  priceImpactDeltaUsd: BN
) {
  const tokenPoolType = getTokenPoolType(marketInfo, token.address.toBase58());

  if (!tokenPoolType) {
    throw new Error(
      `Token ${token.address.toBase58()} is not a collateral of the market ${marketInfo.marketTokenAddress.toBase58()}`
    );
  }

  const isLongCollateral = tokenPoolType === 'long';
  const price = priceImpactDeltaUsd.gt(BN_ZERO)
    ? token.prices.maxPrice
    : token.prices.minPrice;

  let impactDeltaAmount: BN;
  let cappedDiffUsd = BN_ZERO;

  if (priceImpactDeltaUsd.gt(BN_ZERO)) {
    // round positive impactAmount down, this will be deducted from the swap impact pool for the user
    impactDeltaAmount =
      convertUsdToTokenAmount(
        priceImpactDeltaUsd,
        token.decimals,
        price
      ) ?? BN_ZERO;

    const maxImpactAmount = isLongCollateral
      ? marketInfo.swapImpactLongTokenAmount
      : marketInfo.swapImpactShortTokenAmount;

    if (impactDeltaAmount.gt(maxImpactAmount)) {
      cappedDiffUsd = impactDeltaAmount
        .sub(maxImpactAmount)
        .mul(price)
        .div(expandDecimals(BN_ONE, token.decimals));
      impactDeltaAmount = maxImpactAmount;
    }
  } else {
    // round negative impactAmount up, this will be deducted from the user
    impactDeltaAmount = roundUpMagnitudeDivision(
      priceImpactDeltaUsd.mul(expandDecimals(BN_ONE, token.decimals)),
      price
    );
  }

  return { impactDeltaAmount, cappedDiffUsd };
}
