import { MarketInfo } from '@/selectors/market/types';
import { IndexTokenStat, MarketTokenStat } from '@/selectors/stats/types';
import { TokenData } from '@/selectors/token/types';
import { BN } from '@coral-xyz/anchor';

export interface AvailableMarketsOptions {
  allMarkets?: MarketInfo[];
  availableMarkets?: MarketInfo[];
  availableIndexTokenStat?: IndexTokenStat;
  availableMarketsOpenFees?: { [marketTokenAddress: string]: number };
  marketWithPosition?: MarketInfo;
  collateralWithPosition?: TokenData;
  marketWithOrder?: MarketInfo;
  collateralWithOrder?: TokenData;
  collateralWithOrderShouldUnwrapNativeToken?: boolean;
  maxLiquidityMarket?: MarketInfo;
  minPriceImpactMarket?: MarketInfo;
  minPriceImpactBps?: number;
  minPriceImpactPositionFeeBps?: number;
  minOpenFeesAvailableMarketAddress?: string;
  minOpenFeesBps?: number;
  isNoSufficientLiquidityInAnyMarket?: boolean;
  isNoSufficientLiquidityInMarketWithPosition?: boolean;
}

export interface MarketLiquidityAndFeeStat {
  isEnoughLiquidity: boolean;
  liquidity: BN;
  openFees?: BN;
}

export interface RelatedMarketsStats {
  relatedMarketsPositionStats: {
    [marketTokenAddress: string]: MarketLiquidityAndFeeStat;
  };
  relatedMarketStats: MarketTokenStat[];
}
