export type TokenTypeForSwapRoute = 'collateralToken' | 'indexToken';

export type IncreaseStrategy =
  | 'leverageByCollateral'
  | 'leverageBySize'
  | 'independent';

import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { Address, BN } from '@coral-xyz/anchor';

export enum TradeType {
  Long = 'Long',
  Short = 'Short',
  Swap = 'Swap',
}

export enum TradeMode {
  Market = 'Market',
  Limit = 'Limit',
  Trigger = 'Trigger',
  SelectMarket = 'SelectMarket',
}

export interface TradeFlags {
  isLong: boolean;
  isShort: boolean;
  isSwap: boolean;
  isPosition: boolean;
  isIncrease: boolean;
  isTrigger: boolean;
  isMarket: boolean;
  isLimit: boolean;
}

export interface TradeOptions {
  chainId?: string;
  tradeType: TradeType;
  tradeMode: TradeMode;
  tokens: {
    indexTokenAddress?: string;
    fromTokenAddress?: string;
    swapToTokenAddress?: string;
  };
  markets: {
    [marketTokenAddress: string]: {
      longTokenAddress: string;
      shortTokenAddress: string;
    };
  };
  collateralTokenAddress?: string;
  receiveTokenAddress?: string;
  leverage?: BN;
}

export interface TradeParams {
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketTokenAddress?: string;
  collateralTokenAddress?: string;
}

export interface TradeboxAdvancedOptions {
  advancedDisplay: boolean;
  limitOrTPSL: boolean;
}

// swapStats.ts

export type SwapStats = {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  isWrap: boolean;
  isUnwrap: boolean;
  isOutLiquidity?: boolean;
  swapFeeAmount: BN;
  swapFeeUsd: BN;
  priceImpactDeltaUsd: BN;
  amountIn: BN;
  amountInAfterFees: BN;
  usdIn: BN;
  amountOut: BN;
  usdOut: BN;
};

export type SwapPathStats = {
  swapPath: string[];
  swapSteps: SwapStats[];
  targetMarketAddress?: string;
  totalSwapPriceImpactDeltaUsd: BN;
  totalSwapFeeUsd: BN;
  totalFeesDeltaUsd: BN;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdOut: BN;
  amountOut: BN;
};

// swap.ts

export type FindSwapPath = (
  usdIn: BN,
  opts: { byLiquidity?: boolean }
) => SwapPathStats | undefined;

export type SwapAmounts = {
  amountIn: BN;
  usdIn: BN;
  amountOut: BN;
  usdOut: BN;
  priceIn: BN;
  priceOut: BN;
  swapPathStats: SwapPathStats | undefined;
  minOutputAmount: BN;
};

export interface IncreaseSwapParams {
  initialCollateralToken: TokenData;
  isSwapfulfilled: boolean;
  swapPath: Address[];
  swapTokens: Address[];
  edges: MarketEdge[];
}

// swapRouting.ts

export type MarketEdge = {
  marketAddress: string;
  marketInfo: MarketInfo;
  // from token address
  from: string;
  // to token address
  to: string;
};

export type MarketsGraph = {
  abjacencyList: Record<string, MarketEdge[]>;
  edges: MarketEdge[];
};

export type SwapEstimator = (
  e: MarketEdge,
  usdIn: BN
) => {
  usdOut: BN;
};

export type SwapRoute = {
  edged: MarketEdge[];
  path: string[];
  liquidity: BN;
};

export type NextPositionValues = {
  nextLeverage?: BN;
  nextLiqPrice?: BN;
  nextCollateralUsd?: BN;
  nextSizeUsd?: BN;
  nextPnl?: BN;
  nextPnlPercentage?: number;
  nextEntryPrice?: BN;
  remainingCollateralFeesUsd?: BN;
};

export enum TriggerThresholdType {
  Above = '>',
  Below = '<',
}

export type PreferredTradeTypePickStrategy = TradeType | 'largestPosition';
