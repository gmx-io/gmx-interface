import { convertTokenAddress } from "config/tokens";
import type { TokenOption } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "domain/synthetics/trade";

function getLargestRelatedExistingPosition({
  chainId,
  positionsInfo,
  isLong,
  tokenAddress,
}: {
  chainId: number;
  positionsInfo: PositionsInfoData;
  isLong: boolean;
  tokenAddress: string;
}) {
  let largestRelatedExistingPosition: PositionInfo | undefined = undefined;
  for (const position of Object.values(positionsInfo)) {
    if (position.isLong !== isLong) {
      continue;
    }

    if (convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") !== tokenAddress) {
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
  chainId,
  tokenAddress: tokenAddressRaw,
  maxLongLiquidityPool,
  maxShortLiquidityPool,
  isSwap,
  positionsInfo,
  preferredTradeType,
}: {
  chainId: number;
  tokenAddress: string;
  maxLongLiquidityPool: TokenOption;
  maxShortLiquidityPool: TokenOption;
  isSwap?: boolean;
  positionsInfo?: PositionsInfoData;
  preferredTradeType: PreferredTradeTypePickStrategy;
}): { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType } | undefined {
  const tokenAddress = convertTokenAddress(chainId, tokenAddressRaw, "wrapped");

  if (isSwap) {
    return {
      indexTokenAddress: tokenAddressRaw,
      tradeType: TradeType.Swap,
    };
  }

  if (preferredTradeType === "largestPosition" && positionsInfo) {
    let largestLongPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      chainId,
      positionsInfo,
      isLong: true,
      tokenAddress,
    });

    let largestShortPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
      chainId,
      positionsInfo,
      isLong: false,
      tokenAddress,
    });

    if (!largestLongPosition && !largestShortPosition) {
      return {
        indexTokenAddress: tokenAddressRaw,
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
      indexTokenAddress: tokenAddressRaw,
      marketTokenAddress: largestPosition.marketInfo.marketTokenAddress,
      tradeType: largestPositionTradeType,
    };
  } else if (preferredTradeType === "largestPosition") {
    return {
      indexTokenAddress: tokenAddressRaw,
      marketTokenAddress: maxLongLiquidityPool.marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  if (preferredTradeType === TradeType.Long) {
    const largestLongPosition =
      positionsInfo &&
      getLargestRelatedExistingPosition({
        chainId,
        positionsInfo,
        isLong: true,
        tokenAddress,
      });

    const marketTokenAddress =
      largestLongPosition?.marketInfo.marketTokenAddress ?? maxLongLiquidityPool.marketTokenAddress;

    return {
      indexTokenAddress: tokenAddressRaw,
      marketTokenAddress: marketTokenAddress,
      tradeType: TradeType.Long,
    };
  }

  const largestShortPosition =
    positionsInfo &&
    getLargestRelatedExistingPosition({
      chainId,
      positionsInfo,
      isLong: false,
      tokenAddress,
    });

  const marketTokenAddress =
    largestShortPosition?.marketInfo.marketTokenAddress ?? maxShortLiquidityPool.marketTokenAddress;

  return {
    indexTokenAddress: tokenAddressRaw,
    marketTokenAddress: marketTokenAddress,
    tradeType: TradeType.Short,
  };
}
