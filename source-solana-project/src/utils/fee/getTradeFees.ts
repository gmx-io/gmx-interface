import { BN_ZERO } from '@/config/constants';
import { SwapFeeItem, TradeFees } from '@/selectors/fee/types';
import { SwapStats } from '@/selectors/trade/types';
import { getFeeItem } from '@/utils/fee/getFeeItem';
import { getTotalFeeItem } from '@/utils/fee/getTotalFeeItem';
import { getBasisPoints } from '@/utils/legacy/common';
import { BN } from '@coral-xyz/anchor';

export function getTradeFees(p: {
  initialCollateralUsd: BN;
  sizeDeltaUsd: BN;
  collateralDeltaUsd: BN;
  swapSteps: SwapStats[];
  positionFeeUsd: BN;
  gtRewardsUsd: BN;
  swapPriceImpactDeltaUsd: BN;
  positionPriceImpactDeltaUsd: BN;
  priceImpactDiffUsd: BN;
  borrowingFeeUsd: BN;
  fundingFeeUsd: BN;
  feeDiscountUsd: BN;
  swapProfitFeeUsd: BN;
  GtEnabled: boolean;
}): TradeFees {
  const {
    initialCollateralUsd,
    sizeDeltaUsd,
    collateralDeltaUsd,
    swapSteps,
    positionFeeUsd,
    gtRewardsUsd,
    swapPriceImpactDeltaUsd,
    positionPriceImpactDeltaUsd,
    priceImpactDiffUsd,
    borrowingFeeUsd,
    fundingFeeUsd,
    feeDiscountUsd,
    swapProfitFeeUsd,
    GtEnabled,
  } = p;

  const swapFees: SwapFeeItem[] | undefined = initialCollateralUsd.gt(BN_ZERO)
    ? swapSteps.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.neg(),
        bps: step.usdIn.isZero()
          ? 0
          : getBasisPoints(step.swapFeeUsd.neg(), step.usdIn),
      }))
    : undefined;

  const swapProfitFee = getFeeItem(
    swapProfitFeeUsd.neg(),
    initialCollateralUsd
  );
  const swapPriceImpact = getFeeItem(
    swapPriceImpactDeltaUsd,
    initialCollateralUsd
  );
  const positionFeeBeforeDiscount = getFeeItem(
    positionFeeUsd.neg(),
    sizeDeltaUsd,
    {
      shouldRoundUp: true,
    }
  );

  // const positionFeeAfterDiscount = getFeeItem(
  //   positionFeeUsd.sub(feeDiscountUsd).neg(),
  //   sizeDeltaUsd
  // );

  const gtRewards = getFeeItem(
    GtEnabled ? gtRewardsUsd : BN_ZERO,
    sizeDeltaUsd
  );

  const feeDiscount = getFeeItem(feeDiscountUsd, sizeDeltaUsd);

  const borrowFee = getFeeItem(borrowingFeeUsd.neg(), initialCollateralUsd);

  const fundingFee = getFeeItem(fundingFeeUsd.neg(), initialCollateralUsd);

  const positionPriceImpact = getFeeItem(
    positionPriceImpactDeltaUsd,
    sizeDeltaUsd
  );
  const priceImpactDiff = getFeeItem(priceImpactDiffUsd, sizeDeltaUsd);

  const positionCollateralPriceImpact = getFeeItem(
    positionPriceImpactDeltaUsd,
    collateralDeltaUsd.abs()
  );
  const collateralPriceImpactDiff = getFeeItem(
    priceImpactDiffUsd,
    collateralDeltaUsd
  );

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeBeforeDiscount,
    borrowFee,
    fundingFee,
  ]);

  const payTotalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeBeforeDiscount,
    borrowFee,
    fundingFee,
  ]);

  return {
    totalFees,
    payTotalFees,
    swapFees,
    swapProfitFee,
    swapPriceImpact,
    gtRewards,
    positionFee: positionFeeBeforeDiscount,
    positionPriceImpact,
    priceImpactDiff,
    positionCollateralPriceImpact,
    collateralPriceImpactDiff,
    borrowFee,
    fundingFee,
    feeDiscount,
  };
}
