The shared trade and position helpers opt into gmsol math through data. They do not read a chain id or load Solana packages.

API contract

`/v1/markets/config` must serve these optional `MarketConfig` / `MarketInfo` fields for Solana markets:

| Field                | Meaning                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tradeMath: "gmsol"` | Enables immediate increase impact, pool-capped execution prices, net-side PnL caps, combined discounts, zero UI fees and funding settlement on the next order. Omit for EVM. |
| `minCollateralUsd`   | Market minimum collateral, in USD × 10^30. Overrides the global argument, including the liquidation floor. Zero is a valid value.                                            |
| `minPositionSizeUsd` | Market minimum position size, in USD × 10^30. Overrides the global decrease limit.                                                                                           |

All existing USD values and factors remain × 10^30; token amounts retain the mint's decimals. The position impact pool contains index tokens. There is no lent impact pool or pending position impact. Impact on increase changes the entry size in tokens; collateral is charged only for the order's fees. Open-interest imbalance is measured in USD.

The API must resolve `minCollateralFactorForLiquidation` before serving it: use the active closed-session parameter when appropriate, falling back to the active `minCollateralFactor` when the liquidation factor is zero. When collateral tracks the index token, gmsol liquidation prices account for pending funding in token units, since its USD value changes with the price being solved for. `getPositionInfo` supplies the exact `fundingFeeAmount`; direct callers of `getLiquidationPrice` can supply it too, otherwise it is derived from `pendingFundingFeesUsd` at the collateral minimum price. The SDK does not call WASM.

`/v1/fee-discount` provides the wallet's combined GT-rank and referral discount as a × 10^30 factor. Pass it as `feeDiscountFactor` to position, increase, decrease, margin, withdrawal and TWAP helpers (the final optional argument of `getPositionFee`). Zero or omission means no discount. For gmsol this replaces EVM referral/pro discounts; it does not add to them. UI fees are zero.

`PositionInfo.fundingSettlement` is `"nextOrder"` for gmsol. Existing claimable funding fields remain receivables, separate from collateral and liquidation margin. Increase/decrease previews return `fundingPayout` in long/short token units; these are paid to the owner on the next order, with no claim transaction.

`getIncreasePositionAmounts().sizeDeltaInTokens` is the executed size including impact. `getIncreaseResultingPositionState` computes that size from the USD delta and evaluation prices itself, so callers can pass the preview without applying impact twice.

`getGmsolExecutionFee` returns the maximum keeper cost (at least 300,000 lamports), refundable order/escrow rent and their total SOL requirement separately. Rent inputs come from account sizes and the current rent configuration. `getGmsolExecutionFeeRefund` accounts for unused execution lamports; an execution which cancels an order can still charge the keeper fee. Owner cancellation before execution refunds the entire deposit. Network transaction fees are separate.

This change supplies math only. API activation/SDK pinning and app integration belong to the downstream tickets.

Gmsol price impact uses native 20-decimal arithmetic and sequential rounding for integer exponents up to 128. Fractional powers truncate the base and exponent to native 9-decimal inputs and reproduce the `rust_decimal` 1.37.2 logarithm/exponential algorithm, 96-bit arithmetic and final half-up rounding. This includes the native approximation and overflow behavior; it is not an arbitrary-precision mathematical power. A fractional exponent that truncates to an integer uses sequential 9-decimal multiplication, also bounded to 128 iterations unless the truncated base is one. Request notionals are truncated to native USD precision before dependent increase/decrease calculations. Swap impact uses integer input-token amounts and native-rounded midpoint prices. Market data and direct impact inputs must be representable in native precision; position exponents must describe the same native configuration and positive factors must already be capped to negative factors by the adapter.

Integer powers exceeding the iteration limit, noncanonical impact inputs and arithmetic overflow throw `GmsolPriceImpactError`. The iteration limit bounds local work; it does not imply that the native program rejects every larger exponent. Genuinely fractional 9-decimal exponents do not use that limit. Swap estimation and route selection propagate this error instead of returning a numeric quote. Callers must handle it as an unavailable calculation before using the quote or submitting an order. Existing EVM arithmetic and fallback behavior are unchanged; this SDK change does not implement the downstream UI error presentation.
