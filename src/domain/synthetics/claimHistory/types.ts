import { BigNumber } from "ethers";
import { MarketInfo } from "../markets";
import { Token } from "domain/tokens/types";

export enum ClaimType {
  ClaimPriceImpact = "ClaimPriceImpact",
  ClaimFunding = "ClaimFunding",
  SettleFundingFeeCreated = "SettleFundingFeeCreated",
  SettleFundingFeeExecuted = "SettleFundingFeeExecuted",
  SettleFundingFeeCancelled = "SettleFundingFeeCancelled",
}

export type ClaimMarketItem = {
  marketInfo: MarketInfo;
  longTokenAmount: BigNumber;
  longTokenAmountUsd: BigNumber;
  shortTokenAmount: BigNumber;
  shortTokenAmountUsd: BigNumber;
};

export type ClaimCollateralAction = {
  id: string;
  type: "collateral";
  eventName: ClaimType.ClaimFunding | ClaimType.ClaimPriceImpact;
  account: string;
  amounts: BigNumber[];
  tokenPrices: BigNumber[];
  claimItems: ClaimMarketItem[];
  timestamp: number;
  transactionHash: string;
  tokens: Token[];
};

export type ClaimFundingFeeAction = {
  id: string;
  type: "fundingFee";
  eventName:
    | ClaimType.SettleFundingFeeCancelled
    | ClaimType.SettleFundingFeeCreated
    | ClaimType.SettleFundingFeeExecuted;
  account: string;
  amounts: BigNumber[];
  tokenPrices: BigNumber[];
  markets: MarketInfo[];
  tokens: Token[];
  isLongOrders: boolean[];
  timestamp: number;
  transactionHash: string;
  claimItems: ClaimMarketItem[];
};

export type ClaimAction = ClaimCollateralAction | ClaimFundingFeeAction;
