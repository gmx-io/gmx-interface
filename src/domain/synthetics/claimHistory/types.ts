import { BigNumber } from "ethers";
import { MarketInfo } from "../markets";

export enum ClaimType {
  ClaimPriceImpact = "ClaimPriceImpact",
  ClaimFunding = "ClaimFunding",
}

export type ClaimMarketItem = {
  marketInfo: MarketInfo;
  longTokenAmount: BigNumber;
  shortTokenAmount: BigNumber;
};

export type ClaimCollateralAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  claimItems: ClaimMarketItem[];
  timestamp: number;
  transactionHash: string;
};
