import { MarketInfo } from '@/selectors/market/types';
import { Position } from '@/selectors/position/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { unpackFactor } from '@/utils/legacy/factor';
import { BN } from '@coral-xyz/anchor';

export function getPositionPendingClaimableFundingFeesUsd(
  marketInfo: MarketInfo,
  position: Position
): BN {
  const marketLongTokenClaimableFundingFeeFactor = position.isLong
    ? marketInfo.claimableFundingAmountPerSizeForLongLongTokenAmount
    : marketInfo.claimableFundingAmountPerSizeForShortLongTokenAmount;

  const marketShortTokenClaimableFundingFeeFactor = position.isLong
    ? marketInfo.claimableFundingAmountPerSizeForLongShortTokenAmount
    : marketInfo.claimableFundingAmountPerSizeForShortShortTokenAmount;

  const positionLongTokenClaimableFundingFeeFactor =
    position.longTokenClaimableFundingAmountPerSize;
  const positionShortTokenClaimableFundingFeeFactor =
    position.shortTokenClaimableFundingAmountPerSize;

  const diffLongTokenClaimableFundingFeeFactor =
    marketLongTokenClaimableFundingFeeFactor.sub(
      positionLongTokenClaimableFundingFeeFactor
    );

  const diffShortTokenClaimableFundingFeeFactor =
    marketShortTokenClaimableFundingFeeFactor.sub(
      positionShortTokenClaimableFundingFeeFactor
    );

  const pendingLongTokenClaimableFundingFeesAmount = unpackFactor(
    position.sizeInUsd,
    diffLongTokenClaimableFundingFeeFactor
  );

  const pendingLongTokenClaimableFundingFeesUsd = convertTokenAmountToUsd(
    pendingLongTokenClaimableFundingFeesAmount,
    marketInfo.longToken.decimals,
    marketInfo.longToken.prices.minPrice
  );

  const pendingShortTokenClaimableFundingFeesAmount = unpackFactor(
    position.sizeInUsd,
    diffShortTokenClaimableFundingFeeFactor
  );

  const pendingShortTokenClaimableFundingFeesUsd = convertTokenAmountToUsd(
    pendingShortTokenClaimableFundingFeesAmount,
    marketInfo.shortToken.decimals,
    marketInfo.shortToken.prices.minPrice
  );

  return pendingLongTokenClaimableFundingFeesUsd.add(
    pendingShortTokenClaimableFundingFeesUsd
  );
}
