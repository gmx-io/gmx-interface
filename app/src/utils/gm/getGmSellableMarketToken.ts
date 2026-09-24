import { BN_ONE, BN_ZERO, GM_DECIMALS } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { nonNegativeBN } from '@/utils/legacy';
import {
  convertTokenAmountToUsd,
  convertUsdToMarketTokenAmount,
} from '@/utils/legacy/convert';
import { expandDecimals } from '@/utils/legacy/decimals';
import { getMarketAvailableLiquidityUsdForCollateral } from '@/utils/market/getMarketAvailableLiquidityUsdForCollateral';
import { BN } from '@coral-xyz/anchor';

export function getGmSellableMarketToken(
  marketInfo: MarketInfo,
  marketToken: TokenData
) {
  const { longToken, shortToken, longPoolAmount, shortPoolAmount } = marketInfo;
  const longPoolUsd = convertTokenAmountToUsd(
    longPoolAmount,
    longToken.decimals,
    longToken.prices.maxPrice
  );
  const shortPoolUsd = convertTokenAmountToUsd(
    shortPoolAmount,
    shortToken.decimals,
    shortToken.prices.maxPrice
  );
  const longCollateralLiquidityUsd =
    getMarketAvailableLiquidityUsdForCollateral(marketInfo, true);
  const shortCollateralLiquidityUsd =
    getMarketAvailableLiquidityUsdForCollateral(marketInfo, false);

  if (
    longPoolUsd.isZero() ||
    shortPoolUsd.isZero() ||
    longCollateralLiquidityUsd.isZero() ||
    shortCollateralLiquidityUsd.isZero()
  ) {
    return {
      maxLongSellableUsd: BN_ZERO,
      maxShortSellableUsd: BN_ZERO,
      totalAmount: BN_ZERO,
    };
  }

  const factor = expandDecimals(BN_ONE, GM_DECIMALS);
  const ratio = longPoolUsd.mul(factor).div(shortPoolUsd);

  let maxLongSellableUsd: BN;
  let maxShortSellableUsd: BN;

  if (
    shortCollateralLiquidityUsd
      .mul(ratio)
      .div(factor)
      .lte(longCollateralLiquidityUsd)
  ) {
    maxLongSellableUsd = shortCollateralLiquidityUsd.mul(ratio).div(factor);
    maxShortSellableUsd = shortCollateralLiquidityUsd;
  } else {
    maxLongSellableUsd = longCollateralLiquidityUsd;
    maxShortSellableUsd = longCollateralLiquidityUsd.mul(factor).div(ratio);
  }

  const maxLongSellableAmount = convertUsdToMarketTokenAmount(
    marketInfo,
    marketToken,
    maxLongSellableUsd
  );
  const maxShortSellableAmount = convertUsdToMarketTokenAmount(
    marketInfo,
    marketToken,
    maxShortSellableUsd
  );

  return {
    maxLongSellableUsd: nonNegativeBN(maxLongSellableUsd),
    maxShortSellableUsd: nonNegativeBN(maxShortSellableUsd),
    maxLongSellableAmount: nonNegativeBN(maxLongSellableAmount),
    maxShortSellableAmount: nonNegativeBN(maxShortSellableAmount),
    totalUsd: nonNegativeBN(maxLongSellableUsd.add(maxShortSellableUsd)),
    totalAmount: nonNegativeBN(
      maxLongSellableAmount?.add(maxShortSellableAmount ?? BN_ZERO) ?? BN_ZERO
    ),
  };
}
