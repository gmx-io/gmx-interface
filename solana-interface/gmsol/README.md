# Solana order infrastructure

This directory contains the tracked subset of the GMSOL client needed by the
main project to build a Solana market-increase order. The public entry point is
`buildSolanaMarketLongTransaction` in `marketLong.ts`.

The first integration is intentionally constrained to SOL/USD market long
orders collateralized by USDC. The default mainnet market token is
`6UU9sF5fryafHDYPcmVcV7ucfnYs6iMVcvb8p7SBQgTc`, whose on-chain market account
is named `SOL/USD[USDC-USDC]`. It can be overridden with
`VITE_GMX_SOLANA_SOLUSD_MARKET_TOKEN`; the store, USDC mint, SOL mint, and short
token have defaults matching the current GMTrade deployment and can also be
overridden with environment variables.

For this `USDC-USDC` market, `isLong: true` selects the SOL/USD long direction;
the market's long and short collateral-side mints are both USDC. The SOL index
mint remains `So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH` and is represented by
the market account metadata rather than the collateral token passed to the order
builder.

`collateralAmount` is an integer in USDC's six-decimal base units. `sizeDeltaUsd`
is an integer in the Solana protocol's USD precision (20 decimals in the main
project). The caller is responsible for calculating the size from the user's
USDC margin and the selected leverage.

The builder only creates a transaction. `signAndSendSolanaMarketLong` uses the
connected standard Solana wallet to sign, submit, and confirm it. A UI layer can
therefore reuse the main project's input and status components without sharing
the EVM transaction state machine.
