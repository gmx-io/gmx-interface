import { getAddress } from "viem";

import type { MarketsInfoData } from "types/markets";
import { Token, TokensData } from "types/tokens";
import type { PositionTradeAction } from "types/tradeHistory";
import type { RawTradeAction } from "types/tradeHistory";
import type { SwapTradeAction } from "types/tradeHistory";

import { getByKey } from "./objects";
import { isIncreaseOrderType, isSwapOrderType } from "./orders";
import { getSwapPathOutputAddresses } from "./swap/swapStats";
import { parseContractPrice } from "./tokens";

export function createRawTradeActionTransformer(
  marketsInfoData: MarketsInfoData,
  wrappedToken: Token,
  tokensData: TokensData
): (
  value: RawTradeAction,
  index: number,
  array: RawTradeAction[]
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
        id: rawAction.id,
        eventName: rawAction.eventName,
        account: rawAction.account,
        swapPath,
        orderType,
        orderKey: rawAction.orderKey,
        initialCollateralTokenAddress: rawAction.initialCollateralTokenAddress!,
        initialCollateralDeltaAmount: bigNumberify(rawAction.initialCollateralDeltaAmount)!,
        minOutputAmount: bigNumberify(rawAction.minOutputAmount)!,
        executionAmountOut: rawAction.executionAmountOut ? bigNumberify(rawAction.executionAmountOut) : undefined,
        shouldUnwrapNativeToken: rawAction.shouldUnwrapNativeToken!,
        targetCollateralToken,
        initialCollateralToken,
        timestamp: rawAction.timestamp,
        transaction: rawAction.transaction,
        reason: rawAction.reason,
        reasonBytes: rawAction.reasonBytes,
        twapGroupId: rawAction.twapGroupId,
        numberOfParts: rawAction.numberOfParts,
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
        id: rawAction.id,
        eventName: rawAction.eventName,
        account: rawAction.account,
        marketAddress,
        marketInfo,
        indexToken,
        swapPath,
        initialCollateralTokenAddress,
        initialCollateralToken,
        targetCollateralToken,
        initialCollateralDeltaAmount: bigNumberify(rawAction.initialCollateralDeltaAmount)!,
        sizeDeltaUsd: bigNumberify(rawAction.sizeDeltaUsd)!,
        triggerPrice: rawAction.triggerPrice
          ? parseContractPrice(bigNumberify(rawAction.triggerPrice)!, indexToken.decimals)
          : undefined,
        acceptablePrice: parseContractPrice(bigNumberify(rawAction.acceptablePrice)!, indexToken.decimals),
        executionPrice: rawAction.executionPrice
          ? parseContractPrice(bigNumberify(rawAction.executionPrice)!, indexToken.decimals)
          : undefined,
        minOutputAmount: bigNumberify(rawAction.minOutputAmount)!,

        collateralTokenPriceMax: rawAction.collateralTokenPriceMax
          ? parseContractPrice(bigNumberify(rawAction.collateralTokenPriceMax)!, initialCollateralToken.decimals)
          : undefined,

        collateralTokenPriceMin: rawAction.collateralTokenPriceMin
          ? parseContractPrice(bigNumberify(rawAction.collateralTokenPriceMin)!, initialCollateralToken.decimals)
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
        positionFeeAmount: rawAction.positionFeeAmount ? BigInt(rawAction.positionFeeAmount) : undefined,
        borrowingFeeAmount: rawAction.borrowingFeeAmount ? BigInt(rawAction.borrowingFeeAmount) : undefined,
        fundingFeeAmount: rawAction.fundingFeeAmount ? BigInt(rawAction.fundingFeeAmount) : undefined,
        liquidationFeeAmount: rawAction.liquidationFeeAmount ? BigInt(rawAction.liquidationFeeAmount) : undefined,

        reason: rawAction.reason,
        reasonBytes: rawAction.reasonBytes,

        transaction: rawAction.transaction,
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

export function bigNumberify(n?: bigint | string | null | undefined) {
  try {
    if (n === undefined) throw new Error("n is undefined");
    if (n === null) throw new Error("n is null");

    return BigInt(n);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("bigNumberify error", e);
    return undefined;
  }
}
