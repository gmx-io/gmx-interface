import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { Position } from '@/selectors/position/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { unpackFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPositionPendingFundingFeesUsd(
  marketInfo: MarketInfo,
  position: Position
): BN {
  const marketPendingFundingFeeFactor = position.isLong
    ? position.collateralTokenAddress.equals(marketInfo.longToken.address)
      ? marketInfo.fundingAmountPerSizeForLongLongTokenAmount
      : marketInfo.fundingAmountPerSizeForLongShortTokenAmount
    : position.collateralTokenAddress.equals(marketInfo.longToken.address)
      ? marketInfo.fundingAmountPerSizeForShortLongTokenAmount
      : marketInfo.fundingAmountPerSizeForShortShortTokenAmount;

  const positionPendingFundingFeeFactor = position.fundingFeeAmountPerSize;
  const diffPendingFundingFeeFactor = marketPendingFundingFeeFactor
    .sub(positionPendingFundingFeeFactor)
    .abs()
    .neg();

  const pendingFundingFeesAmount = unpackFactor(
    position.sizeInUsd,
    diffPendingFundingFeeFactor
  );

  let pendingFundingFeesUsd = BN_ZERO;

  if (position.collateralTokenAddress.equals(marketInfo.longToken.address)) {
    pendingFundingFeesUsd = convertTokenAmountToUsd(
      pendingFundingFeesAmount,
      marketInfo.longToken.decimals,
      marketInfo.longToken.prices.minPrice
    );
  } else if (
    position.collateralTokenAddress.equals(marketInfo.shortToken.address)
  ) {
    pendingFundingFeesUsd = convertTokenAmountToUsd(
      pendingFundingFeesAmount,
      marketInfo.shortToken.decimals,
      marketInfo.shortToken.prices.minPrice
    );
  }

  return pendingFundingFeesUsd;
}
