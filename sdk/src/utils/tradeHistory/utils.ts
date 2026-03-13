import { getAddress } from "viem";

import type { TradeAction as SubsquidTradeAction } from "codegen/subsquid";
import type { MarketsInfoData } from "utils/markets/types";
import { toBigInt } from "utils/numbers";
import { getByKey } from "utils/objects";
import { isIncreaseOrderType, isSwapOrderType } from "utils/orders";
import { getSwapPathOutputAddresses } from "utils/swap/swapStats";
import { parseContractPrice } from "utils/tokens";
import { Token, TokensData } from "utils/tokens/types";

import type { PositionTradeAction, SwapTradeAction } from "./types";
import { TradeActionType } from "./types";

export function createRawTradeActionTransformer(
  marketsInfoData: MarketsInfoData,
  wrappedToken: Token,
  tokensData: TokensData
): (
  value: SubsquidTradeAction,
  index: number,
  array: SubsquidTradeAction[]
) => SwapTradeAction | PositionTradeAction | undefined {
  return (rawAction) => {
    const orderType = Number(rawAction.orderType);

    if (isSwapOrderType(orderType)) {
      const initialCollateralTokenAddress = getAddress(rawAction.initialCollateralTokenAddress!);
      const swapPath = rawAction.swapPath!.map((address) => getAddress(address));

      const swapPathOutputAddresses = getSwapPathOutputAddresses({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: initialCollateralTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        isIncrease: false,
      });

      const initialCollateralToken = getByKey(tokensData, initialCollateralTokenAddress)!;
      const targetCollateralToken = getByKey(tokensData, swapPathOutputAddresses.outTokenAddress)!;

      if (!initialCollateralToken || !targetCollateralToken) {
        return undefined;
      }

      const tradeAction: SwapTradeAction = {
        type: "swap",
        id: rawAction.id,
        srcChainId: rawAction.srcChainId ? Number(rawAction.srcChainId) : undefined,
        eventName: rawAction.eventName as TradeActionType,
        account: rawAction.account,
        swapPath,
        orderType,
        orderKey: rawAction.orderKey,
        initialCollateralTokenAddress: rawAction.initialCollateralTokenAddress!,
        initialCollateralDeltaAmount: toBigInt(rawAction.initialCollateralDeltaAmount)!,
        minOutputAmount: toBigInt(rawAction.minOutputAmount)!,
        executionAmountOut: rawAction.executionAmountOut ? toBigInt(rawAction.executionAmountOut) : undefined,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        targetCollateralToken,
        initialCollateralToken,
        timestamp: rawAction.timestamp,
        transactionHash: rawAction.transactionHash,
        reason: rawAction.reason ?? undefined,
        reasonBytes: rawAction.reasonBytes ?? undefined,
        twapParams:
          rawAction.twapGroupId && rawAction.numberOfParts
            ? {
                twapGroupId: rawAction.twapGroupId,
                numberOfParts: rawAction.numberOfParts,
              }
            : undefined,
      };

      return tradeAction;
    } else {
      const marketAddress = getAddress(rawAction.marketAddress!);
      const marketInfo = getByKey(marketsInfoData, marketAddress);
      const indexToken = marketInfo?.indexToken;
      const initialCollateralTokenAddress = getAddress(rawAction.initialCollateralTokenAddress!);
      const swapPath = rawAction.swapPath!.map((address) => getAddress(address));
      const swapPathOutputAddresses = getSwapPathOutputAddresses({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: initialCollateralTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        isIncrease: isIncreaseOrderType(rawAction.orderType),
      });
      const initialCollateralToken = getByKey(tokensData, initialCollateralTokenAddress);
      const targetCollateralToken = getByKey(tokensData, swapPathOutputAddresses.outTokenAddress);

      if (!marketInfo || !indexToken || !initialCollateralToken || !targetCollateralToken) {
        return undefined;
      }

      const tradeAction: PositionTradeAction = {
        type: "position",
        id: rawAction.id,
        eventName: rawAction.eventName as TradeActionType,
        account: rawAction.account,
        marketAddress,
        marketInfo,
        srcChainId: rawAction.srcChainId ? Number(rawAction.srcChainId) : undefined,
        indexToken,
        swapPath,
        initialCollateralTokenAddress,
        initialCollateralToken,
        targetCollateralToken,
        initialCollateralDeltaAmount: toBigInt(rawAction.initialCollateralDeltaAmount)!,
        sizeDeltaUsd: toBigInt(rawAction.sizeDeltaUsd)!,
        sizeDeltaInTokens: rawAction.sizeDeltaInTokens ? toBigInt(rawAction.sizeDeltaInTokens) : undefined,
        triggerPrice: rawAction.triggerPrice
          ? parseContractPrice(toBigInt(rawAction.triggerPrice)!, indexToken.decimals)
          : undefined,
        acceptablePrice: parseContractPrice(toBigInt(rawAction.acceptablePrice)!, indexToken.decimals),
        executionPrice: rawAction.executionPrice
          ? parseContractPrice(toBigInt(rawAction.executionPrice)!, indexToken.decimals)
          : undefined,
        minOutputAmount: toBigInt(rawAction.minOutputAmount)!,

        collateralTokenPriceMax: rawAction.collateralTokenPriceMax
          ? parseContractPrice(toBigInt(rawAction.collateralTokenPriceMax)!, initialCollateralToken.decimals)
          : undefined,

        collateralTokenPriceMin: rawAction.collateralTokenPriceMin
          ? parseContractPrice(toBigInt(rawAction.collateralTokenPriceMin)!, initialCollateralToken.decimals)
          : undefined,

        indexTokenPriceMin: rawAction.indexTokenPriceMin
          ? parseContractPrice(BigInt(rawAction.indexTokenPriceMin), indexToken.decimals)
          : undefined,
        indexTokenPriceMax: rawAction.indexTokenPriceMax
          ? parseContractPrice(BigInt(rawAction.indexTokenPriceMax), indexToken.decimals)
          : undefined,

        orderType,
        orderKey: rawAction.orderKey,
        isLong: rawAction.isLong!,
        pnlUsd: rawAction.pnlUsd ? BigInt(rawAction.pnlUsd) : undefined,
        basePnlUsd: rawAction.basePnlUsd ? BigInt(rawAction.basePnlUsd) : undefined,

        priceImpactDiffUsd: rawAction.priceImpactDiffUsd ? BigInt(rawAction.priceImpactDiffUsd) : undefined,
        priceImpactUsd: rawAction.priceImpactUsd ? BigInt(rawAction.priceImpactUsd) : undefined,
        totalImpactUsd: rawAction.totalImpactUsd ? BigInt(rawAction.totalImpactUsd) : undefined,
        positionFeeAmount: rawAction.positionFeeAmount ? BigInt(rawAction.positionFeeAmount) : undefined,
        borrowingFeeAmount: rawAction.borrowingFeeAmount ? BigInt(rawAction.borrowingFeeAmount) : undefined,
        fundingFeeAmount: rawAction.fundingFeeAmount ? BigInt(rawAction.fundingFeeAmount) : undefined,
        liquidationFeeAmount: rawAction.liquidationFeeAmount ? BigInt(rawAction.liquidationFeeAmount) : undefined,

        reason: rawAction.reason ?? undefined,
        reasonBytes: rawAction.reasonBytes ?? undefined,

        transactionHash: rawAction.transactionHash,
        timestamp: rawAction.timestamp,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        twapParams:
          rawAction.twapGroupId && rawAction.numberOfParts
            ? {
                twapGroupId: rawAction.twapGroupId,
                numberOfParts: rawAction.numberOfParts,
              }
            : undefined,
      };

      return tradeAction;
    }
  };
}
