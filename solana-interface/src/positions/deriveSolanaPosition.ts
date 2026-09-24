import { correctLiquidationPrice } from "./correctLiquidationPrice";
import type { SolanaPositionCalculation, SolanaPositionDeriveInput, SolanaPositionStatus } from "./types";
import type { GmsolSdk } from "../lib/gmsolRuntime";

const PENDING_MARKET_STATE_MESSAGES = ["calculating funding fee amount", "invalid latest borrowing factor"];

/** The SDK throws these when the market account lags behind the position account. */
export function isPendingMarketStateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return PENDING_MARKET_STATE_MESSAGES.some((fragment) => message.includes(fragment));
}

/**
 * Runs the GMTrade SDK position model for one position. Pure apart from wasm allocation, which is
 * released before returning. Never drops a position: missing inputs produce `priceUnavailable`.
 */
export function deriveSolanaPosition(sdk: GmsolSdk, input: SolanaPositionDeriveInput): SolanaPositionCalculation {
  const { raw, marketInfo, marketAccount, prices } = input;

  if (!marketInfo) return { priceUnavailable: true, unavailableReason: "no-market-info" };
  if (!marketAccount) return { priceUnavailable: true, unavailableReason: "no-market-account" };
  if (!prices.index || !prices.long || !prices.short) {
    return { priceUnavailable: true, unavailableReason: "no-price" };
  }

  const market = sdk.Market.decode_from_base64(marketAccount.base64);
  const marketModel = market.to_model(BigInt(marketInfo.supply));
  const position = sdk.Position.decode_from_base64(raw.base64);
  const positionModel = position.to_model(marketModel);
  try {
    const sdkStatus = positionModel.status({
      index_token: { min: prices.index.minUnitPrice, max: prices.index.maxUnitPrice },
      long_token: { min: prices.long.minUnitPrice, max: prices.long.maxUnitPrice },
      short_token: { min: prices.short.minUnitPrice, max: prices.short.maxUnitPrice },
    });

    const status: SolanaPositionStatus = {
      entryPrice: sdkStatus.entry_price,
      collateralValue: sdkStatus.collateral_value,
      pendingPnl: sdkStatus.pending_pnl,
      pendingBorrowingFeeValue: sdkStatus.pending_borrowing_fee_value,
      pendingFundingFeeValue: sdkStatus.pending_funding_fee_value,
      pendingClaimableFundingFeeValueInLongToken: sdkStatus.pending_claimable_funding_fee_value_in_long_token,
      pendingClaimableFundingFeeValueInShortToken: sdkStatus.pending_claimable_funding_fee_value_in_short_token,
      closeOrderFeeValue: sdkStatus.close_order_fee_value,
      netValue: sdkStatus.net_value,
      leverage: sdkStatus.leverage,
      liquidationPrice: correctLiquidationPrice({
        liquidationPrice: sdkStatus.liquidation_price,
        sizeInUsd: raw.sizeInUsd,
        sizeInTokens: raw.sizeInTokens,
        collateralAmount: raw.collateralAmount,
        isLong: raw.isLong,
        isCollateralIndexToken: raw.collateralToken === marketAccount.indexToken,
        minCollateralFactor: marketAccount.state.minCollateralFactor,
        minCollateralFactorForLiquidation: marketAccount.state.minCollateralFactorForLiquidation,
      }),
    };
    return { status, priceUnavailable: false };
  } catch (error) {
    if (isPendingMarketStateError(error)) {
      return { priceUnavailable: true, unavailableReason: "pending-market-state" };
    }
    throw error;
  } finally {
    positionModel.free();
    position.free();
    marketModel.free();
    market.free();
  }
}
