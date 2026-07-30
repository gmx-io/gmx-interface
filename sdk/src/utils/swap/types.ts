import { ExternalSwapQuote, SwapPathStats } from "utils/trade/types";

type BaseSwapStrategy = {
  amountIn: bigint;
  amountOut: bigint;
  usdIn: bigint;
  usdOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  feesUsd: bigint;
};

export type NoSwapStrategy = BaseSwapStrategy & {
  type: "noSwap";
  externalSwapQuote: undefined;
  swapPathStats: undefined;
};

export type ExternalSwapStrategy = BaseSwapStrategy & {
  type: "externalSwap";
  externalSwapQuote: ExternalSwapQuote;
  swapPathStats: undefined;
};

export type InternalSwapStrategy = BaseSwapStrategy & {
  type: "internalSwap";
  swapPathStats: SwapPathStats;
  externalSwapQuote: undefined;
};

export type SwapStrategyForIncreaseOrders = NoSwapStrategy | ExternalSwapStrategy | InternalSwapStrategy;

export type SwapStrategyForSwapOrders = NoSwapStrategy | ExternalSwapStrategy | InternalSwapStrategy;
