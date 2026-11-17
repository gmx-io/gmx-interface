# TRD-136 local Solana integration

Run the existing shared TradeBox, transaction builders/checks, order lifecycle and pinned GMX WASM together against real local API data. Temporary configuration changes only the Solana API host and lookup-table selection. Product fixes belong in their original issue branches and PRs.

## Supported API

Use the unmodified merged [gmx-api #340](https://github.com/gmx-io/gmx-api/pull/340) at `c82a14e990ece30103defda0ed764fea3cf65aa0`, with its published SDK 2.9.3 dependency. Install that checkout's own immutable dependencies and generate its tsoa routes. Keep the checkout clean and preserve existing fixed environments when preparing another revision.

The upstream global index supersedes the historical wallet-scoped API patch. The patch and launcher option have been removed; do not apply a wallet filter or set `TRD136_INDEX_WALLET`. The API launcher runs only the upstream global indexer and reader with an owned local database. No API branch or PR is published by these tools.

On November 17, the fixed API bootstrapped 105,536 accounts and served 67 gmsol markets. Route generation, types and five index/account/order suites passed (72 tests). Account endpoints, minimum-slot waiting, stale market/position rejection and recovery passed. These results do not establish full financial-reference parity or official deployment readiness.

## Start and stop

Run from this frontend checkout with Node 22 and its locked dependencies installed. Verify Docker's actual image/virtual-disk storage location first; on the current machine it must be on the external volume. The local Docker daemon and an existing `postgres:15` image are required.

Use an existing compatible RPC explicitly, without putting credentials in command arguments:

```sh
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/api.mjs \
  --api-dir /path/to/gmx-api-at-c82a14 \
  --port 3066 --index-port 3067
```

The launcher reads `TRD136_RPC_URL` from the process environment. Alternatively, an existing local read-only RPC proxy can be selected with `--rpc-config /path/to/solana-rpc-proxy/config.json`. This optional path uses that directory's existing `proxy.mjs`; the proxy cannot broadcast transactions. Do not introduce a public RPC fallback or new provider key.

The launcher verifies mainnet genesis, ports, a clean API revision and real gmsol readiness. It creates an isolated PostgreSQL container with a unique owner label and random credentials, runs the upstream migrations and starts separate reader/writer processes. It does not load the API checkout's `.env` or inherit wallet/keeper write credentials.

Start the frontend against that instance:

```sh
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/web.mjs \
  --api-url http://127.0.0.1:3066 --port 3016
```

The web launcher first verifies and bundles the pinned browser SDK through the normal `vite.gmsol.config.ts` entry. Its local Vite transform selects the loopback API and the same empty LUT configuration for builders, validation and sending. EVM API configuration, feature flags and fresh `solanaTrading` checks remain unchanged. Missing API data remains an error.

Stop each launcher with Ctrl-C. API failure or normal shutdown cleans only its owned process groups, container and anonymous volume. Reports/logs stay under `.local/trd-136/api-*`; confirm ownership from the report before recovering an interrupted run. Do not prune unrelated containers, kill processes by port alone or expose the local API publicly.

## Diagnostics

```sh
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/probe.mjs
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/measure.mjs
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/simulate.mjs \
  --wallet YOUR_PUBLIC_SOLANA_ADDRESS --api-url http://127.0.0.1:3066
```

`probe.mjs` reads RPC capacity. `measure.mjs` uses generated identities and fixed offline inputs only to measure encoding/size; those inputs must never enter live trading configuration. `simulate.mjs` requires the running real API and uses the actual prepare/builder/validator/pre-signature path with fresh prices, fees, blockhash and trading flag. Its public wallet argument is for read-only simulation, not API scoping.

The Node simulation adapter directly initializes the hash-verified WASM and omits browser loader/tracker/sender behavior. It neither signs nor broadcasts. Its diagnostic trade parameters are not spending authorization. Four unsigned simulations against the final API passed at slots 470550183/191/200/208: market long/short 892 bytes, limit long/short 925 bytes, without LUTs.

## Acceptance boundaries

One approximately 40 USD BTC market long was submitted by the user on November 16. Creation, keeper execution and API/page position and balance refresh were independently verified. That evidence belongs to the then-current combination; it is not a real-trade test of the final SDK 2.9.3 API revision or evidence of the wallet's current holdings.

The first-phase scope remains one wallet, one USDC-collateral market and direct USDC payment. Market short, limit long/short creation/cancellation, at least one triggered fill and a usable exit path remain unverified. Minimum local close/cancel wiring remains deferred by the user; prefer verified TRD-84 implementation when available. Wallet signing/broadcasting and spending require their own authorization.

Official API rollout is not established. The public preview uses public configuration and is distinct from this local API setup. Keep the local API host and measured no-LUT configuration until verified replacements are available. Simple no-LUT results do not cover the four-wallet/atomic TP-SL/LUT acceptance of the original issues. No diagnostic success, green CI or local trade marks those requirements production-ready.
