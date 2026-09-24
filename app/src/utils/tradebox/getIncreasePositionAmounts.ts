import { BN_ZERO, ONE_USD } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { OrderType } from '@/selectors/order/types';
import { PositionInfo } from '@/selectors/position/types';
import { TokenData } from '@/selectors/token/types';
import { FindSwapPath } from '@/selectors/trade/types';
import { getPriceImpactForPosition } from '@/utils/fee/getPriceImpactForPosition';
import {
  convertTokenAmountToUsd,
  convertUsdToTokenAmount,
} from '@/utils/legacy/convert';
import { getMarketMarkPrice } from '@/utils/market/getMarketMarkPrice';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import { getPositionFeeUsd } from '@/utils/position/getPositionFeeUsd';
import { getPositionLeverage } from '@/utils/position/getPositionLeverage';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { getAcceptablePriceImpactBpsDefault } from '@/utils/tradebox/getAcceptablePriceImpactBpsDefault';
import { getAcceptablePriceInfo } from '@/utils/tradebox/getAcceptablePriceInfo';
import { getSwapAmountsByFromValue } from '@/utils/tradebox/getSwapAmountsByFromValue';
import { getSwapAmountsByToValue } from '@/utils/tradebox/getSwapAmountsByToValue';
import { BN } from '@coral-xyz/anchor';

import { IncreasePositionAmounts } from './types';

export function getIncreasePositionAmounts(p: {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  collateralToken?: TokenData;
  isLong: boolean;
  initialCollateralAmount: BN | undefined;
  position: PositionInfo | undefined;
  indexTokenAmount: BN | undefined;
  leverage?: BN;
  triggerPrice?: BN;
  fixedAcceptablePriceImpactBps?: number;
  acceptablePriceImpactBuffer?: number;
  strategy: 'leverageBySize' | 'leverageByCollateral' | 'independent';
  findSwapPath: FindSwapPath;
  feeDiscountFactor: BN;
  wrappedNativeToken: TokenData;
}): IncreasePositionAmounts {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmount,
    indexTokenAmount,
    isLong,
    leverage,
    triggerPrice,
    position,
    fixedAcceptablePriceImpactBps,
    acceptablePriceImpactBuffer,
    findSwapPath,
    strategy,
    feeDiscountFactor,
    wrappedNativeToken,
  } = p;

  const values: IncreasePositionAmounts = {
    initialCollateralAmount: BN_ZERO,
    initialCollateralUsd: BN_ZERO,

    collateralDeltaAmount: BN_ZERO,
    collateralDeltaUsd: BN_ZERO,

    swapPathStats: undefined,

    indexTokenAmount: BN_ZERO,

    sizeDeltaUsd: BN_ZERO,
    sizeDeltaInTokens: BN_ZERO,

    estimatedLeverage: BN_ZERO,

    indexPrice: BN_ZERO,
    initialCollateralPrice: BN_ZERO,
    collateralPrice: BN_ZERO,
    triggerPrice: BN_ZERO,
    acceptablePrice: BN_ZERO,
    acceptablePriceDeltaBps: 0,

    positionFeeUsd: BN_ZERO,
    gtRewardsUsd: BN_ZERO,
    feeDiscountUsd: BN_ZERO,
    borrowingFeeUsd: BN_ZERO,
    fundingFeeUsd: BN_ZERO,
    positionPriceImpactDeltaUsd: BN_ZERO,
  };

  if (!collateralToken || !wrappedNativeToken) {
    return values;
  }

  const isLimit = Boolean(
    triggerPrice !== undefined && triggerPrice.gt(BN_ZERO)
  );

  if (isLimit && triggerPrice !== undefined) {
    values.triggerPrice = triggerPrice;
    values.triggerThresholdType = getTriggerThresholdType(
      OrderType.LimitIncrease,
      isLong
    );

    values.indexPrice = triggerPrice;

    values.initialCollateralPrice = getIsEquivalentTokens(
      indexToken,
      initialCollateralToken
    )
      ? triggerPrice
      : initialCollateralToken.prices.minPrice;

    values.collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? triggerPrice
      : collateralToken.prices.minPrice;
  } else {
    values.indexPrice = getMarketMarkPrice({
      prices: indexToken.prices,
      isIncrease: true,
      isLong,
    });
    values.initialCollateralPrice = initialCollateralToken.prices.minPrice;
    values.collateralPrice = collateralToken.prices.minPrice;
  }

  values.borrowingFeeUsd = position?.pendingBorrowingFeesUsd || BN_ZERO;
  values.fundingFeeUsd = position?.pendingFundingFeesUsd || BN_ZERO;

  if (
    values.indexPrice.lte(BN_ZERO) ||
    values.initialCollateralPrice.lte(BN_ZERO) ||
    values.collateralPrice.lte(BN_ZERO)
  ) {
    return values;
  }

  // Size and Collateral depends on focused input => strategy
  if (
    strategy === 'leverageByCollateral' &&
    leverage !== undefined &&
    initialCollateralAmount !== undefined &&
    initialCollateralAmount.gt(BN_ZERO)
  ) {
    values.estimatedLeverage = leverage;

    values.initialCollateralAmount = initialCollateralAmount;
    values.initialCollateralUsd = convertTokenAmountToUsd(
      initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!;

    const swapAmounts = getSwapAmountsByFromValue({
      tokenInRaw: initialCollateralToken,
      tokenOutRaw: collateralToken,
      amountIn: initialCollateralAmount,
      isLimit: false,
      findSwapPath,
      wrappedNativeToken,
    });

    values.swapPathStats = swapAmounts.swapPathStats;

    const baseCollateralUsd = convertTokenAmountToUsd(
      swapAmounts.amountOut,
      collateralToken.decimals,
      values.collateralPrice
    );
    const baseSizeDeltaUsd = baseCollateralUsd.mul(leverage).div(ONE_USD);
    const basePriceImpactDeltaUsd = getPriceImpactForPosition(
      marketInfo,
      baseSizeDeltaUsd,
      isLong
    );
    const basePositionFeeUsd = getPositionFeeUsd(
      marketInfo,
      baseSizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(BN_ZERO)
    );

    values.sizeDeltaUsd = baseCollateralUsd
      .sub(basePositionFeeUsd)
      .mul(leverage)
      .div(ONE_USD);
    values.indexTokenAmount =
      convertUsdToTokenAmount(
        values.sizeDeltaUsd,
        indexToken.decimals,
        values.indexPrice
      ) ?? BN_ZERO;

    const positionFeeUsd = getPositionFeeUsd(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(BN_ZERO)
    );
    values.gtRewardsUsd = positionFeeUsd.sub(
      positionFeeUsd.mul(feeDiscountFactor).div(ONE_USD)
    );
    values.positionFeeUsd = positionFeeUsd;
    values.feeDiscountUsd = positionFeeUsd.mul(feeDiscountFactor).div(ONE_USD);
    values.collateralDeltaUsd = baseCollateralUsd
      .sub(values.positionFeeUsd)
      .sub(values.borrowingFeeUsd)
      .sub(values.fundingFeeUsd);

    values.collateralDeltaAmount =
      convertUsdToTokenAmount(
        values.collateralDeltaUsd,
        collateralToken.decimals,
        values.collateralPrice
      ) ?? BN_ZERO;
  } else if (
    strategy === 'leverageBySize' &&
    leverage !== undefined &&
    indexTokenAmount !== undefined &&
    indexTokenAmount.gt(BN_ZERO)
  ) {
    values.estimatedLeverage = leverage;
    values.indexTokenAmount = indexTokenAmount;
    values.sizeDeltaUsd = convertTokenAmountToUsd(
      indexTokenAmount,
      indexToken.decimals,
      values.indexPrice
    )!;

    const basePriceImpactDeltaUsd = getPriceImpactForPosition(
      marketInfo,
      values.sizeDeltaUsd,
      isLong
    );

    const positionFeeUsd = getPositionFeeUsd(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(BN_ZERO)
    );

    values.positionFeeUsd = positionFeeUsd;
    values.feeDiscountUsd = positionFeeUsd.mul(feeDiscountFactor).div(ONE_USD);
    values.gtRewardsUsd = positionFeeUsd.sub(values.feeDiscountUsd);

    if (leverage.gt(BN_ZERO)) {
      values.collateralDeltaUsd = values.sizeDeltaUsd
        .mul(ONE_USD)
        .div(leverage);
    } else {
      values.collateralDeltaUsd = values.sizeDeltaUsd;
    }

    values.collateralDeltaAmount =
      convertUsdToTokenAmount(
        values.collateralDeltaUsd,
        collateralToken.decimals,
        values.collateralPrice
      ) ?? BN_ZERO;

    const baseCollateralUsd = values.collateralDeltaUsd
      .add(values.positionFeeUsd)
      .add(values.borrowingFeeUsd)
      .add(values.fundingFeeUsd);

    const baseCollateralAmount =
      convertUsdToTokenAmount(
        baseCollateralUsd,
        collateralToken.decimals,
        values.collateralPrice
      ) ?? BN_ZERO;

    const swapAmounts = getSwapAmountsByToValue({
      tokenInRaw: initialCollateralToken,
      tokenOutRaw: collateralToken,
      amountOut: baseCollateralAmount,
      isLimit: false,
      findSwapPath,
      wrappedNativeToken,
    });

    values.swapPathStats = swapAmounts.swapPathStats;

    values.initialCollateralAmount = swapAmounts.amountIn;
    values.initialCollateralUsd = convertTokenAmountToUsd(
      values.initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!;
  } else if (strategy === 'independent') {
    if (indexTokenAmount !== undefined && indexTokenAmount.gt(BN_ZERO)) {
      values.indexTokenAmount = indexTokenAmount;
      values.sizeDeltaUsd = convertTokenAmountToUsd(
        indexTokenAmount,
        indexToken.decimals,
        values.indexPrice
      )!;

      const basePriceImpactDeltaUsd = getPriceImpactForPosition(
        marketInfo,
        values.sizeDeltaUsd,
        isLong
      );

      const positionFeeUsd = getPositionFeeUsd(
        marketInfo,
        values.sizeDeltaUsd,
        basePriceImpactDeltaUsd.gt(BN_ZERO)
      );

      values.positionFeeUsd = positionFeeUsd;
      values.feeDiscountUsd = positionFeeUsd
        .mul(feeDiscountFactor)
        .div(ONE_USD);
      values.gtRewardsUsd = positionFeeUsd.sub(values.feeDiscountUsd);
    }

    if (
      initialCollateralAmount !== undefined &&
      initialCollateralAmount.gt(BN_ZERO)
    ) {
      values.initialCollateralAmount = initialCollateralAmount;
      values.initialCollateralUsd = convertTokenAmountToUsd(
        initialCollateralAmount,
        initialCollateralToken.decimals,
        values.initialCollateralPrice
      )!;

      const swapAmounts = getSwapAmountsByFromValue({
        tokenInRaw: initialCollateralToken,
        tokenOutRaw: collateralToken,
        amountIn: initialCollateralAmount,
        isLimit: false,
        findSwapPath,
        wrappedNativeToken,
      });

      values.swapPathStats = swapAmounts.swapPathStats;

      const baseCollateralUsd = convertTokenAmountToUsd(
        swapAmounts.amountOut,
        collateralToken.decimals,
        values.collateralPrice
      );

      values.collateralDeltaUsd = baseCollateralUsd
        .sub(values.positionFeeUsd)
        .sub(values.borrowingFeeUsd)
        .sub(values.fundingFeeUsd);

      values.collateralDeltaAmount =
        convertUsdToTokenAmount(
          values.collateralDeltaUsd,
          collateralToken.decimals,
          values.collateralPrice
        ) ?? BN_ZERO;
    }

    values.estimatedLeverage = getPositionLeverage({
      sizeInUsd: values.sizeDeltaUsd,
      collateralUsd: values.collateralDeltaUsd,
      pnl: BN_ZERO,
      pendingBorrowingFeesUsd: BN_ZERO,
      pendingFundingFeesUsd: BN_ZERO,
    });
  }

  const acceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: true,
    isLong,
    indexPrice: values.indexPrice,
    sizeDeltaUsd: values.sizeDeltaUsd,
  });

  values.positionPriceImpactDeltaUsd = acceptablePriceInfo.priceImpactDeltaUsd;
  values.acceptablePrice = acceptablePriceInfo.acceptablePrice;
  values.acceptablePriceDeltaBps = acceptablePriceInfo.acceptablePriceDeltaBps;

  if (isLimit) {
    let maxNegativePriceImpactBps = fixedAcceptablePriceImpactBps;
    if (maxNegativePriceImpactBps === undefined) {
      maxNegativePriceImpactBps = getAcceptablePriceImpactBpsDefault({
        isIncrease: true,
        isLong,
        indexPrice: values.indexPrice,
        sizeDeltaUsd: values.sizeDeltaUsd,
        priceImpactDeltaUsd: values.positionPriceImpactDeltaUsd,
        acceptablePriceImapctBuffer: acceptablePriceImpactBuffer,
      });
    }

    const limitAcceptablePriceInfo = getAcceptablePriceInfo({
      marketInfo,
      isIncrease: true,
      isLong,
      indexPrice: values.indexPrice,
      sizeDeltaUsd: values.sizeDeltaUsd,
      maxNegativePriceImpactBps,
    });

    values.acceptablePrice = limitAcceptablePriceInfo.acceptablePrice;
    values.acceptablePriceDeltaBps =
      limitAcceptablePriceInfo.acceptablePriceDeltaBps;
  }

  let priceImpactAmount = BN_ZERO;

  if (values.positionPriceImpactDeltaUsd.gt(BN_ZERO)) {
    const price =
      triggerPrice !== undefined && triggerPrice.gt(BN_ZERO)
        ? triggerPrice
        : indexToken.prices.maxPrice;
    priceImpactAmount =
      convertUsdToTokenAmount(
        values.positionPriceImpactDeltaUsd,
        indexToken.decimals,
        price
      ) ?? BN_ZERO;
  } else {
    const price =
      triggerPrice !== undefined && triggerPrice.gt(BN_ZERO)
        ? triggerPrice
        : indexToken.prices.minPrice;
    priceImpactAmount =
      convertUsdToTokenAmount(
        values.positionPriceImpactDeltaUsd,
        indexToken.decimals,
        price
      ) ?? BN_ZERO;
  }

  values.sizeDeltaInTokens =
    convertUsdToTokenAmount(
      values.sizeDeltaUsd,
      indexToken.decimals,
      values.indexPrice
    ) ?? BN_ZERO;

  if (isLong) {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.add(priceImpactAmount);
  } else {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.sub(priceImpactAmount);
  }

  return values;
}
