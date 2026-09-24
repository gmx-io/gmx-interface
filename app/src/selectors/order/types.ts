import { MarketInfo } from '@/selectors/market/types';
import { SwapPathStats, TriggerThresholdType } from '@/selectors/trade/types';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { ReactNode } from 'react';
import { TokensRatio } from '../token/types';
import { TokenData } from '../token/types';

// Flat market summary injected at fetch time. indexToken/marketToken are string
// addresses, not the full TokenData objects on PositionOrderInfo.marketInfo.
export type OrderMarketSummary = {
  indexToken?: string;
  marketToken?: string;
  unitPrice?: string;
};

// Fields injected by useOrders.ts at fetch time, not present in on-chain account.
// Both marketInfo and marketSummary carry the same flat OrderMarketSummary shape.
// marketInfo exists for consumer backward-compat; marketSummary is the canonical name.
// Neither must be confused with PositionOrderInfo.marketInfo (MarketInfo type).
export type OrderRuntimeFields = {
  kind: BN;
  inSymbol: string;
  outSymbol: string;
  time: BN;
  marketSummary?: OrderMarketSummary;
  marketInfo?: OrderMarketSummary;
  positionAddress?: PublicKey | null;
};

export enum OrderOption {
  Market = 'Market',
  Trigger = 'Trigger',
}

export enum OrderType {
  // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
  Liquidation = 0,
  // @dev AutoDeleveraging: allows auto-deleveraging of positions
  AutoDeleveraging = 1,
  // @dev MarketSwap: swap token A to token B at the current market price
  // the order will be cancelled if the minOutputAmount cannot be fulfilled
  MarketSwap = 2,
  // @dev MarketIncrease: increase position at the current market price
  // the order will be cancelled if the position cannot be increased at the acceptablePrice
  MarketIncrease = 3,
  // @dev MarketDecrease: decrease position at the current market price
  // the order will be cancelled if the position cannot be decreased at the acceptablePrice
  MarketDecrease = 4,
  // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
  LimitSwap = 5,
  // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitIncrease = 6,
  // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitDecrease = 7,
  // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  StopLossDecrease = 8,
}

export type OrderKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// On-chain account fields only, without runtime-injected display data
export type BaseOrder = {
  owner: PublicKey;
  orderAddress: PublicKey;
  orderRelatedPositionAddress: PublicKey | null | undefined;

  marketTokenAddress: PublicKey;
  initialCollateralTokenAddress: PublicKey;
  collateralTokenAddress: PublicKey;
  longTokenAddress: PublicKey;
  shortTokenAddress: PublicKey;
  finalOutputTokenAddress: PublicKey | null;

  isLong: boolean;
  orderType: OrderType;
  acceptablePrice: BN | null;
  sizeDeltaUsd: BN;
  initialCollateralDeltaAmount: BN;
  triggerPrice: BN;
  minOutputAmount: BN;

  primarySwapPath: string[] | undefined;
};

export type Order = BaseOrder & OrderRuntimeFields;

export type OrderError = {
  msg: ReactNode;
  key: string;
  level: 'error' | 'warning';
};

export type OrderErrors = {
  errors: OrderError[];
  level: 'error' | 'warning' | undefined;
};

export type SwapOrderInfo = Order & {
  swapPathStats?: SwapPathStats;
  triggerRatio?: TokensRatio;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
};

export type PositionOrderInfo = Order & {
  marketInfo: MarketInfo;
  swapPathStats?: SwapPathStats;
  indexToken: TokenData;
  initialCollateralToken: TokenData;
  targetCollateralToken: TokenData;
  acceptablePrice: BN | null;
  triggerPrice: BN;
  triggerThresholdType?: TriggerThresholdType;
};

export type OrderInfo = SwapOrderInfo | PositionOrderInfo;

export type Orders = {
  [address: string]: Order;
};

export type OrdersInfo = {
  [address: string]: OrderInfo;
};

export type OrderTxnType = 'create' | 'update' | 'cancel';
