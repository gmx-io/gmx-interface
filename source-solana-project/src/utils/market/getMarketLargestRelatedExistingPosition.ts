import { PositionsInfo } from '@/selectors/position/types';
import { PositionInfo } from '@/selectors/position/types';
import { isMarketIndexToken } from '@/utils/market/isMarketIndexToken';

export function getMarketLargestRelatedExistingPosition({
  positionsInfo,
  isLong,
  indexTokenAddress,
}: {
  positionsInfo: PositionsInfo;
  isLong: boolean;
  indexTokenAddress: string;
}): PositionInfo | undefined {
  return Object.values(positionsInfo)
    .filter(
      (position) =>
        position.isLong === isLong &&
        isMarketIndexToken(position.marketInfo, indexTokenAddress)
    )
    .reduce<PositionInfo | undefined>((largest, current) => {
      if (!largest) return current;
      return current.sizeInUsd.gt(largest.sizeInUsd) ? current : largest;
    }, undefined);
}
