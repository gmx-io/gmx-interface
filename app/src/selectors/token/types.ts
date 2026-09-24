import { MarketInfo } from '@/selectors/market/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export type TokenCategory = 'meme' | 'layer1' | 'layer2' | 'defi';
export type TokenType = 'crypto' | 'stock' | 'forex' | 'commodity' | 'spot';

export interface Token {
  symbol: string;
  address: PublicKey;
  decimals: number;
  decimals_gmx?: number;
  priceDecimals?: number;
  feedAddress?: string;
  isStable?: boolean;
  isNative?: boolean;
  wrappedAddress?: PublicKey;
  isWrapped?: boolean;
  unwrappedAddress?: PublicKey;
  isWrappedNative?: boolean;
  isSynthetic?: boolean;
  shouldWrap?: boolean;
  isSpl2022Mint?: boolean;
  marketPrice?: string;
  type?: TokenType;
}

export interface TokenMetadata {
  decimals: number;
  totalSupply?: BN;
  maxMintable?: BN;
}

export interface TokenPrices {
  minPrice: BN;
  maxPrice: BN;
  change24h?: number;
}

export type TokenData = Token &
  TokenMetadata & {
    prices: TokenPrices;
    balance?: BN | null;
  };

export type TokenInfo = Token & {
  maxPrice?: BN;
  minPrice?: BN;
};

export interface TokensData {
  [address: string]: TokenData;
}

export type TokenOption = {
  maxLongLiquidity: BN;
  maxShortLiquidity: BN;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

export type TokensRatio = {
  ratio: BN;
  largestToken: Token;
  smallestToken: Token;
};

export interface TokenBalances {
  [address: string]: BN | null;
}

export interface TokenMetadatas {
  [address: string]: TokenMetadata;
}

export interface AvailableTokenOptions {
  tokens: TokensData;
  swapTokens: TokenData[];
  indexTokens: TokenData[];
  infoTokens: TokensData;
  sortedIndexTokensWithPoolValue: string[];
  sortedLongAndShortTokens: string[];
  sortedAllMarkets: MarketInfo[];
}
