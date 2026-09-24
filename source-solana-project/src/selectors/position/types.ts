import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { MarketInfo } from '../market/types';
import { TokenData } from '../token/types';

export interface PositionMarketInfo {
  indexToken: string;
  marketToken: string;
  longToken: string;
  shortToken: string;
  unitPrice: string;
  volume24h: string;
  longOpenInterest: string;
  shortOpenInterest: string;
  lpLong: string;
  lpShort: string;
  maxLeverage: string;
  longFundingFeeRateHour: string;
  longBorrowingFeeRateHour: string;
  longNetRatePerHour: string;
  shortFundingFeeRateHour: string;
  shortBorrowingFeeRateHour: string;
  shortNetRatePerHour: string;
  reservedValueForLong: string;
  maxReserveValueForLong: string;
  openInterestForLong: string;
  maxOpenInterestForLong: string;
  reservedValueForShort: string;
  maxReserveValueForShort: string;
  openInterestForShort: string;
  maxOpenInterestForShort: string;
  prices: string[];
  supply: string;
  marketDecimals: string;
  minCollateralFactorForLong: string;
  minCollateralFactorForShort: string;
  minCollateralValue: string;
  longToShortAvailableLiquidity: string;
  shortToLongAvailableLiquidity: string;
  marketPrice: string;
  longTokenAmount: string;
  shortTokenAmount: string;
  poolValueLong: string;
  poolValueShort: string;
  longDepositCapacityAmount: string;
  shortDepositCapacityAmount: string;
  maxLongSellableUsd: string;
  maxShortSellableUsd: string;
  viForSwaps: string;
  viForPositions: string;
  mlForLong: string;
  mlForShort: string;
  oFFForPositive: string;
  oFFForNegative: string;
  mCMCFForLiquidation: string;
  closed: boolean;
  tvl: string;
  newPrices: {
    indexToken: PositionTokenPrice;
    longToken: PositionTokenPrice;
    shortToken: PositionTokenPrice;
  };
}

interface PositionTokenPrice {
  min: string;
  max: string;
}

export interface Position {
  address: PublicKey;
  owner: PublicKey;
  marketTokenAddress: PublicKey;
  collateralTokenAddress: PublicKey;
  isLong: boolean;
  sizeInUsd: BN;
  sizeInTokens: BN;
  collateralAmount: BN;
  isOpening?: boolean;
  borrowingFactor: BN;
  fundingFeeAmountPerSize: BN;
  longTokenClaimableFundingAmountPerSize: BN;
  shortTokenClaimableFundingAmountPerSize: BN;
  increasedAt?: BN;
  decreasedAt?: BN;
  updatedAtSlot?: BN;
  tradeId?: BN;

  // Values derived locally from the position model, current market and prices.
  // They are temporarily absent while a newer position waits for market state.
  entry_price?: string;
  collateral_value?: string;
  pending_pnl?: string;
  pending_borrowing_fee_value?: string;
  pending_funding_fee_value?: string;
  pending_claimable_funding_fee_value_in_long_token?: string;
  pending_claimable_funding_fee_value_in_short_token?: string;
  close_order_fee_value?: string;
  net_value?: string;
  leverage?: string;
  liquidation_price?: string;
  priceUnavailable?: boolean;
  symbol?: string;
  decimals?: number;
  decimals_gmx?: number;
  unitPrice?: string;
  marketInfo?: PositionMarketInfo;
  shouldDisablePosition?: boolean;
}

export type PositionInfo = Omit<Position, 'leverage' | 'marketInfo'> & {
  marketInfo: MarketInfo;
  indexToken: TokenData;
  pnlToken: TokenData;
  collateralToken: TokenData;
  collateralUsd: BN;
  remainingCollateralUsd?: BN;
  remainingCollateralAmount?: BN;
  hasLowCollateral?: boolean;
  markPrice?: BN;
  entryPrice?: BN;
  liquidationPrice?: BN;
  netValue?: BN;
  leverage?: BN;
  leverageWithPnl?: BN;
  pnl?: BN;
  pnlPercentage?: number;
  pnlAfterFees?: BN;
  pnlAfterFeesPercentage?: number;
  closingFeeUsd: BN;
  pendingFundingFeesUsd: BN;
  pendingBorrowingFeesUsd: BN;
  pendingClaimableFundingFeesUsd: BN;
  isMocked?: boolean;
  is_long?: boolean;
};

export interface Positions {
  [address: string]: Position;
}

export interface PositionsInfo {
  [address: string]: PositionInfo;
}
