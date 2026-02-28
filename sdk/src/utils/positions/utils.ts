import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { bigMath } from "utils/bigmath";
import {
  capPositionImpactUsdByMaxImpactPool,
  capPositionImpactUsdByMaxPriceImpactFactor,
  getMaxPositionImpactFactors,
  getPositionFee,
  getPriceImpactForPosition,
  getProportionalPendingImpactValues,
} from "utils/fees";
import {
  getCappedPoolPnl,
  getMarketIndexName,
  getMarketPnl,
  getMarketPoolName,
  getMaxAllowedLeverageByMinCollateralFactor,
  getOpenInterestUsd,
  getPoolUsdWithoutPnl,
} from "utils/markets";
import { Market, MarketInfo } from "utils/markets/types";
import { applyFactor, expandDecimals, FLOAT_PRECISION_SQRT, getBasisPoints, PRECISION } from "utils/numbers";
import { getAcceptablePriceInfo, getMarkPrice } from "utils/prices";
import { UserReferralInfo } from "utils/referrals/types";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from "utils/tokens";
import { Token, TokenData } from "utils/tokens/types";

import { Position, PositionInfo, PositionInfoLoaded } from "./types";

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}:${marketAddress}:${collateralAddress}:${isLong}`;
}

export function parsePositionKey(positionKey: string) {
  const [account, marketAddress, collateralAddress, isLong] = positionKey.split(":");

  return { account, marketAddress, collateralAddress, isLong: isLong === "true" };
}

export function getEntryPrice(p: { sizeInUsd: bigint; sizeInTokens: bigint; indexToken: Token }) {
  const { sizeInUsd, sizeInTokens, indexToken } = p;

  if (sizeInTokens <= 0) {
    return undefined;
  }

  return bigMath.mulDiv(sizeInUsd, expandDecimals(1, indexToken.decimals), sizeInTokens);
}

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  markPrice: bigint;
  isLong: boolean;
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p;

  const positionValueUsd = getPositionValueUsd({ indexToken: marketInfo.indexToken, sizeInTokens, markPrice });

  let totalPnl = isLong ? positionValueUsd - sizeInUsd : sizeInUsd - positionValueUsd;

  if (totalPnl <= 0) {
    return totalPnl;
  }

  const poolPnl = getMarketPnl(marketInfo, isLong, true);
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, "minPrice");

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    poolPnl,
    isLong,
  });

  const WEI_PRECISION = expandDecimals(1, 18);

  if (cappedPnl !== poolPnl && cappedPnl > 0 && poolPnl > 0) {
    totalPnl = bigMath.mulDiv(totalPnl, cappedPnl / WEI_PRECISION, poolPnl / WEI_PRECISION);
  }

  return totalPnl;
}

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: bigint; markPrice: bigint }) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!;
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: bigint; pendingBorrowingFeesUsd: bigint }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p;

  return pendingBorrowingFeesUsd + pendingFundingFeesUsd;
}

export function getPositionNetValue(p: {
  totalPendingImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  collateralUsd: bigint;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
  pnl: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
}) {
  const { pnl, closingFeeUsd, collateralUsd, uiFeeUsd, totalPendingImpactDeltaUsd, priceImpactDiffUsd } = p;

  const pendingFeesUsd = getPositionPendingFeesUsd(p);

  return (
    collateralUsd - pendingFeesUsd - closingFeeUsd - uiFeeUsd + pnl + totalPendingImpactDeltaUsd + priceImpactDiffUsd
  );
}

export function getPositionPnlAfterFees({
  pnl,
  pendingBorrowingFeesUsd,
  pendingFundingFeesUsd,
  closingFeeUsd,
  uiFeeUsd,
  totalPendingImpactDeltaUsd,
  priceImpactDiffUsd,
}: {
  pnl: bigint;
  pendingBorrowingFeesUsd: bigint;
  pendingFundingFeesUsd: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
  totalPendingImpactDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
}) {
  const pnlAfterFees =
    pnl -
    pendingBorrowingFeesUsd -
    pendingFundingFeesUsd -
    closingFeeUsd -
    uiFeeUsd +
    totalPendingImpactDeltaUsd +
    priceImpactDiffUsd;

  return pnlAfterFees;
}

export function getLeverage(p: {
  sizeInUsd: bigint;
  collateralUsd: bigint;
  pnl: bigint | undefined;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
}) {
  const { pnl, sizeInUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });

  const remainingCollateralUsd = collateralUsd + (pnl ?? 0n) - totalPendingFeesUsd;

  if (remainingCollateralUsd <= 0) {
    return undefined;
  }

  return bigMath.mulDiv(sizeInUsd, BASIS_POINTS_DIVISOR_BIGINT, remainingCollateralUsd);
}

export function getLiquidationPrice(p: {
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  collateralUsd: bigint;
  collateralToken: TokenData;
  marketInfo: MarketInfo;
  pendingFundingFeesUsd: bigint;
  pendingBorrowingFeesUsd: bigint;
  pendingImpactAmount: bigint;
  minCollateralUsd: bigint;
  isLong: boolean;
  useMaxPriceImpact?: boolean;
  userReferralInfo: UserReferralInfo | undefined;
}) {
  const {
    sizeInUsd,
    sizeInTokens,
    collateralUsd,
    collateralAmount,
    marketInfo,
    collateralToken,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    pendingImpactAmount,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    useMaxPriceImpact,
  } = p;

  if (sizeInUsd <= 0 || sizeInTokens <= 0) {
    return undefined;
  }

  const { indexToken } = marketInfo;

  const closingFeeUsd = getPositionFee(marketInfo, sizeInUsd, false, userReferralInfo).positionFeeUsd;
  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd });
  const totalFeesUsd = totalPendingFeesUsd + closingFeeUsd;

  const maxNegativePriceImpactUsd = -1n * applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations);

  let priceImpactDeltaUsd = 0n;

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  } else {
    const priceImpactForPosition = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, { fallbackToZero: true });
    priceImpactDeltaUsd = priceImpactForPosition.priceImpactDeltaUsd;

    if (priceImpactDeltaUsd > 0) {
      priceImpactDeltaUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeInUsd, priceImpactDeltaUsd);
    }

    const pendingImpactUsd = convertToUsd(
      pendingImpactAmount,
      marketInfo.indexToken.decimals,
      pendingImpactAmount > 0 ? marketInfo.indexToken.prices.minPrice : marketInfo.indexToken.prices.maxPrice
    )!;

    priceImpactDeltaUsd = priceImpactDeltaUsd + pendingImpactUsd;

    if (priceImpactDeltaUsd > 0) {
      priceImpactDeltaUsd = 0n;
    } else if (priceImpactDeltaUsd < maxNegativePriceImpactUsd) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd;
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactorForLiquidation);
  if (liquidationCollateralUsd < minCollateralUsd) {
    liquidationCollateralUsd = minCollateralUsd;
  }

  let liquidationPrice: bigint;

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens + collateralAmount;

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice =
        ((sizeInUsd + liquidationCollateralUsd - priceImpactDeltaUsd + totalFeesUsd) / denominator) *
        expandDecimals(1, indexToken.decimals);
    } else {
      const denominator = sizeInTokens - collateralAmount;

      if (denominator == 0n) {
        return undefined;
      }

      liquidationPrice =
        ((sizeInUsd - liquidationCollateralUsd + priceImpactDeltaUsd - totalFeesUsd) / denominator) *
        expandDecimals(1, indexToken.decimals);
    }
  } else {
    if (sizeInTokens == 0n) {
      return undefined;
    }

    const remainingCollateralUsd = collateralUsd + priceImpactDeltaUsd - totalPendingFeesUsd - closingFeeUsd;

    if (isLong) {
      liquidationPrice =
        ((liquidationCollateralUsd - remainingCollateralUsd + sizeInUsd) / sizeInTokens) *
        expandDecimals(1, indexToken.decimals);
    } else {
      liquidationPrice =
        ((liquidationCollateralUsd - remainingCollateralUsd - sizeInUsd) / -sizeInTokens) *
        expandDecimals(1, indexToken.decimals);
    }
  }

  if (liquidationPrice <= 0) {
    return undefined;
  }

  return liquidationPrice;
}

export function getNetPriceImpactDeltaUsdForDecrease({
  marketInfo,
  sizeInUsd,
  pendingImpactAmount,
  priceImpactDeltaUsd,
  sizeDeltaUsd,
}: {
  marketInfo: MarketInfo;
  sizeInUsd: bigint;
  pendingImpactAmount: bigint;
  sizeDeltaUsd: bigint;
  priceImpactDeltaUsd: bigint;
}) {
  const { proportionalPendingImpactDeltaUsd } = getProportionalPendingImpactValues({
    sizeInUsd,
    sizeDeltaUsd,
    pendingImpactAmount,
    indexToken: marketInfo.indexToken,
  });

  let totalImpactDeltaUsd = priceImpactDeltaUsd + proportionalPendingImpactDeltaUsd;

  const priceImpactDiffUsd = getPriceImpactDiffUsd({
    totalImpactDeltaUsd,
    marketInfo,
    sizeDeltaUsd,
  });

  if (totalImpactDeltaUsd > 0) {
    totalImpactDeltaUsd = capPositionImpactUsdByMaxPriceImpactFactor(marketInfo, sizeDeltaUsd, totalImpactDeltaUsd);
  }

  totalImpactDeltaUsd = capPositionImpactUsdByMaxImpactPool(marketInfo, totalImpactDeltaUsd);

  return {
    totalImpactDeltaUsd,
    proportionalPendingImpactDeltaUsd,
    priceImpactDiffUsd,
  };
}

export function getPriceImpactDiffUsd({
  totalImpactDeltaUsd,
  marketInfo,
  sizeDeltaUsd,
}: {
  totalImpactDeltaUsd: bigint;
  marketInfo: MarketInfo;
  sizeDeltaUsd: bigint;
}) {
  if (totalImpactDeltaUsd > 0) {
    return 0n;
  }

  const { maxNegativeImpactFactor } = getMaxPositionImpactFactors(marketInfo);

  const maxNegativeImpactUsd = -applyFactor(sizeDeltaUsd, maxNegativeImpactFactor);

  let priceImpactDiffUsd = 0n;

  if (totalImpactDeltaUsd < maxNegativeImpactUsd) {
    priceImpactDiffUsd = maxNegativeImpactUsd - totalImpactDeltaUsd;
  }

  return priceImpactDiffUsd;
}

export function getMinCollateralFactorForPosition(position: PositionInfoLoaded, openInterestDelta: bigint) {
  const marketInfo = position.marketInfo;

  const isLong = position.isLong;
  const openInterest = getOpenInterestUsd(marketInfo, isLong) + openInterestDelta;
  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;
  let minCollateralFactor = bigMath.mulDiv(openInterest, minCollateralFactorMultiplier, PRECISION);
  const minCollateralFactorForMarket = marketInfo.minCollateralFactor;

  if (minCollateralFactorForMarket > minCollateralFactor) {
    minCollateralFactor = minCollateralFactorForMarket;
  }

  return minCollateralFactor;
}

function getFundingAmount(
  latestFundingAmountPerSize: bigint,
  positionFundingAmountPerSize: bigint,
  positionSizeInUsd: bigint
): bigint {
  const fundingDiffFactor = latestFundingAmountPerSize - positionFundingAmountPerSize;
  // fundingAmountPerSize values are stored with FLOAT_PRECISION_SQRT precision
  return bigMath.mulDiv(positionSizeInUsd, fundingDiffFactor, PRECISION * FLOAT_PRECISION_SQRT);
}

export function getContractPositionDynamicFees({
  position,
  marketInfo,
  marketFeeState,
  referralInfo,
}: {
  position: {
    sizeInUsd: bigint;
    collateralTokenAddress: string;
    isLong: boolean;
    borrowingFactor: bigint;
    fundingFeeAmountPerSize: bigint;
    longTokenClaimableFundingAmountPerSize: bigint;
    shortTokenClaimableFundingAmountPerSize: bigint;
  };
  marketInfo: MarketInfo;
  marketFeeState: {
    cumulativeBorrowingFactorLong: bigint;
    cumulativeBorrowingFactorShort: bigint;
    fundingFeeAmountPerSizeLongLong: bigint;
    fundingFeeAmountPerSizeLongShort: bigint;
    fundingFeeAmountPerSizeShortLong: bigint;
    fundingFeeAmountPerSizeShortShort: bigint;
    claimableFundingAmountPerSizeLongLong: bigint;
    claimableFundingAmountPerSizeLongShort: bigint;
    claimableFundingAmountPerSizeShortLong: bigint;
    claimableFundingAmountPerSizeShortShort: bigint;
  };
  referralInfo?: UserReferralInfo;
}) {
  const { sizeInUsd, isLong, borrowingFactor } = position;
  const isCollateralLongToken = position.collateralTokenAddress === marketInfo.longToken.address;
  const collateralToken = isCollateralLongToken ? marketInfo.longToken : marketInfo.shortToken;
  const collateralMinPrice = collateralToken.prices.minPrice;

  const cumulativeBorrowingFactor = isLong
    ? marketFeeState.cumulativeBorrowingFactorLong
    : marketFeeState.cumulativeBorrowingFactorShort;

  const borrowingDiffFactor =
    cumulativeBorrowingFactor > borrowingFactor ? cumulativeBorrowingFactor - borrowingFactor : 0n;
  const pendingBorrowingFeesUsd = applyFactor(sizeInUsd, borrowingDiffFactor);

  let latestFundingFeeAmountPerSize: bigint;
  if (isLong) {
    latestFundingFeeAmountPerSize = isCollateralLongToken
      ? marketFeeState.fundingFeeAmountPerSizeLongLong
      : marketFeeState.fundingFeeAmountPerSizeLongShort;
  } else {
    latestFundingFeeAmountPerSize = isCollateralLongToken
      ? marketFeeState.fundingFeeAmountPerSizeShortLong
      : marketFeeState.fundingFeeAmountPerSizeShortShort;
  }

  const fundingFeeAmount = getFundingAmount(latestFundingFeeAmountPerSize, position.fundingFeeAmountPerSize, sizeInUsd);

  let latestLongTokenClaimableFundingAmountPerSize: bigint;
  let latestShortTokenClaimableFundingAmountPerSize: bigint;

  if (isLong) {
    latestLongTokenClaimableFundingAmountPerSize = marketFeeState.claimableFundingAmountPerSizeLongLong;
    latestShortTokenClaimableFundingAmountPerSize = marketFeeState.claimableFundingAmountPerSizeLongShort;
  } else {
    latestLongTokenClaimableFundingAmountPerSize = marketFeeState.claimableFundingAmountPerSizeShortLong;
    latestShortTokenClaimableFundingAmountPerSize = marketFeeState.claimableFundingAmountPerSizeShortShort;
  }

  const claimableLongTokenAmount = getFundingAmount(
    latestLongTokenClaimableFundingAmountPerSize,
    position.longTokenClaimableFundingAmountPerSize,
    sizeInUsd
  );

  const claimableShortTokenAmount = getFundingAmount(
    latestShortTokenClaimableFundingAmountPerSize,
    position.shortTokenClaimableFundingAmountPerSize,
    sizeInUsd
  );

  const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, -sizeInUsd, isLong, {
    fallbackToZero: true,
  });
  const { positionFeeUsd, discountUsd, uiFeeUsd } = getPositionFee(
    marketInfo,
    sizeInUsd,
    balanceWasImproved,
    referralInfo
  );

  const positionFeeAmount = convertToTokenAmount(positionFeeUsd, collateralToken.decimals, collateralMinPrice) ?? 0n;
  const traderDiscountAmount = convertToTokenAmount(discountUsd, collateralToken.decimals, collateralMinPrice) ?? 0n;
  const uiFeeAmount = convertToTokenAmount(uiFeeUsd, collateralToken.decimals, collateralMinPrice) ?? 0n;

  return {
    pendingBorrowingFeesUsd,
    fundingFeeAmount,
    claimableLongTokenAmount,
    claimableShortTokenAmount,
    positionFeeAmount,
    traderDiscountAmount,
    uiFeeAmount,
  };
}

export function getPositionInfo(p: {
  position: Position;
  marketInfo: MarketInfo;
  minCollateralUsd: bigint;
  userReferralInfo?: UserReferralInfo;
  showPnlInLeverage?: boolean;
  uiFeeFactor?: bigint;
}): PositionInfo {
  const { position, marketInfo, minCollateralUsd, userReferralInfo, showPnlInLeverage = true, uiFeeFactor } = p;

  const { indexToken, longToken, shortToken } = marketInfo;
  const isCollateralLongToken = position.collateralTokenAddress === longToken.address;
  const collateralToken = isCollateralLongToken ? longToken : shortToken;
  const pnlToken = position.isLong ? longToken : shortToken;
  const collateralMinPrice = collateralToken.prices.minPrice;

  const markPrice = getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false });

  const entryPrice = getEntryPrice({
    sizeInTokens: position.sizeInTokens,
    sizeInUsd: position.sizeInUsd,
    indexToken,
  });

  const pendingFundingFeesUsd = convertToUsd(position.fundingFeeAmount, collateralToken.decimals, collateralMinPrice)!;

  const pendingClaimableFundingFeesLongUsd = convertToUsd(
    position.claimableLongTokenAmount,
    longToken.decimals,
    longToken.prices.minPrice
  )!;

  const pendingClaimableFundingFeesShortUsd = convertToUsd(
    position.claimableShortTokenAmount,
    shortToken.decimals,
    shortToken.prices.minPrice
  )!;

  const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd + pendingClaimableFundingFeesShortUsd;

  const totalPendingFeesUsd = getPositionPendingFeesUsd({
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
  });

  const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;
  const remainingCollateralUsd = collateralUsd - totalPendingFeesUsd;
  const remainingCollateralAmount = convertToTokenAmount(
    remainingCollateralUsd,
    collateralToken.decimals,
    collateralMinPrice
  )!;

  const pnl = getPositionPnlUsd({
    marketInfo,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    markPrice,
    isLong: position.isLong,
  });

  const pnlPercentage = collateralUsd !== 0n ? getBasisPoints(pnl, collateralUsd) : 0n;

  const closeAcceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: false,
    isLimit: false,
    isLong: position.isLong,
    indexPrice: markPrice,
    sizeDeltaUsd: position.sizeInUsd,
  });

  const positionFeeInfo = getPositionFee(
    marketInfo,
    position.sizeInUsd,
    closeAcceptablePriceInfo.balanceWasImproved,
    userReferralInfo,
    uiFeeFactor
  );

  const closingFeeUsd = positionFeeInfo.positionFeeUsd;
  const uiFeeUsd = positionFeeInfo.uiFeeUsd ?? 0n;

  const netPriceImpactValues = getNetPriceImpactDeltaUsdForDecrease({
    marketInfo,
    sizeInUsd: position.sizeInUsd,
    pendingImpactAmount: position.pendingImpactAmount,
    sizeDeltaUsd: position.sizeInUsd,
    priceImpactDeltaUsd: closeAcceptablePriceInfo.priceImpactDeltaUsd,
  });

  const netValue = getPositionNetValue({
    collateralUsd,
    pnl,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
    closingFeeUsd,
    uiFeeUsd,
    totalPendingImpactDeltaUsd: netPriceImpactValues.totalImpactDeltaUsd,
    priceImpactDiffUsd: netPriceImpactValues.priceImpactDiffUsd,
  });

  const pnlAfterFees = getPositionPnlAfterFees({
    pnl,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
    closingFeeUsd,
    uiFeeUsd,
    totalPendingImpactDeltaUsd: netPriceImpactValues.totalImpactDeltaUsd,
    priceImpactDiffUsd: netPriceImpactValues.priceImpactDiffUsd,
  });

  const pnlAfterFeesPercentage =
    collateralUsd !== 0n ? getBasisPoints(pnlAfterFees, collateralUsd + closingFeeUsd) : 0n;

  const leverage = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd,
    pnl: showPnlInLeverage ? pnl : undefined,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
  });

  const leverageWithPnl = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd,
    pnl,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
  });

  const leverageWithoutPnl = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
    pnl: undefined,
  });

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);
  const hasLowCollateral = (leverage !== undefined && leverage > maxAllowedLeverage) || false;

  const liquidationPrice = getLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    collateralUsd,
    collateralAmount: position.collateralAmount,
    pendingImpactAmount: position.pendingImpactAmount,
    userReferralInfo,
    minCollateralUsd,
    pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
    pendingFundingFeesUsd,
    isLong: position.isLong,
  });

  const indexName = getMarketIndexName({ indexToken, isSpotOnly: false });
  const poolName = getMarketPoolName({ longToken, shortToken });

  const market: Market = {
    marketTokenAddress: marketInfo.marketTokenAddress,
    indexTokenAddress: marketInfo.indexTokenAddress,
    longTokenAddress: marketInfo.longTokenAddress,
    shortTokenAddress: marketInfo.shortTokenAddress,
    isSameCollaterals: marketInfo.isSameCollaterals,
    isSpotOnly: marketInfo.isSpotOnly,
    name: marketInfo.name,
    data: marketInfo.data,
  };

  return {
    ...position,
    market,
    marketInfo,
    indexName,
    poolName,
    indexToken,
    collateralToken,
    pnlToken,
    longToken,
    shortToken,
    markPrice,
    entryPrice,
    liquidationPrice,
    collateralUsd,
    remainingCollateralUsd,
    remainingCollateralAmount,
    hasLowCollateral,
    leverage,
    leverageWithPnl,
    leverageWithoutPnl,
    pnl,
    pnlPercentage,
    pnlAfterFees,
    pnlAfterFeesPercentage,
    netValue,
    netPriceImapctDeltaUsd: netPriceImpactValues.totalImpactDeltaUsd,
    priceImpactDiffUsd: netPriceImpactValues.priceImpactDiffUsd,
    pendingImpactUsd: netPriceImpactValues.proportionalPendingImpactDeltaUsd,
    closePriceImpactDeltaUsd: closeAcceptablePriceInfo.priceImpactDeltaUsd,
    closingFeeUsd,
    uiFeeUsd,
    pendingFundingFeesUsd,
    pendingClaimableFundingFeesUsd,
  };
}
