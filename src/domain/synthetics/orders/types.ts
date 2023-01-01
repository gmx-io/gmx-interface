import { BigNumber } from "ethers";

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

export type ContractOrder = {
  addresses: {
    account: string;
    callbackContract: string;
    initialCollateralToken: string;
    market: string;
    receiver: string;
    swapPath: string[];
  };
  numbers: {
    acceptablePrice: BigNumber;
    callbackGasLimit: BigNumber;
    executionFee: BigNumber;
    initialCollateralDeltaAmount: BigNumber;
    minOutputAmount: BigNumber;
    sizeDeltaUsd: BigNumber;
    triggerPrice: BigNumber;
    updatedAtBlock: BigNumber;
  };
  flags: {
    isFrozen: boolean;
    isLong: boolean;
    orderType: OrderType;
    shouldUnwrapNativeToken: boolean;
  };
};

export type Order = {
  key: string;
  account: string;
  receiver: string;
  callbackContract: string;
  market: string;
  initialCollateralToken: string;
  swapPath: string[];
  sizeDeltaUsd: BigNumber;
  initialCollateralDeltaAmount: BigNumber;
  triggerPrice: BigNumber;
  acceptablePrice: BigNumber;
  executionFee: BigNumber;
  callbackGasLimit: BigNumber;
  minOutputAmount: BigNumber;
  updatedAtBlock: BigNumber;
  typeLabel: string;
  type: OrderType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  isFrozen: boolean;
  data: string;
};

export type OrdersData = {
  [orderKey: string]: Order;
};
