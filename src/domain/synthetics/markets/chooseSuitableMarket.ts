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

    if (position.sizeInUsd > largestRelatedExistingPosition.sizeInUsd) {
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
  currentTradeType,
}: {
  indexTokenAddress: string;
  maxLongLiquidityPool?: TokenOption;
  maxShortLiquidityPool?: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfoData;
  preferredTradeType: PreferredTradeTypePickStrategy;
  currentTradeType?: TradeType;
}):
  | { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType; collateralTokenAddress?: string }
  | undefined {
  if (isSwap) {
    return {
      indexTokenAddress,
      tradeType: TradeType.Swap,
    };
  }
  const maxLiquidtyPool = preferredTradeType === TradeType.Long ? maxLongLiquidityPool : maxShortLiquidityPool;

  if (preferredTradeType === "largestPosition" && positionsInfo) {
    let largestLongPosition = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: true,
      indexTokenAddress,
    });

    let largestShortPosition = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      indexTokenAddress,
    });

    if (!largestLongPosition && !largestShortPosition) {
      let marketTokenAddress = maxLiquidtyPool?.marketTokenAddress;

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
      largestPosition =
        largestLongPosition.sizeInUsd > largestShortPosition.sizeInUsd ? largestLongPosition : largestShortPosition;
    } else {
      largestPosition = (largestLongPosition || largestShortPosition) as PositionInfo;
    }

    const largestPositionTradeType = largestPosition.isLong ? TradeType.Long : TradeType.Short;

    return {
      indexTokenAddress,
      marketTokenAddress: largestPosition.marketInfo.marketTokenAddress,
      tradeType: largestPositionTradeType,
      collateralTokenAddress: largestPosition.collateralTokenAddress,
    };
  } else if (preferredTradeType === "largestPosition") {
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
    getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: preferredTradeType === TradeType.Long,
      indexTokenAddress,
    });

  const marketAddress = largestPosition?.marketInfo.marketTokenAddress ?? maxLiquidtyPool?.marketTokenAddress;

  if (!marketAddress) {
    return undefined;
  }

  return {
    indexTokenAddress,
    marketTokenAddress: marketAddress,
    tradeType: preferredTradeType,
    collateralTokenAddress: largestPosition?.collateralTokenAddress,
  };
}
