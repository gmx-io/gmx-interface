import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { bigMath } from "utils/bigmath";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd, getPositionFee, getPriceImpactForPosition } from "utils/fees";
import { getMaxAllowedLeverage } from "utils/markets";
import { MarketInfo } from "utils/markets/types";
import { applyFactor } from "utils/numbers";
import { getLeverage } from "utils/positions";
import { getMarkPrice } from "utils/prices";
import { UserReferralInfo } from "utils/referrals/types";
import { convertToTokenAmount, convertToTokenAmountForIncrease, convertToUsd } from "utils/tokens";
import { TokenData } from "utils/tokens/types";

import {
  getIncreaseResultingPositionState,
  IncreasePositionState,
  PositionMarginFailureReason,
  PositionMarginState,
} from "./increaseMarginCheck";
import { IncreasePositionAmounts } from "./types";

export type TwapIncreaseSequenceParams = {
  numberOfParts: number;
  partDelaysSeconds: number[];
};

export type TwapIncreaseAggregateAmounts = {
  sizeDeltaUsd: bigint;
  grossCollateralUsd: bigint;
  pendingFeesUsd: bigint;
};

export type TwapIncreasePartAmounts = {
  partSizeDeltaUsd: bigint;
  partGrossCollateralUsd: bigint;
  pendingFeesUsd: bigint;
};

export type TwapIncreaseSequentialMarginStateParams = TwapIncreaseSequenceParams &
  TwapIncreasePartAmounts & {
    marketInfo: MarketInfo;
    collateralToken: TokenData;
    isLong: boolean;
    existingPosition: IncreasePositionState | undefined;
    uiFeeFactor: bigint;
    minCollateralUsd: bigint;
    userReferralInfo: UserReferralInfo | undefined;
    proDiscountFactor?: bigint;
  };

export type TwapIncreaseSequentialMarginState = {
  numberOfParts: number;
  failingPartIndex: number | undefined;
  isFailingPartEligibleNow: boolean;
  marginState: PositionMarginState;
  contractMarginState: PositionMarginState;
};

export function getTwapIncreaseAggregateAmounts(
  increaseAmounts: IncreasePositionAmounts
): TwapIncreaseAggregateAmounts {
  const pendingFeesUsd = increaseAmounts.borrowingFeeUsd + increaseAmounts.fundingFeeUsd;

  return {
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    grossCollateralUsd:
      increaseAmounts.collateralDeltaUsd + increaseAmounts.positionFeeUsd + increaseAmounts.uiFeeUsd + pendingFeesUsd,
    pendingFeesUsd,
  };
}

export function getTwapIncreasePartAmounts(
  { sizeDeltaUsd, grossCollateralUsd, pendingFeesUsd }: TwapIncreaseAggregateAmounts,
  numberOfParts: number
): TwapIncreasePartAmounts {
  if (numberOfParts < 1) {
    return { partSizeDeltaUsd: 0n, partGrossCollateralUsd: 0n, pendingFeesUsd };
  }

  const parts = BigInt(numberOfParts);

  return {
    partSizeDeltaUsd: sizeDeltaUsd / parts,
    partGrossCollateralUsd: grossCollateralUsd / parts,
    pendingFeesUsd,
  };
}

function getMaxAllowedLeverageMarginState({
  position,
  collateralToken,
  maxAllowedLeverage,
  minCollateralUsd,
}: {
  position: IncreasePositionState;
  collateralToken: TokenData;
  maxAllowedLeverage: bigint;
  minCollateralUsd: bigint;
}): PositionMarginState | undefined {
  const collateralUsd = convertToUsd(
    position.collateralAmount,
    collateralToken.decimals,
    collateralToken.prices.minPrice
  )!;
  const leverage = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd,
    pnl: undefined,
    pendingBorrowingFeesUsd: 0n,
    pendingFundingFeesUsd: 0n,
  });

  if (maxAllowedLeverage <= 0n || leverage === undefined || leverage <= maxAllowedLeverage) {
    return undefined;
  }

  return {
    isLiquidatable: true,
    reason: PositionMarginFailureReason.MaxAllowedLeverage,
    remainingCollateralUsd: collateralUsd,
    minCollateralUsd,
    minCollateralUsdForLeverage: bigMath.mulDiv(position.sizeInUsd, BASIS_POINTS_DIVISOR_BIGINT, maxAllowedLeverage),
  };
}

function getPositionFeesAccruedUsd(
  marketInfo: MarketInfo,
  isLong: boolean,
  sizeInUsd: bigint,
  periodSeconds: number
): bigint {
  if (periodSeconds <= 0 || sizeInUsd <= 0n) {
    return 0n;
  }

  const period = BigInt(periodSeconds);
  const borrowingUsd = getBorrowingFeeRateUsd(marketInfo, isLong, sizeInUsd, period);
  const fundingUsd = getFundingFeeRateUsd(marketInfo, isLong, sizeInUsd, period);

  return borrowingUsd + (fundingUsd < 0n ? -fundingUsd : 0n);
}

export function getTwapIncreaseSequentialMarginState(
  p: TwapIncreaseSequentialMarginStateParams
): TwapIncreaseSequentialMarginState | undefined {
  const {
    collateralToken,
    isLong,
    numberOfParts,
    partDelaysSeconds,
    partSizeDeltaUsd,
    partGrossCollateralUsd,
    pendingFeesUsd,
    uiFeeFactor,
    minCollateralUsd,
    userReferralInfo,
    proDiscountFactor,
  } = p;

  if (numberOfParts < 1 || partSizeDeltaUsd <= 0n) {
    return undefined;
  }

  const { indexToken } = p.marketInfo;
  const indexPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong });
  const collateralPrice = collateralToken.prices.minPrice;

  if (indexPrice <= 0n || collateralPrice <= 0n) {
    return undefined;
  }

  const partSizeDeltaInTokens = convertToTokenAmountForIncrease(
    partSizeDeltaUsd,
    indexToken.decimals,
    indexPrice,
    isLong
  )!;

  if (partSizeDeltaInTokens <= 0n) {
    return undefined;
  }

  const maxAllowedLeverage = BigInt(
    getMaxAllowedLeverage({
      marketAddress: p.marketInfo.marketTokenAddress,
      minCollateralFactor: p.marketInfo.minCollateralFactor,
      minCollateralFactorForLiquidation: p.marketInfo.minCollateralFactorForLiquidation,
      positionFeeFactorForBalanceWasNotImproved: p.marketInfo.positionFeeFactorForBalanceWasNotImproved,
    })
  );

  let marketInfo = p.marketInfo;
  let position = p.existingPosition;
  let contractMarginState: PositionMarginState | undefined;
  let previousPartDelaySeconds = 0;

  for (let partIndex = 0; partIndex < numberOfParts; partIndex++) {
    const partDelaySeconds = Math.max(0, partDelaysSeconds[partIndex] ?? 0);
    const accruedFeesUsd = position
      ? getPositionFeesAccruedUsd(marketInfo, isLong, position.sizeInUsd, partDelaySeconds - previousPartDelaySeconds)
      : 0n;
    previousPartDelaySeconds = partDelaySeconds;

    const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, partSizeDeltaUsd, isLong, {
      fallbackToZero: true,
      sizeDeltaInTokens: partSizeDeltaInTokens,
    });
    const { positionFeeUsd } = getPositionFee(
      marketInfo,
      partSizeDeltaUsd,
      balanceWasImproved,
      userReferralInfo,
      undefined,
      proDiscountFactor
    );
    const uiFeeUsd = applyFactor(partSizeDeltaUsd, uiFeeFactor);
    const settledFeesUsd = (partIndex === 0 ? pendingFeesUsd : 0n) + accruedFeesUsd;
    const collateralDeltaUsd = partGrossCollateralUsd - positionFeeUsd - uiFeeUsd - settledFeesUsd;
    const collateralDeltaAmount = convertToTokenAmount(collateralDeltaUsd, collateralToken.decimals, collateralPrice)!;

    const resultingState = getIncreaseResultingPositionState({
      marketInfo,
      collateralToken,
      isLong,
      existingPosition: position,
      sizeDeltaUsd: partSizeDeltaUsd,
      sizeDeltaInTokens: partSizeDeltaInTokens,
      collateralDeltaAmount,
      minCollateralUsd,
      userReferralInfo,
      proDiscountFactor,
    });

    if (!resultingState) {
      return undefined;
    }

    contractMarginState = resultingState.marginState;

    const marginState =
      getMaxAllowedLeverageMarginState({
        position: resultingState.position,
        collateralToken,
        maxAllowedLeverage,
        minCollateralUsd,
      }) ?? contractMarginState;

    if (marginState.isLiquidatable) {
      return {
        numberOfParts,
        failingPartIndex: partIndex,
        isFailingPartEligibleNow: partDelaySeconds === 0,
        marginState,
        contractMarginState,
      };
    }

    marketInfo = resultingState.marketInfo;
    position = resultingState.position;
  }

  return {
    numberOfParts,
    failingPartIndex: undefined,
    isFailingPartEligibleNow: false,
    marginState: contractMarginState!,
    contractMarginState: contractMarginState!,
  };
}

export function getIsTwapIncreaseSequenceSafe(state: TwapIncreaseSequentialMarginState | undefined): boolean {
  return state?.failingPartIndex === undefined;
}
