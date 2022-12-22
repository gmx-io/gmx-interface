import { OrderType } from "config/synthetics";
import { BigNumber } from "ethers";

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
