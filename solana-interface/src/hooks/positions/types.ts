import type { SolanaMarketAccount } from "../../markets/decodeSolanaMarket";
import type { SolanaMarketInfo, SolanaTicker } from "../../markets/solanaMarketSocketStore";

/** Decoded `position` account. Amounts are raw on-chain integers (USD values carry 20 decimals). */
export type RawSolanaPosition = {
  /** Account address (base58). Also the list key. */
  pubkey: string;
  /** Raw account bytes as base64, consumed by `Position.decode_from_base64` in the SDK. */
  base64: string;
  /** Slot of the RPC response / notification that produced this entry. */
  slot: number;
  owner: string;
  marketToken: string;
  collateralToken: string;
  kind: number;
  isLong: boolean;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  borrowingFactor: bigint;
  fundingFeeAmountPerSize: bigint;
  longTokenClaimableFundingAmountPerSize: bigint;
  shortTokenClaimableFundingAmountPerSize: bigint;
  increasedAt: bigint;
  decreasedAt: bigint;
  updatedAtSlot: bigint;
  tradeId: bigint;
};

export type SolanaPositionUnavailableReason =
  | "no-market-info"
  | "no-market-account"
  | "no-price"
  | "pending-market-state"
  | "calculation-error";

/** SDK `PositionStatus` in GMTrade units: USD with 20 decimals, prices per smallest index token unit. */
export type SolanaPositionStatus = {
  entryPrice: bigint;
  collateralValue: bigint;
  pendingPnl: bigint;
  pendingBorrowingFeeValue: bigint;
  pendingFundingFeeValue: bigint;
  pendingClaimableFundingFeeValueInLongToken: bigint;
  pendingClaimableFundingFeeValueInShortToken: bigint;
  closeOrderFeeValue: bigint;
  netValue: bigint;
  /** 20 decimals. */
  leverage?: bigint;
  /** After `correctLiquidationPrice`. Undefined when the SDK returns none or the corrected value is <= 0. */
  liquidationPrice?: bigint;
};

export type SolanaPositionCalculation = {
  status?: SolanaPositionStatus;
  priceUnavailable: boolean;
  unavailableReason?: SolanaPositionUnavailableReason;
};

export type SolanaPositionPrices = {
  index?: SolanaTicker;
  long?: SolanaTicker;
  short?: SolanaTicker;
};

export type SolanaPositionDeriveInput = {
  raw: RawSolanaPosition;
  marketInfo?: SolanaMarketInfo;
  marketAccount?: SolanaMarketAccount;
  prices: SolanaPositionPrices;
};

/**
 * Stable contract between the data layer and the read-only UI.
 * Unit conventions (so `lib/numbers` helpers apply unchanged):
 * - USD values and prices: 30 decimals, prices are per whole token.
 * - `leverage`: 4 decimals (`formatLeverage`).
 * - `pnlAfterFeesBps`: basis points.
 * - Token amounts: raw integers, decimals given alongside.
 */
export type SolanaPositionViewModel = {
  key: string;
  positionAddress: string;
  ownerAddress: string;
  marketTokenAddress: string;
  collateralTokenAddress: string;
  symbol: string;
  displayMarketName: string;
  /** GMTrade pool label: "LONG-SHORT", or the single symbol when both sides use the same token. */
  poolName?: string;
  isLong: boolean;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  indexTokenDecimals?: number;
  collateralAmount: bigint;
  collateralSymbol: string;
  collateralDecimals?: number;
  collateralValue?: bigint;
  /** Initial collateral minus accrued borrowing and negative funding fees (GMTrade "margin"). */
  netCollateralValue?: bigint;
  /** `netCollateralValue` in collateral token units (raw integer). Needs the collateral token price. */
  netCollateralAmount?: bigint;
  entryPrice?: bigint;
  markPrice?: bigint;
  liquidationPrice?: bigint;
  pendingPnl?: bigint;
  /** `pendingPnl` over the initial collateral, basis points (0 when the collateral value is 0). */
  pendingPnlBps?: bigint;
  pnlAfterFees?: bigint;
  pnlAfterFeesBps?: bigint;
  netValue?: bigint;
  leverage?: bigint;
  pendingBorrowingFee?: bigint;
  pendingFundingFee?: bigint;
  /** Claimable positive funding fee (long + short token), USD. */
  pendingClaimableFundingFee?: bigint;
  closeOrderFee?: bigint;
  /** Estimated fees over the next 24h at current market rates, signed (negative = the position pays). */
  borrowingFeePerDay?: bigint;
  fundingFeePerDay?: bigint;
  /**
   * Hours until fees alone would push the net value below the maintenance margin
   * (GMTrade estimate). `NO_LIQUIDATION_BY_FEES_HOURS` when fees do not reduce the collateral.
   */
  estimatedLiquidationHours?: bigint;
  /** Why the SDK reports no liquidation price, when the collateral fully covers the position. */
  noLiquidationPriceReason?: "short-collateral-covers-size" | "long-stable-collateral-covers-size";
  increasedAt: bigint;
  updatedAtSlot: bigint;
  priceUnavailable: boolean;
  unavailableReason?: SolanaPositionUnavailableReason;
};
