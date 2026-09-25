import type { MessageDescriptor } from "@lingui/core";

/** Decoded `order` account. Amounts are raw on-chain integers (USD values and unit prices carry 20 decimals). */
export type RawSolanaOrder = {
  /** Account address (base58). Also the list key. */
  pubkey: string;
  /** Slot of the RPC response / notification that produced this entry. */
  slot: number;
  owner: string;
  store: string;
  marketToken: string;
  /** 0 = Pending, 1 = Completed, 2 = Cancelled. Not used for filtering (GMTrade parity). */
  actionState: number;
  kind: number;
  isLong: boolean;
  /** Undefined when the on-chain value is the default pubkey. */
  positionAddress?: string;
  initialCollateralToken: string;
  collateralToken: string;
  longToken: string;
  shortToken: string;
  /** Undefined when the on-chain value is the default pubkey. */
  finalOutputToken?: string;
  /** USD, 20 decimals. */
  sizeDeltaUsd: bigint;
  /** Raw units of `initialCollateralToken`. */
  initialCollateralDeltaAmount: bigint;
  /** Unit price (per smallest index token unit), 20 decimals. */
  triggerPrice: bigint;
  /** Unit price (per smallest index token unit), 20 decimals. */
  acceptablePrice: bigint;
  /** Raw units of `finalOutputToken` for swap orders; a USD value for decrease orders. */
  minOutputAmount: bigint;
  primarySwapPath: string[];
  /** Unix seconds. */
  updatedAt: bigint;
  updatedAtSlot: bigint;
};

export type SolanaOrderCategory = "position" | "swap" | "collateral";

export type SolanaTriggerThreshold = "<" | ">";
export type SolanaAcceptableComparator = "≤" | "≥";

export type SolanaOrderErrorLevel = "error" | "warning";

/** Read-only validation hint shown as a tooltip on the order type (GMTrade `getOrderErrors` subset). */
export type SolanaOrderError = {
  key: "triggerPrice" | "collateralToken";
  level: SolanaOrderErrorLevel;
  message: MessageDescriptor;
};

type SolanaOrderViewModelBase = {
  /** Order account address (base58). */
  key: string;
  orderAddress: string;
  ownerAddress: string;
  marketTokenAddress: string;
  positionAddress?: string;
  kind: number;
  typeLabel: MessageDescriptor;
  updatedAt: bigint;
  /** Errors first, then warnings. Empty until `useSolanaOrders` joins the wallet positions. */
  errors: SolanaOrderError[];
};

/**
 * Increase / decrease position orders (limit, take-profit, stop-loss and non-zero market orders).
 * Unit conventions match `SolanaPositionViewModel`: USD values and prices carry 30 decimals, prices are per whole token.
 */
export type SolanaPositionOrderViewModel = SolanaOrderViewModelBase & {
  category: "position";
  isLong: boolean;
  symbol: string;
  displayMarketName: string;
  indexTokenAddress?: string;
  isForexPrecision: boolean;
  /** Signed: positive for increase orders, negative for decrease orders. */
  sizeDeltaUsd: bigint;
  isIncrease: boolean;
  /** MarketIncrease / MarketDecrease with a non-zero size. */
  isMarketOrder: boolean;
  triggerThreshold?: SolanaTriggerThreshold;
  triggerPrice?: bigint;
  acceptablePrice?: bigint;
  acceptableComparator?: SolanaAcceptableComparator;
  /** Stop-loss orders have no acceptable price limit. */
  noAcceptableLimit: boolean;
  markPrice?: bigint;
  collateralDeltaAmount: bigint;
  /** Initial (pay) collateral token. */
  collateralSymbol: string;
  collateralDecimals?: number;
  /** Position collateral token the order targets (`params.collateral_token`). */
  targetCollateralTokenAddress: string;
  targetCollateralSymbol: string;
};

/** MarketIncrease / MarketDecrease with `sizeDeltaUsd === 0`: deposit / withdraw collateral. */
export type SolanaCollateralOrderViewModel = SolanaOrderViewModelBase & {
  category: "collateral";
  isDeposit: boolean;
  isLong: boolean;
  symbol: string;
  displayMarketName: string;
  collateralDeltaAmount: bigint;
  collateralSymbol: string;
  collateralDecimals?: number;
  targetCollateralTokenAddress: string;
  targetCollateralSymbol: string;
};

export type SolanaSwapOrderViewModel = SolanaOrderViewModelBase & {
  category: "swap";
  fromTokenAddress: string;
  toTokenAddress?: string;
  fromSymbol?: string;
  toSymbol?: string;
  fromAmount: bigint;
  fromDecimals?: number;
  toMinAmount: bigint;
  toDecimals?: number;
  /** "A / B": the token with the larger human-readable amount comes first (GMTrade rule). */
  ratioLabel?: string;
  /** Trigger exchange rate, already formatted (3 decimals). */
  triggerRatioText?: string;
  /** Current exchange rate from tickers, already formatted (3 decimals). Undefined without prices. */
  markRatioText?: string;
};

export type SolanaOrderViewModel =
  | SolanaPositionOrderViewModel
  | SolanaCollateralOrderViewModel
  | SolanaSwapOrderViewModel;
