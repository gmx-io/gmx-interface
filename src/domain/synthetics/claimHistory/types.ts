import { BigNumber } from "ethers";
import { MarketInfo } from "../markets";

export enum ClaimType {
  ClaimPriceImpact = "ClaimPriceImpact",
  ClaimFunding = "ClaimFunding",
}

export type RawClaimCollateralAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  amounts: string[];

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export type ClaimItem = {
  market: MarketInfo;
  longTokenAmount: BigNumber;
  shortTokenAmount: BigNumber;
};

export type ClaimCollateralAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  claimItems: ClaimItem[];
  timestamp: number;
  transactionHash: string;
};
