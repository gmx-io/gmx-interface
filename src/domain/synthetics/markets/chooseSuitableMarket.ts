import type { TokenOption } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "domain/synthetics/trade";
import { isMarketIndexToken } from "./utils";

export function getLargestRelatedExistingPosition({
  positionsInfo,
  isLong,
  tokenAddress,
}: {
  positionsInfo: PositionsInfoData;
  isLong: boolean;
  tokenAddress: string;
}) {
  let largestRelatedExistingPosition: PositionInfo | undefined = undefined;
  for (const position of Object.values(positionsInfo)) {
    if (position.isLong !== isLong) {
      continue;
    }

    if (!isMarketIndexToken(position.marketInfo, tokenAddress)) {
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
  tokenAddress,
  maxLongLiquidityPool,
  maxShortLiquidityPool,
  isSwap,
  positionsInfo,
  preferredTradeType,
}: {
  tokenAddress: string;
  maxLongLiquidityPool: TokenOption;
  maxShortLiquidityPool: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfoData;
  preferredTradeType: PreferredTradeTypePickStrategy;
}): { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType } | undefined {
  if (isSwap) {
    return {
      indexTokenAddress: tokenAddress,
      tradeType: TradeType.Swap,
    };
  }

  if (preferredTradeType === "largestPosition" && positionsInfo) {
    let largestLongPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: true,
      tokenAddress,
    });

    let largestShortPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      tokenAddress,
    });

    if (!largestLongPosition && !largestShortPosition) {
      return {
        indexTokenAddress: tokenAddress,
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
      indexTokenAddress: tokenAddress,
      marketTokenAddress: largestPosition.marketInfo.marketTokenAddress,
      tradeType: largestPositionTradeType,
    };
  } else if (preferredTradeType === "largestPosition") {
    return {
      indexTokenAddress: tokenAddress,
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
        tokenAddress,
      });

    const marketTokenAddress =
      largestLongPosition?.marketInfo.marketTokenAddress ?? maxLongLiquidityPool.marketTokenAddress;

    return {
      indexTokenAddress: tokenAddress,
      marketTokenAddress: marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  const largestShortPosition =
    positionsInfo &&
    getLargestRelatedExistingPosition({
      positionsInfo,
      isLong: false,
      tokenAddress,
    });

  const marketTokenAddress =
    largestShortPosition?.marketInfo.marketTokenAddress ?? maxShortLiquidityPool.marketTokenAddress;

  return {
    indexTokenAddress: tokenAddress,
    marketTokenAddress: marketTokenAddress,
    tradeType: TradeType.Short,
  };
}
