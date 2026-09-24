import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getPriceImpactForSwap } from '@/utils/fee/getPriceImpactForSwap';
import { getSwapFee } from '@/utils/fee/getSwapFee';
import { GlvInfo } from '@/selectors/glv/types';
import { getMarketTokenAmountByCollateral } from '@/utils/gmbox/getMarketTokenAmountByCollateral';
import { DepositAmounts } from '@/utils/gmbox/types';
import {
  convertMarketTokenAmountToUsd,
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { BN } from '@coral-xyz/anchor';

export function getDepositAmounts(p: {
  marketInfo: MarketInfo;
  marketToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  longTokenAmount: BN;
  shortTokenAmount: BN;
  glvTokenAmount?: BN;
  glvToken?: TokenData;
  marketTokenAmount: BN;
  strategy: 'byCollaterals' | 'byMarketToken';
  includeLongToken: boolean;
  includeShortToken: boolean;
  forShift?: boolean;
  isMarketTokenDeposit: boolean;
  glvInfo?: GlvInfo;
}): DepositAmounts {
  const {
    marketInfo,
    marketToken,
    longToken,
    shortToken,
    longTokenAmount,
    shortTokenAmount,
    glvTokenAmount,
    marketTokenAmount,
    strategy,
    includeLongToken,
    includeShortToken,
    isMarketTokenDeposit,
    glvInfo,
    glvToken,
  } = p;
  const longTokenPrice = longToken && getMarketMidPrice(longToken.prices);
  const shortTokenPrice = shortToken && getMarketMidPrice(shortToken.prices);

  const values: DepositAmounts = {
    longTokenAmount: BN_ZERO,
    longTokenUsd: BN_ZERO,
    shortTokenAmount: BN_ZERO,
    shortTokenUsd: BN_ZERO,
    marketTokenAmount: BN_ZERO,
    glvTokenAmount: BN_ZERO,
    glvTokenUsd: BN_ZERO,
    marketTokenUsd: BN_ZERO,
    swapFeeUsd: BN_ZERO,
    swapPriceImpactDeltaUsd: BN_ZERO,
  };

  if (strategy === 'byCollaterals') {
    if (
      longTokenAmount.isZero() &&
      shortTokenAmount.isZero() &&
      marketTokenAmount.isZero()
    ) {
      return values;
    }

    values.longTokenAmount = longTokenAmount;
    values.longTokenUsd = convertTokenAmountToUsd(
      longTokenAmount,
      longToken.decimals,
      longTokenPrice
    )!;

    values.shortTokenAmount = shortTokenAmount;
    values.shortTokenUsd = convertTokenAmountToUsd(
      shortTokenAmount,
      shortToken.decimals,
      shortTokenPrice
    )!;

    /**
     * If it's GM -> GLV deposit, then don't apply any fees or price impact, just convert GM to GLV
     */
    if (isMarketTokenDeposit && glvInfo && marketToken && glvToken) {
      const marketTokenUsd = convertTokenAmountToUsd(
        marketTokenAmount,
        marketToken.decimals,
        marketToken.prices.minPrice
      );

      const glvTokenAmount =
        convertUsdToTokenAmount(
          marketTokenUsd,
          glvToken.decimals,
          glvToken.prices.minPrice
        ) ?? BN_ZERO;

      const glvTokenUsd =
        convertTokenAmountToUsd(
          glvTokenAmount,
          glvToken.decimals,
          glvToken.prices.minPrice
        ) ?? BN_ZERO;

      values.glvTokenAmount = glvTokenAmount;
      values.glvTokenUsd = glvTokenUsd;

      values.marketTokenAmount = marketTokenAmount ?? BN_ZERO;
      values.marketTokenUsd = marketTokenUsd;

      return values;
    }
    values.swapPriceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd,
      {
        forShift: p.forShift,
      }
    );

    const totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

    if (values.longTokenUsd.gt(BN_ZERO)) {
      const swapFeeUsd = p.forShift
        ? BN_ZERO
        : getSwapFee(
            marketInfo,
            values.longTokenUsd,
            values.swapPriceImpactDeltaUsd.gt(BN_ZERO)
          );
      values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);

      values.marketTokenAmount = values.marketTokenAmount.add(
        getMarketTokenAmountByCollateral({
          marketInfo,
          marketToken,
          tokenIn: longToken,
          tokenOut: shortToken,
          amount: values.longTokenAmount,
          priceImpactDeltaUsd: totalDepositUsd.gt(BN_ZERO)
            ? values.swapPriceImpactDeltaUsd
                .mul(values.longTokenUsd)
                .div(totalDepositUsd)
            : BN_ZERO,
          swapFeeUsd,
        })
      );
    }

    if (values.shortTokenUsd.gt(BN_ZERO)) {
      const swapFeeUsd = p.forShift
        ? BN_ZERO
        : getSwapFee(
            marketInfo,
            values.shortTokenUsd,
            values.swapPriceImpactDeltaUsd.gt(BN_ZERO)
          );
      values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);

      values.marketTokenAmount = values.marketTokenAmount.add(
        getMarketTokenAmountByCollateral({
          marketInfo,
          marketToken,
          tokenIn: shortToken,
          tokenOut: longToken,
          amount: values.shortTokenAmount,
          priceImpactDeltaUsd: totalDepositUsd.gt(BN_ZERO)
            ? values.swapPriceImpactDeltaUsd
                .mul(values.shortTokenUsd)
                .div(totalDepositUsd)
            : BN_ZERO,
          swapFeeUsd,
        })
      );
    }

    values.marketTokenUsd = convertTokenAmountToUsd(
      values.marketTokenAmount,
      marketToken.decimals,
      marketToken.prices.minPrice
    )!;

    if (glvInfo && glvToken) {
      values.glvTokenUsd = values.marketTokenUsd;
      values.glvTokenAmount =
        convertUsdToTokenAmount(
          values.glvTokenUsd,
          glvToken.decimals,
          glvToken.prices.minPrice
        ) ?? BN_ZERO;
      values.marketTokenUsd = BN_ZERO;
      values.marketTokenAmount = BN_ZERO;
    }
  } else if (strategy === 'byMarketToken') {
    if (glvInfo && glvTokenAmount?.isZero()) {
      return values;
    }

    if (!glvInfo && marketTokenAmount.isZero()) {
      return values;
    }

    if (glvInfo && glvToken) {
      values.marketTokenUsd = convertTokenAmountToUsd(
        glvTokenAmount,
        glvToken.decimals,
        glvToken.prices.minPrice
      )!;
      values.marketTokenAmount =
        convertUsdToTokenAmount(
          values.marketTokenUsd,
          marketToken.decimals,
          marketToken.prices.minPrice
        ) ?? BN_ZERO;
      values.glvTokenAmount = glvTokenAmount ?? BN_ZERO;
      values.glvTokenUsd = values.marketTokenUsd;
    } else {
      values.marketTokenAmount = marketTokenAmount;
      values.marketTokenUsd = convertMarketTokenAmountToUsd(
        marketInfo,
        marketToken,
        marketTokenAmount
      );
    }

    /** No fees for GM to GLV deposits */
    if (glvInfo && isMarketTokenDeposit) {
      return values;
    }

    const prevLongTokenUsd = convertTokenAmountToUsd(
      longTokenAmount,
      longToken.decimals,
      longTokenPrice
    );
    const prevShortTokenUsd = convertTokenAmountToUsd(
      shortTokenAmount,
      shortToken.decimals,
      shortTokenPrice
    );
    const prevSumUsd = prevLongTokenUsd.add(prevShortTokenUsd);

    if (p.forShift) {
      // Reverse the withdrawal amounts
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

      values.longTokenUsd = totalPoolUsd.gt(BN_ZERO)
        ? values.marketTokenUsd.mul(longPoolUsd).div(totalPoolUsd)
        : BN_ZERO;
      values.shortTokenUsd = totalPoolUsd.gt(BN_ZERO)
        ? values.marketTokenUsd.mul(shortPoolUsd).div(totalPoolUsd)
        : BN_ZERO;
    } else if (
      includeLongToken &&
      includeShortToken &&
      prevSumUsd.gt(BN_ZERO)
    ) {
      values.longTokenUsd = values.marketTokenUsd
        .mul(prevLongTokenUsd)
        .div(prevSumUsd);
      values.shortTokenUsd = values.marketTokenUsd.sub(values.longTokenUsd);
    } else if (includeLongToken) {
      values.longTokenUsd = values.marketTokenUsd;
    } else if (includeShortToken) {
      values.shortTokenUsd = values.marketTokenUsd;
    }

    values.swapPriceImpactDeltaUsd = getPriceImpactForSwap(
      marketInfo,
      longToken,
      shortToken,
      values.longTokenUsd,
      values.shortTokenUsd,
      {
        forShift: p.forShift,
      }
    );

    if (!p.forShift) {
      const swapFeeUsd = getSwapFee(
        marketInfo,
        values.marketTokenUsd,
        values.swapPriceImpactDeltaUsd.gt(BN_ZERO)
      );
      values.swapFeeUsd = values.swapFeeUsd.add(swapFeeUsd);
    }

    const totalFee = values.swapFeeUsd;
    let totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

    // Adjust long and short token amounts to account for swap fee, ui fee and price impact
    if (totalDepositUsd.gt(BN_ZERO)) {
      values.longTokenUsd = values.longTokenUsd.add(
        totalFee.mul(values.longTokenUsd).div(totalDepositUsd)
      );
      values.shortTokenUsd = values.shortTokenUsd.add(
        totalFee.mul(values.shortTokenUsd).div(totalDepositUsd)
      );

      totalDepositUsd = values.longTokenUsd.add(values.shortTokenUsd);

      // Ignore positive price impact
      if (
        values.swapPriceImpactDeltaUsd.lt(BN_ZERO) &&
        totalDepositUsd.gt(BN_ZERO)
      ) {
        values.longTokenUsd = values.longTokenUsd.add(
          values.swapPriceImpactDeltaUsd
            .neg()
            .mul(values.longTokenUsd)
            .div(totalDepositUsd)
        );

        values.shortTokenUsd = values.shortTokenUsd.add(
          values.swapPriceImpactDeltaUsd
            .neg()
            .mul(values.shortTokenUsd)
            .div(totalDepositUsd)
        );
      }
    }

    values.longTokenAmount =
      convertUsdToTokenAmount(
        values.longTokenUsd,
        longToken.decimals,
        longTokenPrice
      ) ?? BN_ZERO;
    values.shortTokenAmount =
      convertUsdToTokenAmount(
        values.shortTokenUsd,
        shortToken.decimals,
        shortTokenPrice
      ) ?? BN_ZERO;
  }

  return values;
}
