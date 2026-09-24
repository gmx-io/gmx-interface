import { getGmw200Enabled } from '@/config/featureFlagEnable';
import {
  BASIS_POINTS_DIVISOR_BN,
  BN_ZERO,
  CHART_PERIODS,
} from '@/config/constants';
import { PositionInfo } from '@/selectors/position/types';
import { getBorrowingFeeRateUsd } from '@/utils/fee/getBorrowingFeeRateUsd';
import { getFundingFeeRateUsd } from '@/utils/fee/getFundingFeeRateUsd';
import { applyFactor } from '@/utils/legacy/factor';
import { formatAmount } from '@/utils/legacy/format';
import { getPositionPriceImpactUsd } from '@/utils/position/getPositionPriceImpactUsd';
import { BN } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';

export function getPositionEstimatedLiquidationTimeInHours(
  position: PositionInfo,
  minCollateralUsd: BN | undefined
): number | undefined {
  const { marketInfo, isLong, sizeInUsd, isOpening, netValue } = position;

  if (isOpening || minCollateralUsd === undefined || netValue === undefined)
    return;

  let liquidationCollateralUsd = applyFactor(
    sizeInUsd,
    getGmw200Enabled()
      ? marketInfo.minCollateralFactorForLiquidation
      : marketInfo.minCollateralFactor
  );
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd;
  }
  const borrowFeePerHour = getBorrowingFeeRateUsd(
    marketInfo,
    isLong,
    sizeInUsd,
    toBN(CHART_PERIODS['1h'])
  );
  const fundingFeePerHour = getFundingFeeRateUsd(
    marketInfo,
    isLong,
    sizeInUsd,
    toBN(CHART_PERIODS['1h'])
  );
  const maxNegativePriceImpactUsd = applyFactor(
    sizeInUsd,
    marketInfo.maxPositionImpactFactorForLiquidations
  ).neg();
  let priceImpactDeltaUsd = getPositionPriceImpactUsd(
    marketInfo,
    sizeInUsd.neg(),
    isLong,
    {
      fallbackToZero: true,
    }
  );

  if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd;
  }
  // Ignore positive price impact
  if (priceImpactDeltaUsd.gt(BN_ZERO)) {
    priceImpactDeltaUsd = BN_ZERO;
  }
  const totalFeesPerHour = borrowFeePerHour
    .abs()
    .add(fundingFeePerHour.lt(BN_ZERO) ? fundingFeePerHour.abs() : BN_ZERO);
  if (totalFeesPerHour.isZero()) return;
  const hours = netValue
    .add(priceImpactDeltaUsd)
    .sub(liquidationCollateralUsd)
    .mul(BASIS_POINTS_DIVISOR_BN)
    .div(totalFeesPerHour);

  return parseFloat(formatAmount(hours, 4, 2));
}
