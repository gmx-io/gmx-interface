# Solana playground and TRD-136

## Final API integration verified on November 17, 2026

Use the merged [gmx-api #340](https://github.com/gmx-io/gmx-api/pull/340) revision `c82a14e990ece30103defda0ed764fea3cf65aa0` with its own immutable lockfile installation and generated tsoa routes. This revision upgrades the published SDK alias to 2.9.3 and shares native market, pending-position-fee and discount calculations. Preserve an existing fixed environment when preparing a new checkout; use separate API/indexer ports and an owned database.

On frontend `7455203605` (release `28ddd42ce6` plus the existing trading integration), this unmodified API globally bootstrapped 105,536 accounts and served 67 gmsol markets. Its TypeScript check and five index/account/order suites passed (72 tests). Real positions, orders and fee-discount endpoints returned 200; a requested minimum slot 470550701 returned 470550709. Pausing only the owned writer caused market and position reads to return 503 after freshness expired, and resuming it restored 200 responses.

The existing hash-verified WASM prepare/builder/validator/pre-signature pipeline passed unsigned market long/short and limit long/short simulations at slots 470550183/191/200/208: 892 bytes for market orders and 925 bytes for limit orders, without LUTs. These are local integration results, not browser signing, keeper execution, full financial-reference acceptance or evidence that the public API has deployed this revision. Keep the deferred close/cancel and original four-wallet/atomic acceptance scopes explicit.

The earlier `996cf05` results below are historical and do not describe the final API revision. When following their commands, use `/path/to/gmx-api-at-c82a14` as the API checkout. The API remains local only; no API branch or PR is published by this workflow.

`solana-playground` is a persistent experimental integration branch based on release. It combines Solana prerequisites and exploratory work so they can be tested together before their individual production rollouts. Keep its PR into release as a Draft; inclusion here does not establish production readiness or approval of the original issues.

This first integration transfers the runtime changes from TRD-136 development `0a6277ec904c86d0470b28b7d2db6284afa3033a`, using a three-way merge onto release `28ddd42ce6`. It includes the shared TradeBox, transaction construction and validation, wallet balances, order lifecycle, and pinned WASM SDK. Existing release math and market-selector changes are retained. Personal Agent infrastructure, reference repositories, credentials, wallet data, and the superseded local API patch are excluded.

## Branch workflow

Create focused experiment branches from the current playground and merge tested results back here. Experimental solutions may be provisional; describe their scope and limitations in their PRs. Fixes intended for a production issue should originate in that issue's development branch and be transferred here. Do not merge this entire branch into an individual production issue or personal infrastructure branch.

Synchronize release when it matters for integration. Validate the combined result after conflicts, especially SDK exports, shared consumers, feature gates, and transaction checks. Record the frontend SHA and the API revision used for each runtime test.

## Deployment preview

The deployed frontend uses the existing public Solana API, RPC configuration, and LUT trust configuration. It does not expose the local PostgreSQL/indexer or silently substitute local data. Enable `solanaNetwork` in Settings > Debug settings > AB flags to inspect Solana; the default remains zero. Transaction sending also requires the live keeper's explicit `solanaTrading` flag.

A successful frontend deployment proves that this revision builds and serves. It does not establish that the public API has rolled out compatible math or that trusted LUTs are available. The isolated setup below supplies the previously tested local API and no-LUT configuration for real-data integration. Do not assume that a deployment preview can perform every trade verified locally.

## Reproduce the isolated local setup

Use Node 22, the repository's Yarn version, Docker with an existing `postgres:15` image, and a clean gmx-api checkout with its own locked dependencies and generated tsoa routes. On a machine with external Docker storage, verify the actual image/virtual-disk location before pulling images.

The tested API candidate is [gmx-api #340](https://github.com/gmx-io/gmx-api/pull/340), revision `996cf05db9603d9af1689fdbac05f5a0ecf8e0e1`. Use its unmodified global index; no wallet patch is needed. API review and deployment remain separate upstream work.

Set `TRD136_RPC_URL` in the process environment to an authorized RPC endpoint supporting reads and unsigned simulation. Never commit credentials. Alternatively, the API launcher accepts `--rpc-config` pointing to an existing external read-only proxy configuration and its adjacent `proxy.mjs`.

```sh
NODE_OPTIONS=--max-old-space-size=8192 yarn install --immutable
NODE_OPTIONS=--max-old-space-size=8192 yarn build-sdk

NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/api.mjs \
  --api-dir /path/to/gmx-api-at-996cf05 --port 3056 --index-port 3057

# In another terminal, from this frontend checkout:
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/web.mjs \
  --api-url http://127.0.0.1:3056 --port 3016
```

The API launcher creates an isolated owned PostgreSQL container, runs the API's migrations, and starts only its indexer and reader. It preserves real prices, fees, account decoding, slot requirements, and freshness checks. It runs the API from a separate working directory without loading the checkout's `.env` or inheriting wallet/keeper signing credentials. Keep these processes local; the API's own listener must not be forwarded publicly.

The web launcher verifies and bundles the pinned WASM before starting Vite. It only transforms the Solana API host to the supplied loopback origin and supplies the same empty LUT configuration to the existing builder, validator, and sender. EVM configuration and trading checks remain intact. Use the existing browser/wallet session and confirm the selected address and network.

Stop each foreground launcher with Ctrl-C. The API launcher cleans up only its owned process groups, container and anonymous volumes. Reports and logs remain under ignored `.local/trd-136/`. After an abnormal termination, use the report's owner/container/PIDs to confirm ownership before cleanup; do not stop unrelated services.

## Diagnostics

```sh
# Offline encoding only: generated identity and fixed inputs; never broadcast.
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/measure.mjs

# Real data and unsigned simulation only; requires TRD136_RPC_URL and the local API.
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/simulate.mjs \
  --wallet YOUR_PUBLIC_SOLANA_ADDRESS --api-url http://127.0.0.1:3056

# Optional read-only full-store scan diagnostics; can be expensive for the RPC provider.
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/probe.mjs
```

The Node simulation adapter uses the hash-verified WASM and existing prepare/builder/validator/pre-signature checks. Its 3 USDC collateral / 6 USD size inputs are diagnostic assumptions, not authorization to trade. It does not connect a signer or call the sender. It does not exercise the browser loader, wallet integration, or the entire TradeBox flow.

## Historical evidence and remaining coverage

- Network: Solana mainnet, genesis `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`.
- Program: `Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo`; store: `CTDLvGGXnoxvqLyTpGzdGLg9pD6JexKxKXSV8tqqo8bN`.
- Initial market: BTC/USD [USDC-USDC], market token `Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8`.
- WASM: `0.11.0-beta.1-gmx.1`, SHA256 `e82184caacc60828f024743f88a0a92d97b9d3d55db6839e0d3fab8a9b46c840`.
- November 16, 2026: the user executed one approximately 40 USD market long. RPC confirmed order creation and keeper execution; API and UI position/balance refresh were observed. This occurred on the original TRD-136 integration, before this playground's release baseline.
- November 17, 2026: the unmodified API candidate indexed 105,529 accounts and served 67 gmsol markets. Slot waiting, stale 503, and recovery were checked. Four unsigned market/limit long/short simulations passed: 892 bytes for market orders and 925 bytes for limit orders, without LUTs. These results apply to those simple single-order shapes and revisions, not arbitrary transactions.

Market short, limit long/short creation and cancellation, at least one triggered limit fill, and a verified exit remain outstanding. TRD-84 minimum local close/cancel wiring was explicitly deferred. An empty wallet observed later does not prove the shared UI can close a position. Verify a usable exit before new exposure. Real trading and wallet signing remain separate user-controlled operations; this PR does not complete TRD-136's full acceptance matrix.

Issue: https://linear.app/gmx-io/issue/TRD-136/enable-lightweight-local-testing-of-real-solana-trades-before-upstream
