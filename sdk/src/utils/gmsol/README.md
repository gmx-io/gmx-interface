The shared trade and position helpers opt into gmsol math through data. They do not read a chain id or load Solana packages.

API contract

`/v1/markets/config` must serve these optional `MarketConfig` / `MarketInfo` fields for Solana markets:

| Field                | Meaning                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tradeMath: "gmsol"` | Enables immediate increase impact, pool-capped execution prices, net-side PnL caps, combined discounts, zero UI fees and funding settlement on the next order. Omit for EVM. |
| `minCollateralUsd`   | Market minimum collateral, in USD × 10^30. Overrides the global argument, including the liquidation floor. Zero is a valid value.                                            |
| `minPositionSizeUsd` | Market minimum position size, in USD × 10^30. Overrides the global decrease limit.                                                                                           |

All existing USD values and factors remain × 10^30; token amounts retain the mint's decimals. The position impact pool contains index tokens. There is no lent impact pool or pending position impact. Impact on increase changes the entry size in tokens; collateral is charged only for the order's fees. Open-interest imbalance is measured in USD.

The API must resolve `minCollateralFactorForLiquidation` before serving it: use the active closed-session parameter when appropriate, falling back to the active `minCollateralFactor` when the liquidation factor is zero. The SDK keeps its existing liquidation formula and does not call WASM.

`/v1/fee-discount` provides the wallet's combined GT-rank and referral discount as a × 10^30 factor. Pass it as `feeDiscountFactor` to position, increase, decrease, margin, withdrawal and TWAP helpers (the final optional argument of `getPositionFee`). Zero or omission means no discount. For gmsol this replaces EVM referral/pro discounts; it does not add to them. UI fees are zero.

`PositionInfo.fundingSettlement` is `"nextOrder"` for gmsol. Existing claimable funding fields remain receivables, separate from collateral and liquidation margin. Increase/decrease previews return `fundingPayout` in long/short token units; these are paid to the owner on the next order, with no claim transaction.

`getIncreasePositionAmounts().sizeDeltaInTokens` is the executed size including impact. `getIncreaseResultingPositionState` computes that size from the USD delta and evaluation prices itself, so callers can pass the preview without applying impact twice.

`getGmsolExecutionFee` returns the maximum keeper cost (at least 300,000 lamports), refundable order/escrow rent and their total SOL requirement separately. Rent inputs come from account sizes and the current rent configuration. `getGmsolExecutionFeeRefund` accounts for unused execution lamports; an execution which cancels an order can still charge the keeper fee. Owner cancellation before execution refunds the entire deposit. Network transaction fees are separate.

Reference tests

The Rust reference program, mainnet capture script, tests and fixtures live in [`gmsol_test/`](../../../../gmsol_test/README.md) at the repository root. Run `yarn test:gmsol` from the repository root. They are separate from the published SDK.

This change supplies math only. API activation/SDK pinning and app integration belong to the downstream tickets.
