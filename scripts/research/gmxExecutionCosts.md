# GMX Execution Cost Research

This script estimates GMX v2 perpetual execution costs from public GMX data.

```bash
yarn tsx scripts/research/gmxExecutionCosts.ts --index-symbol BTC --days 30 --min-size-usd 1000000
yarn tsx scripts/research/gmxExecutionCosts.ts --index-symbol ETH --days 30 --min-size-usd 1000000
yarn tsx scripts/research/generateGmxExecutionAppData.ts
```

## Data Sources

- GMX Oracle API `/markets/info` and `/tokens` for current market metadata.
- GMX Subsquid GraphQL `tradeActions` for `OrderCreated` and `OrderExecuted` events.

By default the script reads Arbitrum BTC markets. Use `--index-symbol ETH` to generate ETH datasets.

BTC markets:

- `BTC/USD [WBTC.b-USDC]`
- `BTC/USD [WBTC.b-WBTC.b]`
- `BTC/USD [tBTC-tBTC]`

ETH markets:

- `ETH/USD [ETH-USDC]`
- `ETH/USD [ETH-ETH]`
- `ETH/USD [wstETH-USDe]`

## Metric

For each executed market increase/decrease:

```text
protocolCostBps = oracleSpreadBps + positionFeeBps + netImpactCostBps + swapCostBps

swapCostBps = (swapFeeUsd - swapImpactUsd) / sizeUsd * 10_000
```

Where:

- `oracleSpreadBps` compares the GMX execution-side oracle price to the midpoint of `indexTokenPriceMin` and `indexTokenPriceMax`.
- `positionFeeBps` converts `positionFeeAmount` from collateral token units to USD using the execution collateral token price.
- `netImpactCostBps` uses `totalImpactUsd` when present, otherwise `priceImpactUsd`. Positive impact lowers cost, negative impact raises cost.

The script also reports `holdingFeeBps` from borrowing, funding, and liquidation fee fields, but it excludes those from `protocolCostBps` because they are position holding costs rather than execution cost. Token-denominated fee amounts use the collateral token min oracle price, matching the app's trade-history conversion convention.

## Limitations

- Exact delay drift is not included. Subsquid records order creation and execution timestamps, but not the oracle mid at creation time. Measuring delay drift needs an oracle archive or external second-level mid-price dataset.
- Historical synthetic quote replay is not included. That requires historical `DataStore` state or archived Reader calls for the target blocks.
- The script measures observed fills. It should be paired with synthetic notional replay before making venue-wide claims.

## Initial Finding

Recent observed GMX opens are usually near the 4-6 bps position-fee floor. Large closes can have a materially wider tail because net price impact is applied on decreases. In a 30-day Arbitrum BTC sample ending 2026-05-24, `$1m+` executions had:

- All executions: median `6.00` bps, p90 `12.35` bps.
- Increases: median `6.00` bps, p90 `6.00` bps.
- Decreases: median `5.19` bps, p90 `14.75` bps.
- Long decreases: median `6.77` bps, p75 `12.62` bps, p90 `17.96` bps.

This can explain a `12-17` bps GMX bar only if the study is emphasizing large close/decrease executions or close-aware effective cost, not current open-only market entries.

## App Page

The generated app data is written to `src/pages/GmxExecutionCosts/gmxExecutionCostsData.json`.

In development, open:

```text
/#/gmx-execution-costs
```
