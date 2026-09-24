import { SortField } from '@/components/Selectors/MarketTokenSelector/MarketTokenSelector';
import { BN_ZERO } from '@/config/constants';
import { SortDirection } from '@/contexts/sorter/types';
import { GlvOrMarketInfo } from '@/selectors/glv/types';
import { TokenData } from '@/selectors/token/types';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { getMarketListingDate } from '@/utils/market/getMarketListingDate';
import { isBaseApyReadyToBeShown } from '@/utils/market/isBaseApyReadyToBeShown';
import { BN } from '@coral-xyz/anchor';

export function marketSortingComparatorBuilder({
  orderBy,
  direction,
}: {
  orderBy: SortField;
  direction: SortDirection;
}) {
  const directionMultiplier = direction === 'asc' ? 1 : -1;

  return (
    a: {
      market: TokenData;
      mintableInfo: { mintableUsd: BN };
      sellableInfo: { totalAmount?: BN };
      glvOrMarketInfo: GlvOrMarketInfo;
      apr: BN | undefined;
    },
    b: {
      market: TokenData;
      mintableInfo: { mintableUsd: BN };
      sellableInfo: { totalAmount?: BN };
      glvOrMarketInfo: GlvOrMarketInfo;
      apr: BN | undefined;
    }
  ) => {
    if (orderBy === 'unspecified' || direction === 'unspecified') {
      return 0;
    }

    if (orderBy === 'buyable') {
      const mintableA = a.mintableInfo?.mintableUsd ?? BN_ZERO;
      const mintableB = b.mintableInfo?.mintableUsd ?? BN_ZERO;
      return mintableA.gt(mintableB)
        ? directionMultiplier
        : -directionMultiplier;
    }

    if (orderBy === 'sellable') {
      const sellableA = a.sellableInfo?.totalAmount ?? BN_ZERO;
      const sellableB = b.sellableInfo?.totalAmount ?? BN_ZERO;
      return sellableA.gt(sellableB)
        ? directionMultiplier
        : -directionMultiplier;
    }

    if (orderBy === 'apy') {
      let aprA = BN_ZERO;
      if (
        isBaseApyReadyToBeShown(
          getMarketListingDate(getGlvOrMarketAddress(a.glvOrMarketInfo) ?? '')
        )
      ) {
        aprA = aprA.add(a.apr ?? BN_ZERO);
      }

      let aprB = BN_ZERO;
      if (
        isBaseApyReadyToBeShown(
          getMarketListingDate(getGlvOrMarketAddress(b.glvOrMarketInfo) ?? '')
        )
      ) {
        aprB = aprB.add(b.apr ?? BN_ZERO);
      }

      return aprA.gt(aprB) ? directionMultiplier : -directionMultiplier;
    }

    return 0;
  };
}
