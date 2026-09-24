import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

// for useGlvMarkets

export type GlvMarketData = {
  marketTokenAddress: PublicKey;
  isDisabled: boolean; // false
  minTokensForFirstDeposit: BN;
  maxMarketTokenBalanceUsd: BN;
  glvMaxMarketTokenBalanceAmount: BN;
  gmBalance: BN;
};
export type GlvInfoData = {
  glvAddress: PublicKey;
  glvTokenAddress: PublicKey;
  longTokenAddress: PublicKey;
  shortTokenAddress: PublicKey;
  shiftLastExecutedAt: BN;
  markets: GlvMarketData[];
};

// to align with GMX

export interface GlvMarket {
  marketTokenAddress: PublicKey;
  isDisabled: boolean;
  maxMarketTokenBalanceUsd: BN;
  glvMaxMarketTokenBalanceAmount: BN;
  gmBalance: BN;
}

export interface GlvMarkets {
  [marketTokenAddress: string]: GlvMarket;
}

export type GlvInfo = {
  name: string;
  glvToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  glvTokenAddress: PublicKey;
  longTokenAddress: PublicKey;
  shortTokenAddress: PublicKey;
  markets: GlvMarket[];
  isSingle: boolean;
  isSpotOnly: boolean; // false
  isDisabled: boolean; // false
  poolValueMax: BN;
  poolValueMin: BN;
  // shiftLastExecutedAt: BN;
  // shiftMinInterval: BN;
};

export interface GlvsInfo {
  [glvTokenAddress: string]: GlvInfo;
}

export type GlvInfoDataForSorted = {
  [key in string]: GlvInfo;
};

export type GlvOrMarketInfo = MarketInfo | GlvInfo;

export type GlvAndGmMarketsInfo = {
  [address: string]: MarketInfo | GlvInfo;
};
