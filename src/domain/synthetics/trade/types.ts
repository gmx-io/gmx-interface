import { BigNumber } from "ethers";

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

export type SwapAmounts = {
  amountIn: BigNumber;
  usdIn: BigNumber;
  amountOut: BigNumber;
  usdOut: BigNumber;
  swapPathStats?: SwapPathStats;
};

export type PositionAmounts = {
  initialCollateralAmount: BigNumber;
  initialCollateralUsd: BigNumber;
  collateralAmount: BigNumber;
  collateralUsd: BigNumber;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  sizeDeltaAfterFeesUsd: BigNumber;
  sizeDeltaAfterFeesInTokens: BigNumber;
  swapPathStats?: SwapPathStats;
  positionFeeUsd?: BigNumber;
  positionPriceImpactDeltaUsd?: BigNumber;
};

export type SwapStats = {
  marketAddress: string;
  // isWrap?: boolean;
  // isUnwrap?: boolean;
  tokenInAddress: string;
  tokenOutAddress: string;
  swapFeeAmount: BigNumber;
  swapFeeUsd: BigNumber;
  priceImpactDeltaUsd: BigNumber;
  totalFeeDeltaUsd: BigNumber;
  amountIn: BigNumber;
  amountInAfterFees: BigNumber;
  amountOut: BigNumber;
  usdOut: BigNumber;
};

export type SwapPathStats = {
  swapPath: string[];
  swapSteps: SwapStats[];
  // isWrap?: boolean;
  // isUnwrap?: boolean;
  targetMarketAddress?: string;
  totalSwapPriceImpactDeltaUsd: BigNumber;
  totalSwapFeeUsd: BigNumber;
  totalFeesDeltaUsd: BigNumber;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdOut: BigNumber;
  amountOut: BigNumber;
};

export type MarketEdge = {
  marketAddress: string;
  // from token
  from: string;
  // to token
  to: string;
};

export type MarketsGraph = {
  abjacencyList: { [token: string]: MarketEdge[] };
  edges: MarketEdge[];
};

export type SwapEstimator = (
  e: MarketEdge,
  usdIn: BigNumber
) => {
  usdOut: BigNumber;
};

// export type IncreaseTradeParams = {
//   market: Market;
//   swapPath: string[];
//   swapFees?: SwapPathStats;
//   positionFee?: FeeItem;
//   priceImpact?: FeeItem;
//   sizeDeltaInTokens: BigNumber;
//   sizeDeltaUsd: BigNumber;
//   sizeDeltaAfterFeesInTokens: BigNumber;
//   sizeDeltaAfterFeesUsd: BigNumber;
//   collateralAmount: BigNumber;
//   collateralUsd: BigNumber;
//   initialCollateralAmount: BigNumber;
// };

// export type DecreaseTradeParams = {
//   market: Market;
//   positionFee?: FeeItem;
//   priceImpact?: FeeItem;
//   sizeDeltaUsd: BigNumber;
//   collateraDeltaUsd: BigNumber;
//   initialCollateralAmount: BigNumber;
//   receiveUsd: BigNumber;
//   isClosing: boolean;
// };
