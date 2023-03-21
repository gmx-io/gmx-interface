import { BigNumber } from "ethers";
import { OrderType } from "domain/synthetics/orders";
import { Market } from "domain/synthetics/markets";
import { TokenData } from "../tokens";

export enum TradeActionType {
  OrderCreated = "OrderCreated",
  OrderExecuted = "OrderExecuted",
  OrderCancelled = "OrderCancelled",
  OrderUpdated = "OrderUpdated",
  OrderFrozen = "OrderFrozen",
}

export type RawTradeAction = {
  id: string;
  eventName: TradeActionType;

  account: string;
  marketAddress?: string;
  swapPath?: string[];
  initialCollateralTokenAddress?: string;

  initialCollateralDeltaAmount?: string;
  sizeDeltaUsd?: string;
  triggerPrice?: string;
  acceptablePrice?: string;
  executionPrice?: string;
  minOutputAmount?: string;
  executionAmountOut?: string;

  priceImpactDiffUsd?: string;
  positionFeeAmount?: string;
  borrowingFeeAmount?: string;
  fundingFeeAmount?: string;
  pnlUsd?: string;

  collateralTokenPriceMax?: string;
  collateralTokenPriceMin?: string;

  orderType?: OrderType;
  isLong?: boolean;
  shouldUnwrapNativeToken?: boolean;

  reason?: string;

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type TradeAction = {
  market?: Market;
  initialCollateralToken?: TokenData;
  targetCollateralToken?: TokenData;
  indexToken?: TokenData;

  id: string;
  eventName: TradeActionType;

  account: string;
  marketAddress?: string;
  swapPath?: string[];
  initialCollateralTokenAddress?: string;

  initialCollateralDeltaAmount?: BigNumber;
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  acceptablePrice?: BigNumber;
  executionPrice?: BigNumber;
  minOutputAmount?: BigNumber;
  executionAmountOut?: BigNumber;

  priceImpactDiffUsd?: BigNumber;
  positionFeeAmount?: BigNumber;
  borrowingFeeAmount?: BigNumber;
  fundingFeeAmount?: BigNumber;
  pnlUsd?: BigNumber;

  collateralTokenPriceMin?: BigNumber;
  collateralTokenPriceMax?: BigNumber;

  orderType?: OrderType;
  isLong?: boolean;
  shouldUnwrapNativeToken?: boolean;

  reason?: string;

  transaction: {
    timestamp: number;
    hash: string;
  };
};
