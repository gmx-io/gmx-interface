import { BigNumber } from "ethers";

export type OneClickTradingSerializedConfig = {
  privateKey: string;
  address: string;
} | null;

export type OneClickTradingParams = {
  topUp: BigNumber | null;
  maxAutoTopUpAmount: BigNumber | null;
  wntForAutoTopUps: BigNumber | null;
  maxAllowedActions: BigNumber | null;
};
