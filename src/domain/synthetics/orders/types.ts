import { OrderType } from "config/synthetics";
import { BigNumber } from "ethers";

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
