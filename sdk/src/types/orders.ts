import { Address } from "viem";
import { MarketInfo } from "./markets";
import { TokenData, TokensRatio } from "./tokens";
import { SwapPathStats, TriggerThresholdType } from "./trade";

export enum OrderType {
  // the order will be cancelled if the minOutputAmount cannot be fulfilled
  MarketSwap = 0,
  // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
  LimitSwap = 1,
  // @dev MarketIncrease: increase position at the current market price
  // the order will be cancelled if the position cannot be increased at the acceptablePrice
  MarketIncrease = 2,
  // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitIncrease = 3,
  // @dev MarketDecrease: decrease position at the curent market price
  // the order will be cancelled if the position cannot be decreased at the acceptablePrice
  MarketDecrease = 4,
  // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitDecrease = 5,
  // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  StopLossDecrease = 6,
  // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
  Liquidation = 7,
}

export enum SwapPricingType {
  TwoStep = 0,
  Shift = 1,
  Atomic = 2,
}

export enum DecreasePositionSwapType {
  NoSwap = 0,
  SwapPnlTokenToCollateralToken = 1,
  SwapCollateralTokenToPnlToken = 2,
}

export type Order = {
  key: string;
  account: string;
  callbackContract: string;
  initialCollateralTokenAddress: Address;
  marketAddress: string;
  decreasePositionSwapType: DecreasePositionSwapType;
  receiver: string;
  swapPath: string[];
  contractAcceptablePrice: bigint;
  contractTriggerPrice: bigint;
  callbackGasLimit: bigint;
  executionFee: bigint;
  initialCollateralDeltaAmount: bigint;
  minOutputAmount: bigint;
  sizeDeltaUsd: bigint;
  updatedAtBlock: bigint;
  isFrozen: boolean;
  isLong: boolean;
  orderType: OrderType;
  shouldUnwrapNativeToken: boolean;
  data: string;
  autoCancel: boolean;
};

export type SwapOrderInfo = Order & {
  title: string;
  swapPathStats?: SwapPathStats;
  triggerRatio?: TokensRatio;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
};

export type PositionOrderInfo = Order & {
  title: string;
  marketInfo: MarketInfo;
  swapPathStats?: SwapPathStats;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  triggerThresholdType: TriggerThresholdType;
};

export type OrderInfo = SwapOrderInfo | PositionOrderInfo;

export type OrdersData = {
  [orderKey: string]: Order;
};

export type OrdersInfoData = {
  [orderKey: string]: OrderInfo;
};

export type OrderTxnType = "create" | "update" | "cancel";
