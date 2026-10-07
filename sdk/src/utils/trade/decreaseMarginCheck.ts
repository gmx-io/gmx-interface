import { bigMath } from "utils/bigmath";
import { getProportionalPendingImpactValues } from "utils/fees";
import { getMarketInfoWithOpenInterestDelta, getOpenInterestUsd, getPriceForPnl } from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { applyFactor } from "utils/numbers";
import { getPositionPnlUsd } from "utils/positions";
import { UserReferralInfo } from "utils/referrals/types";
import { convertToUsd } from "utils/tokens";
import { TokenData } from "utils/tokens/types";
import { getCollateralDeltaAmountAfterPriceImpactDiff } from "utils/trade/decrease";

import {
  getResultingPositionMarginState,
  PositionMarginFailureReason,
  PositionMarginState,
} from "./increaseMarginCheck";

export type DecreasePositionMarginState = PositionMarginState & {
  isCollateralWithdrawalCancelled: boolean;
};

export type DecreaseResultingPositionMarginStateParams = {
  marketInfo: MarketInfo;
  collateralToken: TokenData;
  isLong: boolean;
  position: {
    sizeInUsd: bigint;
    sizeInTokens: bigint;
    collateralAmount: bigint;
    pendingImpactAmount: bigint;
  };
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  collateralDeltaAmount: bigint;
  payedRemainingCollateralAmount: bigint;
  priceImpactDiffUsd: bigint;
  minCollateralUsd: bigint;
  minPositionSizeUsd: bigint;
  userReferralInfo: UserReferralInfo | undefined;
  proDiscountFactor?: bigint;
};

/**
 * Mirrors the gates of `DecreasePositionUtils.decreasePosition` from the gmx-synthetics build deployed on
 * Arbitrum (release_2.2.1 @ 23c9d160) for a market decrease or a collateral withdrawal that leaves a
 * position open.
 */
export function getDecreaseResultingPositionMarginState(
  p: DecreaseResultingPositionMarginStateParams
): DecreasePositionMarginState | undefined {
  const {
    marketInfo,
    collateralToken,
    isLong,
    position,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    payedRemainingCollateralAmount,
    priceImpactDiffUsd,
    minCollateralUsd,
    minPositionSizeUsd,
    userReferralInfo,
    proDiscountFactor,
  } = p;

  const { indexToken } = marketInfo;

  if (position.sizeInUsd <= 0n || position.sizeInTokens <= 0n || sizeDeltaUsd < 0n) {
    return undefined;
  }

  if (sizeDeltaUsd >= position.sizeInUsd) {
    return undefined;
  }

  if (indexToken.prices.minPrice <= 0n || indexToken.prices.maxPrice <= 0n || collateralToken.prices.minPrice <= 0n) {
    return undefined;
  }

  let collateralDeltaAmount = bigMath.min(p.collateralDeltaAmount, position.collateralAmount);

  if (collateralDeltaAmount < 0n) {
    collateralDeltaAmount = 0n;
  }

  const estimatedPositionPnlUsd = getPositionPnlUsd({
    marketInfo,
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    markPrice: getPriceForPnl(indexToken.prices, isLong, false),
    isLong,
  });

  const estimatedRealizedPnlUsd = bigMath.mulDiv(estimatedPositionPnlUsd, sizeDeltaUsd, position.sizeInUsd);
  const estimatedRemainingPnlUsd = estimatedPositionPnlUsd - estimatedRealizedPnlUsd;

  const nextSizeInUsd = position.sizeInUsd - sizeDeltaUsd;

  let estimatedRemainingCollateralUsd = convertToUsd(
    position.collateralAmount - collateralDeltaAmount,
    collateralToken.decimals,
    collateralToken.prices.minPrice
  )!;

  if (estimatedRealizedPnlUsd < 0n) {
    estimatedRemainingCollateralUsd += estimatedRealizedPnlUsd;
  }

  const minCollateralFactorMultiplier = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort;

  let minCollateralFactorForOpenInterest = applyFactor(
    getOpenInterestUsd(marketInfo, isLong) - sizeDeltaUsd,
    minCollateralFactorMultiplier
  );

  if (marketInfo.minCollateralFactor > minCollateralFactorForOpenInterest) {
    minCollateralFactorForOpenInterest = marketInfo.minCollateralFactor;
  }

  const minCollateralUsdForOpenInterest = applyFactor(nextSizeInUsd, minCollateralFactorForOpenInterest);

  const willCollateralBeSufficient =
    estimatedRemainingCollateralUsd >= 0n && estimatedRemainingCollateralUsd >= minCollateralUsdForOpenInterest;

  let isCollateralWithdrawalCancelled = false;

  if (!willCollateralBeSufficient || estimatedRemainingCollateralUsd + estimatedRemainingPnlUsd < minCollateralUsd) {
    if (sizeDeltaUsd === 0n) {
      return {
        isLiquidatable: true,
        reason: PositionMarginFailureReason.UnableToWithdrawCollateral,
        remainingCollateralUsd: estimatedRemainingCollateralUsd,
        minCollateralUsd,
        minCollateralUsdForLeverage: minCollateralUsdForOpenInterest,
        isCollateralWithdrawalCancelled: false,
      };
    }

    isCollateralWithdrawalCancelled = collateralDeltaAmount > 0n;
    estimatedRemainingCollateralUsd += convertToUsd(
      collateralDeltaAmount,
      collateralToken.decimals,
      collateralToken.prices.minPrice
    )!;
    collateralDeltaAmount = 0n;
  }

  if (estimatedRemainingCollateralUsd + estimatedRemainingPnlUsd < minCollateralUsd) {
    return undefined;
  }

  if (nextSizeInUsd < minPositionSizeUsd) {
    return undefined;
  }

  const { proportionalPendingImpactDeltaAmount } = getProportionalPendingImpactValues({
    sizeInUsd: position.sizeInUsd,
    pendingImpactAmount: position.pendingImpactAmount,
    sizeDeltaUsd,
    indexToken,
  });

  const collateralAfterCostsAmount = position.collateralAmount - payedRemainingCollateralAmount;

  collateralDeltaAmount = getCollateralDeltaAmountAfterPriceImpactDiff({
    collateralDeltaAmount,
    priceImpactDiffUsd,
    collateralToken,
  });

  if (collateralDeltaAmount > collateralAfterCostsAmount) {
    collateralDeltaAmount = collateralAfterCostsAmount > 0n ? collateralAfterCostsAmount : 0n;
  }

  const nextCollateralAmount = collateralAfterCostsAmount - collateralDeltaAmount;

  const marginState = getResultingPositionMarginState({
    marketInfo: getMarketInfoWithOpenInterestDelta({
      marketInfo,
      collateralToken,
      isLong,
      sizeDeltaUsd: -sizeDeltaUsd,
      sizeDeltaInTokens: -sizeDeltaInTokens,
    }),
    collateralToken,
    sizeInUsd: nextSizeInUsd,
    sizeInTokens: position.sizeInTokens - sizeDeltaInTokens,
    collateralAmount: nextCollateralAmount < 0n ? 0n : nextCollateralAmount,
    pendingImpactAmount: position.pendingImpactAmount - proportionalPendingImpactDeltaAmount,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    proDiscountFactor,
    shouldValidateMinCollateralUsd: false,
  });

  return { ...marginState, isCollateralWithdrawalCancelled };
}
