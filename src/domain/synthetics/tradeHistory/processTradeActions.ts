import type { Address } from "viem";

import type { MarketsInfoData } from "domain/synthetics/markets/types";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import type { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade/utils";
import type { TradeAction as SubsquidTradeAction } from "sdk/codegen/subsquid";
import { getWrappedToken } from "sdk/configs/tokens";
import { createRawTradeActionTransformer } from "sdk/utils/tradeHistory";
import type { PositionTradeAction, TradeAction } from "sdk/utils/tradeHistory/types";

import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

export function processRawTradeActions({
  chainId,
  rawActions,
  marketsInfoData,
  tokensData,
  marketsDirectionsFilter,
}: {
  chainId: number;
  rawActions: SubsquidTradeAction[] | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
}): TradeAction[] | undefined {
  if (!rawActions || !marketsInfoData || !tokensData) {
    return undefined;
  }

  const wrappedToken = getWrappedToken(chainId);
  const transformer = createRawTradeActionTransformer(marketsInfoData, wrappedToken, tokensData);

  let processed = rawActions.map(transformer).filter(Boolean) as TradeAction[];

  // Apply collateral filtering client-side
  const collateralFilterTree: {
    [direction in "long" | "short"]: {
      [marketAddress: string]: {
        [collateralAddress: string]: boolean;
      };
    };
  } = {
    long: {},
    short: {},
  };
  let hasCollateralFilter = false;

  (marketsDirectionsFilter || []).forEach((filter) => {
    if (filter.direction === "any" || filter.direction === "swap" || !filter.collateralAddress) {
      return;
    }

    if (!collateralFilterTree[filter.direction]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collateralFilterTree[filter.direction] = {} as any;
    }

    if (!collateralFilterTree[filter.direction][filter.marketAddress]) {
      collateralFilterTree[filter.direction][filter.marketAddress] = {};
    }

    hasCollateralFilter = true;
    collateralFilterTree[filter.direction][filter.marketAddress][filter.collateralAddress] = true;
  });

  if (hasCollateralFilter) {
    processed = processed.filter((tradeAction) => {
      if (isSwapOrderType(tradeAction.orderType)) {
        return true;
      }

      const positionTradeAction = tradeAction as PositionTradeAction;
      let collateralMatch = true;

      const desiredCollateralAddresses =
        collateralFilterTree[positionTradeAction.isLong ? "long" : "short"]?.[positionTradeAction.marketAddress];

      if (isLimitOrderType(tradeAction.orderType)) {
        const wrapped = getWrappedToken(chainId);

        if (!marketsInfoData) {
          collateralMatch = true;
        } else {
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData,
            initialCollateralAddress: positionTradeAction.initialCollateralTokenAddress,
            isIncrease: isIncreaseOrderType(tradeAction.orderType),
            shouldUnwrapNativeToken: positionTradeAction.shouldUnwrapNativeToken,
            swapPath: tradeAction.swapPath,
            wrappedNativeTokenAddress: wrapped.address,
          });

          collateralMatch =
            outTokenAddress !== undefined && Boolean(desiredCollateralAddresses?.[outTokenAddress as Address]);
        }
      } else if (isTriggerDecreaseOrderType(tradeAction.orderType)) {
        collateralMatch = Boolean(desiredCollateralAddresses?.[positionTradeAction.initialCollateralTokenAddress]);
      }

      return collateralMatch;
    });
  }

  return processed;
}
