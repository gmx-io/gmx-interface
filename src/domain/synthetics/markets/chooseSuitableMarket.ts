import type { TokenOption } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "domain/synthetics/trade";
import { isMarketIndexToken } from "./utils";

export function getLargestRelatedExistingPosition({
  positionsInfo,
  isLong,
  indexTokenAddress,
}: {
  positionsInfo: PositionsInfoData;
  isLong: boolean;
  indexTokenAddress: string;
}): PositionInfo | undefined {
  let largestRelatedExistingPosition: PositionInfo | undefined = undefined;
  for (const position of Object.values(positionsInfo)) {
    if (position.isLong !== isLong) {
      continue;
    }

    if (!isMarketIndexToken(position.marketInfo, indexTokenAddress)) {
      continue;
    }

    if (!largestRelatedExistingPosition) {
      largestRelatedExistingPosition = position;
      continue;
    }

    if (position.sizeInUsd.gt(largestRelatedExistingPosition.sizeInUsd)) {
      largestRelatedExistingPosition = position;
    }
  }

  return largestRelatedExistingPosition;
}

export type PreferredTradeTypePickStrategy = TradeType | "largestPosition";

export function chooseSuitableMarket({
  indexTokenAddress,
  maxLongLiquidityPool,
  maxShortLiquidityPool,
  isSwap,
  positionsInfo,
  preferredTradeType,
}: {
  indexTokenAddress: string;
  maxLongLiquidityPool: TokenOption;
  maxShortLiquidityPool: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfoData;
  preferredTradeType: PreferredTradeTypePickStrategy;
}):
  | { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType; collateralTokenAddress?: string }
  | undefined {
  if (isSwap) {
    return {
      indexTokenAddress,
      tradeType: TradeType.Swap,
    };
  }

  if (preferredTradeType === "largestPosition" && positionsInfo) {
    let largestLongPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: true,
      indexTokenAddress,
    });

    let largestShortPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      indexTokenAddress,
    });

    if (!largestLongPosition && !largestShortPosition) {
      return {
        indexTokenAddress,
        marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
        tradeType: TradeType.Long,
      };
    }

    let largestPosition: PositionInfo;
    if (largestLongPosition && largestShortPosition) {
      largestPosition = largestLongPosition.sizeInUsd.gt(largestShortPosition.sizeInUsd)
        ? largestLongPosition
        : largestShortPosition;
    } else {
      largestPosition = largestLongPosition! || largestShortPosition!;
    }
    const largestPositionTradeType = largestPosition?.isLong ? TradeType.Long : TradeType.Short;

    return {
      indexTokenAddress,
      marketTokenAddress: largestPosition.marketInfo.marketTokenAddress,
      tradeType: largestPositionTradeType,
      collateralTokenAddress: largestPosition.collateralTokenAddress,
    };
  } else if (preferredTradeType === "largestPosition") {
    return {
      indexTokenAddress,
      marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  if (preferredTradeType === TradeType.Long) {
    const largestLongPosition =
      positionsInfo &&
      getLargestRelatedExistingPosition({
        positionsInfo,
        isLong: true,
        indexTokenAddress,
      });

    const marketTokenAddress =
      largestLongPosition?.marketInfo.marketTokenAddress ?? maxLongLiquidityPool.marketTokenAddress;

    return {
      indexTokenAddress,
      marketTokenAddress: marketTokenAddress,
      tradeType: TradeType.Long,
      collateralTokenAddress: largestLongPosition?.collateralTokenAddress,
    };
  }

  const largestShortPosition =
    positionsInfo &&
    getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      indexTokenAddress,
    });

  const marketTokenAddress =
    largestShortPosition?.marketInfo.marketTokenAddress ?? maxShortLiquidityPool.marketTokenAddress;

  return {
    indexTokenAddress,
    marketTokenAddress,
    tradeType: TradeType.Short,
    collateralTokenAddress: largestShortPosition?.collateralTokenAddress,
  };
}
