import { BigNumber } from "ethers";
import { FeeItem, TotalSwapFees } from "../fees";
import { Market } from "domain/synthetics/markets";

export enum TradeType {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum TradeMode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

export type TokensRatio = {
  ratio: BigNumber;
  primaryAddress: string;
  secondaryAddress: string;
};

export type SwapTradeParams = {
  fromAmount: BigNumber;
  fromUsd: BigNumber;
  toAmount: BigNumber;
  toUsd: BigNumber;
  swapPath: string[];
  swapFees?: TotalSwapFees;
};

export type IncreaseTradeParams = {
  market: Market;
  swapPath: string[];
  swapFees?: TotalSwapFees;
  positionFee?: FeeItem;
  priceImpact?: FeeItem;
  sizeDeltaInTokens: BigNumber;
  sizeDeltaUsd: BigNumber;
  sizeDeltaAfterFeesInTokens: BigNumber;
  sizeDeltaAfterFeesUsd: BigNumber;
  collateralAmount: BigNumber;
  collateralUsd: BigNumber;
  initialCollateralAmount: BigNumber;
};
