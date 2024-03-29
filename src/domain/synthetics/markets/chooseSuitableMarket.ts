import { convertTokenAddress } from "config/tokens";
import type { TokenOption } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import { TradeType } from "domain/synthetics/trade";

function getLargestRelatedExistingPosition({
  chainId,
  positionsInfo,
  isLongPreferred,
  tokenAddress,
}: {
  chainId: number;
  positionsInfo: PositionsInfoData;
  isLongPreferred: boolean;
  tokenAddress: string;
}) {
  let largestRelatedExistingPosition: PositionInfo | undefined;
  for (const position of Object.values(positionsInfo)) {
    if (position.isLong !== isLongPreferred) {
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
  preferredTradeType?: TradeType;
}): { indexTokenAddress: string; marketTokenAddress?: string; tradeType: TradeType } | undefined {
  const isLongPreferred = preferredTradeType !== TradeType.Short;
  const tokenAddress = convertTokenAddress(chainId, tokenAddressRaw, "wrapped");

  if (isSwap) {
    return {
      indexTokenAddress: tokenAddressRaw,
      tradeType: TradeType.Swap,
    };
  }

  let largestRelatedExistingPosition: PositionInfo | undefined = getLargestRelatedExistingPosition({
    chainId,
    positionsInfo: positionsInfo || {},
    isLongPreferred,
    tokenAddress,
  });

  let marketTokenAddress: string | undefined;

  if (largestRelatedExistingPosition) {
    marketTokenAddress = largestRelatedExistingPosition.marketInfo.marketTokenAddress;
  } else {
    if (isLongPreferred) {
      marketTokenAddress = maxLongLiquidityPool.marketTokenAddress;
    }

    if (!isLongPreferred) {
      marketTokenAddress = maxShortLiquidityPool.marketTokenAddress;
    }
  }

  return {
    indexTokenAddress: tokenAddressRaw,
    marketTokenAddress,
    tradeType: preferredTradeType ?? TradeType.Long,
  };
}
