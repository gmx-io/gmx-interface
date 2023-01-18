import { BigNumber } from "ethers";
import { Market } from "domain/synthetics/markets";
import { TokenData } from "../tokens";

export enum OrderType {
  // the order will be cancelled if the minOutputAmount cannot be fulfilled
  MarketSwap,
  // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
  LimitSwap,
  // @dev MarketIncrease: increase position at the current market price
  // the order will be cancelled if the position cannot be increased at the acceptablePrice
  MarketIncrease,
  // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitIncrease,
  // @dev MarketDecrease: decrease position at the curent market price
  // the order will be cancelled if the position cannot be decreased at the acceptablePrice
  MarketDecrease,
  // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitDecrease,
  // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  StopLossDecrease,
  // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
  Liquidation,
}

export const orderTypeLabels = {
  [OrderType.MarketSwap]: "Market Swap",
  [OrderType.LimitSwap]: "Limit Swap",
  [OrderType.MarketIncrease]: "Market Increase",
  [OrderType.LimitIncrease]: "Limit Increase",
  [OrderType.MarketDecrease]: "Market Decrease",
  [OrderType.LimitDecrease]: "Limit Decrease",
  [OrderType.StopLossDecrease]: "Stop Loss Decrease",
};

export type RawContractOrder = {
  addresses: {
    account: string;
    receiver: string;
    callbackContract: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: BigNumber;
    initialCollateralDeltaAmount: BigNumber;
    triggerPrice: BigNumber;
    acceptablePrice: BigNumber;
    executionFee: BigNumber;
    callbackGasLimit: BigNumber;
    minOutputAmount: BigNumber;
    updatedAtBlock: BigNumber;
  };
  flags: {
    orderType: OrderType;
    isLong: boolean;
    shouldUnwrapNativeToken: boolean;
    isFrozen: boolean;
  };
  data: string;
};

export type Order = {
  key: string;
  account: string;
  callbackContract: string;
  initialCollateralTokenAddress: string;
  marketAddress: string;
  receiver: string;
  swapPath: string[];
  contractAcceptablePrice: BigNumber;
  contractTriggerPrice: BigNumber;
  callbackGasLimit: BigNumber;
  executionFee: BigNumber;
  initialCollateralDeltaAmount: BigNumber;
  minOutputAmount: BigNumber;
  sizeDeltaUsd: BigNumber;
  updatedAtBlock: BigNumber;
  isFrozen: boolean;
  isLong: boolean;
  orderType: OrderType;
  shouldUnwrapNativeToken: boolean;
  data: string;
};

export type AggregatedOrderData = Order & {
  title?: string;
  triggerPrice?: BigNumber;
  acceptablePrice?: BigNumber;
  market?: Market;
  marketName?: string;
  indexToken?: TokenData;
  initialCollateralToken?: TokenData;
  toCollateralToken?: TokenData;
};

export type OrdersData = {
  [orderKey: string]: Order;
};

export type AggregatedOrdersData = {
  [orderKey: string]: AggregatedOrderData;
};
