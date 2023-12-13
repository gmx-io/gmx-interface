import { BigNumber } from "ethers";

export type OneClickTradingSerializedConfig = {
  privateKey: string;
  address: string;
} | null;

export type OneClickTradingParams = {
  initialTopUp: BigNumber;
  maxAutoTopUpAmount: BigNumber;
  wethForAutoTopUps: BigNumber;
  maxAllowedActions: BigNumber;
};
