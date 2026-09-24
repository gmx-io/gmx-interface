import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { GlvInfo } from '@/selectors/glv/types';
import { WithdrawalAmounts } from '@/utils/gmbox/types';
import {
  convertMarketTokenAmountToUsd,
  convertTokenAmountToUsd,
  convertUsdToMarketTokenAmount,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { applyFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getWithdrawalAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  marketTokenAmount: BN;
  longTokenAmount: BN;
  shortTokenAmount: BN;
  strategy:
    | 'byMarketToken'
    | 'byLongCollateral'
    | 'byShortCollateral'
    | 'byCollaterals';
  forShift?: boolean;
  glvInfo?: GlvInfo;
  glvTokenAmount?: BN;
  glvToken?: TokenData;
}) {
  const {
    marketInfo,
    marketToken,
    marketTokenAmount,
    longTokenAmount,
    shortTokenAmount,
    strategy,
    glvInfo,
    glvToken,
    glvTokenAmount,
  } = p;

  const { longToken, shortToken } = marketInfo;

  const longPoolAmount = marketInfo.longPoolAmount;
  const shortPoolAmount = marketInfo.shortPoolAmount;

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

  const totalPoolUsd = longPoolUsd.add(shortPoolUsd);

  const values: WithdrawalAmounts = {
    marketTokenAmount: BN_ZERO,
    marketTokenUsd: BN_ZERO,
    longTokenAmount: BN_ZERO,
    longTokenUsd: BN_ZERO,
    shortTokenAmount: BN_ZERO,
    shortTokenUsd: BN_ZERO,
    glvTokenAmount: BN_ZERO,
    glvTokenUsd: BN_ZERO,
    swapFeeUsd: BN_ZERO,
    swapPriceImpactDeltaUsd: BN_ZERO,
  };

  if (totalPoolUsd.isZero()) {
    return values;
  }

  if (strategy === 'byMarketToken') {
    if (glvInfo) {
      values.glvTokenAmount = glvTokenAmount!;
      values.glvTokenUsd = convertTokenAmountToUsd(
        glvTokenAmount,
        glvToken?.decimals,
        glvToken?.prices.minPrice
      )!;
      values.marketTokenAmount =
        convertUsdToTokenAmount(
          values.glvTokenUsd,
          marketToken.decimals,
          marketToken.prices.maxPrice
        ) ?? BN_ZERO;
      values.marketTokenUsd = values.glvTokenUsd;
    } else {
      values.marketTokenAmount = marketTokenAmount;
      values.marketTokenUsd = convertMarketTokenAmountToUsd(
        marketInfo,
        marketToken,
        marketTokenAmount
      );
    }

    values.longTokenUsd = values.marketTokenUsd
      .mul(longPoolUsd)
      .div(totalPoolUsd);
    values.shortTokenUsd = values.marketTokenUsd
      .mul(shortPoolUsd)
      .div(totalPoolUsd);

    const longSwapFeeUsd = p.forShift
      ? BN_ZERO
      : applyFactor(
          values.longTokenUsd,
          p.marketInfo.swapFeeFactorForNegativeImpact
        );
    const shortSwapFeeUsd = p.forShift
      ? BN_ZERO
      : applyFactor(
          values.shortTokenUsd,
          p.marketInfo.swapFeeFactorForNegativeImpact
        );

    values.swapFeeUsd = longSwapFeeUsd.add(shortSwapFeeUsd);

    values.longTokenUsd = values.longTokenUsd.sub(longSwapFeeUsd);
    values.shortTokenUsd = values.shortTokenUsd.sub(shortSwapFeeUsd);

    values.longTokenAmount =
      convertUsdToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longToken.prices.maxPrice
      ) ?? BN_ZERO;
    values.shortTokenAmount =
      convertUsdToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortToken.prices.maxPrice
      ) ?? BN_ZERO;
  } else {
    if (strategy === 'byLongCollateral' && longPoolUsd.gt(BN_ZERO)) {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertTokenAmountToUsd(
        longTokenAmount,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
      values.shortTokenUsd = values.longTokenUsd
        .mul(shortPoolUsd)
        .div(longPoolUsd);
      values.shortTokenAmount =
        convertUsdToTokenAmount(
          values.shortTokenUsd,
          shortToken.decimals,
          shortToken.prices.maxPrice
        ) ?? BN_ZERO;
    } else if (strategy === 'byShortCollateral' && shortPoolUsd.gt(BN_ZERO)) {
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertTokenAmountToUsd(
        shortTokenAmount,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
      values.longTokenUsd = values.shortTokenUsd
        .mul(longPoolUsd)
        .div(shortPoolUsd);
      values.longTokenAmount =
        convertUsdToTokenAmount(
          values.longTokenUsd,
          longToken.decimals,
          longToken.prices.maxPrice
        ) ?? BN_ZERO;
    } else if (strategy === 'byCollaterals') {
      values.longTokenAmount = longTokenAmount;
      values.longTokenUsd = convertTokenAmountToUsd(
        longTokenAmount,
        longToken.decimals,
        longToken.prices.maxPrice
      )!;
      values.shortTokenAmount = shortTokenAmount;
      values.shortTokenUsd = convertTokenAmountToUsd(
        shortTokenAmount,
        shortToken.decimals,
        shortToken.prices.maxPrice
      )!;
    }

    values.marketTokenUsd = values.marketTokenUsd
      .add(values.longTokenUsd)
      .add(values.shortTokenUsd);
    if (!p.forShift) {
      values.swapFeeUsd = applyFactor(
        values.longTokenUsd.add(values.shortTokenUsd),
        p.marketInfo.swapFeeFactorForNegativeImpact
      );
    }

    values.marketTokenUsd = values.marketTokenUsd.add(values.swapFeeUsd);
    values.marketTokenAmount = convertUsdToMarketTokenAmount(
      marketInfo,
      marketToken,
      values.marketTokenUsd
    )!;

    if (glvInfo) {
      values.glvTokenUsd = convertTokenAmountToUsd(
        values.marketTokenAmount,
        marketToken?.decimals,
        marketToken?.prices.minPrice
      )!;
      values.glvTokenAmount =
        convertUsdToTokenAmount(
          values.glvTokenUsd,
          glvToken?.decimals,
          glvToken?.prices.minPrice
        ) ?? BN_ZERO;
    }
  }

  return values;
}
