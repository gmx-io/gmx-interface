import { BN } from '@coral-xyz/anchor';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { TokenOption } from '@/selectors/token/types';

// MarketTokenStat

export type MarketTokenStat = {
  marketInfo: MarketInfo;
  longMarketOpenInterest: BN;
  shortMarketOpenInterest: BN;
  totalMarketOpenInterest: BN;
  longMarketOpenInterestPercentage: number;
  shortMarketOpenInterestPercentage: number;
  longBorrowingRatePerSecond: BN;
  shortBorrowingRatePerSecond: BN;
  longFundingRatePerSecond: BN;
  shortFundingRatePerSecond: BN;
  longNetRatePerSecond: BN;
  shortNetRatePerSecond: BN;
  longPendingPnl: BN;
  shortPendingPnl: BN;
  marketUsedLiquidity: BN;
  longMarketAvailableLiquidity: BN;
  shortMarketAvailableLiquidity: BN;
  marketMaxLiquidity: BN;
  poolValueUsd: BN;
  poolUtilization: BN;
};

export interface MarketTokensStat {
  [marketTokenAddress: string]: MarketTokenStat;
}

// IndexTokenStat

export interface IndexTokenStat {
  token: TokenData;
  price: BN;
  totalPoolValue: BN;
  totalUtilization: BN;
  totalUsedLiquidity: BN;
  totalMaxLiquidity: BN;
  bestNetFeeLong: BN;
  bestNetFeeShort: BN;
  /**
   * Sorted by poolValueUsd descending
   */
  maxLongLiquidityPool: TokenOption;
  maxShortLiquidityPool: TokenOption;
  marketTokensStat: MarketTokenStat[];
  bestNetFeeLongMarketAddress: string;
  bestNetFeeShortMarketAddress: string;

  gtEnabledForIndexToken: boolean;
}

export interface IndexTokensStat {
  [indexTokenAddress: string]: IndexTokenStat;
}

export interface IndexTokenStatForMarketSelector {
  indexToken: TokenData;
  lastPrice: BN;
  longOIValue: string;
  shortOIValue: string;
  longOpenInterest: BN;
  shortOpenInterest: BN;
  change24h: number;
  volume24h: BN;
  maxLeverage: BN;
  maxLongLiquidityPool: TokenOption;
  maxShortLiquidityPool: TokenOption;
  gtEnabledForIndexToken: boolean;
}

export interface IndexTokensStatForMarketSelector {
  [indexTokenAddress: string]: IndexTokenStatForMarketSelector;
}
