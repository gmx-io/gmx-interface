import { PositionInfo, PositionsInfo } from '@/selectors/position/types';
import { TokenOption } from '@/selectors/token/types';
import { TradeType } from '@/selectors/trade/types';
import { PreferredTradeTypePickStrategy } from '@/utils/lib/transaction';
import { getMarketLargestRelatedExistingPosition } from '@/utils/market/getMarketLargestRelatedExistingPosition';

export function chooseSuitableMarket({
  indexTokenAddress,
  maxLongLiquidityPool,
  maxShortLiquidityPool,
  isSwap,
  positionsInfo,
  preferredTradeType,
  currentTradeType,
}: {
  indexTokenAddress: string;
  maxLongLiquidityPool?: TokenOption;
  maxShortLiquidityPool?: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfo;
  preferredTradeType: PreferredTradeTypePickStrategy;
  currentTradeType?: TradeType;
}):
  | {
      indexTokenAddress: string;
      marketTokenAddress?: string;
      tradeType: TradeType;
      collateralTokenAddress?: string;
    }
  | undefined {
  if (isSwap) {
    return {
      indexTokenAddress,
      tradeType: TradeType.Swap,
    };
  }
  const maxLiquidtyPool =
    preferredTradeType === TradeType.Long
      ? maxLongLiquidityPool
      : maxShortLiquidityPool;

  if (preferredTradeType === 'largestPosition' && positionsInfo) {
    const largestLongPosition = getMarketLargestRelatedExistingPosition({
      positionsInfo,
      isLong: true,
      indexTokenAddress,
    });

    const largestShortPosition = getMarketLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      indexTokenAddress,
    });

    if (!largestLongPosition && !largestShortPosition) {
      const marketTokenAddress = maxLiquidtyPool?.marketTokenAddress;

      if (!marketTokenAddress) {
        return undefined;
      }

      return {
        indexTokenAddress,
        marketTokenAddress: marketTokenAddress,
        tradeType: currentTradeType ?? TradeType.Long,
      };
    }

    let largestPosition: PositionInfo | undefined = undefined;
    if (largestLongPosition && largestShortPosition) {
      largestPosition = largestLongPosition.sizeInUsd.gt(
        largestShortPosition.sizeInUsd
      )
        ? largestLongPosition
        : largestShortPosition;
    } else {
      largestPosition = (largestLongPosition ||
        largestShortPosition) as PositionInfo;
    }

    const largestPositionTradeType = largestPosition.isLong
      ? TradeType.Long
      : TradeType.Short;

    return {
      indexTokenAddress,
      marketTokenAddress:
        largestPosition.marketInfo.marketTokenAddress.toBase58(),
      tradeType: largestPositionTradeType,
      collateralTokenAddress:
        largestPosition.collateralTokenAddress?.toBase58(),
    };
  } else if (preferredTradeType === 'largestPosition') {
    if (!maxLongLiquidityPool) {
      return undefined;
    }

    return {
      indexTokenAddress,
      marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  const largestPosition =
    positionsInfo &&
    getMarketLargestRelatedExistingPosition({
      positionsInfo,
      isLong: preferredTradeType === TradeType.Long,
      indexTokenAddress,
    });

  const marketAddress =
    largestPosition?.marketInfo.marketTokenAddress ??
    maxLiquidtyPool?.marketTokenAddress;

  if (!marketAddress) {
    return undefined;
  }

  return {
    indexTokenAddress,
    marketTokenAddress: marketAddress.toString(),
    tradeType: preferredTradeType,
    collateralTokenAddress: largestPosition?.collateralTokenAddress?.toBase58(),
  };
}
