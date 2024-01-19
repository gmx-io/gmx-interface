import { BigNumber } from "ethers";

export type SubaccountSerializedConfig = {
  privateKey: string;
  address: string;
} | null;

export type SubaccountParams = {
  topUp: BigNumber | null;
  maxAutoTopUpAmount: BigNumber | null;
  wntForAutoTopUps: BigNumber | null;
  maxAllowedActions: BigNumber | null;
};
