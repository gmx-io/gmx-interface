import { BASIS_POINTS_DIVISOR_BIGINT } from "configs/factors";
import { bigMath } from "utils/bigmath";
import {
  getBorrowingFeeRateUsd,
  getFundingFeeRateUsd,
  getPositionFee,
  getPriceImpactForPosition,
  getTotalSwapVolumeFromSwapStats,
} from "utils/fees";
import { getMarketInfoWithSwapDelta, getMaxAllowedLeverage } from "utils/markets";
import { MarketInfo, MarketsInfoData } from "utils/markets/types";
import { applyFactor } from "utils/numbers";
import { SwapPricingType } from "utils/orders/types";
import { getLeverage } from "utils/positions";
import { getMarkPrice } from "utils/prices";
import { UserReferralInfo } from "utils/referrals/types";
import { getSwapPathStats } from "utils/swap/swapStats";
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
  partGrossCollateralUsds: bigint[];
};

export type TwapIncreaseAggregateAmounts = {
  sizeDeltaUsd: bigint;
  pendingFeesUsd: bigint;
};

export type TwapIncreasePartAmounts = {
  partSizeDeltaUsd: bigint;
  pendingFeesUsd: bigint;
};

export type TwapIncreasePartsCollateralParams = {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralToken: TokenData;
  collateralToken: TokenData;
  initialCollateralAmountPerPart: bigint;
  numberOfParts: number;
  uiFeeFactor: bigint;
  wrappedNativeTokenAddress: string;
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
  return {
    sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
    pendingFeesUsd: increaseAmounts.borrowingFeeUsd + increaseAmounts.fundingFeeUsd,
  };
}

export function getTwapIncreasePartAmounts(
  { sizeDeltaUsd, pendingFeesUsd }: TwapIncreaseAggregateAmounts,
  numberOfParts: number
): TwapIncreasePartAmounts {
  if (numberOfParts < 1) {
    return { partSizeDeltaUsd: 0n, pendingFeesUsd };
  }

  return { partSizeDeltaUsd: sizeDeltaUsd / BigInt(numberOfParts), pendingFeesUsd };
}

export function getTwapIncreasePartsGrossCollateralUsd(p: TwapIncreasePartsCollateralParams): bigint[] | undefined {
  const {
    swapPath,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmountPerPart,
    numberOfParts,
    uiFeeFactor,
    wrappedNativeTokenAddress,
  } = p;

  if (numberOfParts < 1) {
    return [];
  }

  const usdIn = convertToUsd(
    initialCollateralAmountPerPart,
    initialCollateralToken.decimals,
    initialCollateralToken.prices.minPrice
  )!;

  if (swapPath.length === 0) {
    return Array.from({ length: numberOfParts }, () => usdIn);
  }
  let marketsInfoData = p.marketsInfoData;
  const partGrossCollateralUsds: bigint[] = [];

  for (let partIndex = 0; partIndex < numberOfParts; partIndex++) {
    const swapPathStats = getSwapPathStats({
      marketsInfoData,
      swapPath,
      initialCollateralAddress: initialCollateralToken.address,
      wrappedNativeTokenAddress,
      usdIn,
      shouldUnwrapNativeToken: false,
      shouldApplyPriceImpact: true,
      swapPricingType: SwapPricingType.Swap,
    });

    if (!swapPathStats || swapPathStats.amountOut <= 0n) {
      return undefined;
    }

    const grossCollateralUsd = convertToUsd(
      swapPathStats.amountOut,
      collateralToken.decimals,
      collateralToken.prices.minPrice
    )!;
    const swapUiFeeUsd = applyFactor(getTotalSwapVolumeFromSwapStats(swapPathStats.swapSteps), uiFeeFactor);

    partGrossCollateralUsds.push(grossCollateralUsd - swapUiFeeUsd);

    marketsInfoData = swapPathStats.swapSteps.reduce(
      (acc, swapStep) => ({
        ...acc,
        [swapStep.marketAddress]: getMarketInfoWithSwapDelta(acc[swapStep.marketAddress], swapStep),
      }),
      marketsInfoData
    );
  }

  return partGrossCollateralUsds;
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
    partGrossCollateralUsds,
    partSizeDeltaUsd,
    pendingFeesUsd,
    uiFeeFactor,
    minCollateralUsd,
    userReferralInfo,
    proDiscountFactor,
  } = p;

  if (numberOfParts < 1 || partSizeDeltaUsd <= 0n || partGrossCollateralUsds.length < numberOfParts) {
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
    const collateralDeltaUsd = partGrossCollateralUsds[partIndex] - positionFeeUsd - uiFeeUsd - settledFeesUsd;
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
