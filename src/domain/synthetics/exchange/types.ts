import { BigNumber } from "ethers";
import { FeeItem, SwapPathStats } from "../fees";
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
  largestAddress: string;
  smallestAddress: string;
};

export type SwapTradeParams = {
  fromAmount: BigNumber;
  fromUsd: BigNumber;
  toAmount: BigNumber;
  toUsd: BigNumber;
  swapPath?: string[];
  swapFees?: SwapPathStats;
};

export type IncreaseTradeParams = {
  market: Market;
  swapPath: string[];
  swapFees?: SwapPathStats;
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

export type DecreaseTradeParams = {
  market: Market;
  positionFee?: FeeItem;
  priceImpact?: FeeItem;
  sizeDeltaUsd: BigNumber;
  collateraDeltaUsd: BigNumber;
  initialCollateralAmount: BigNumber;
  receiveUsd: BigNumber;
  isClosing: boolean;
};
