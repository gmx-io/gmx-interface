# TRD-136 Solana integration playground

This integration uses the formal public Solana API, configured GMX RPC, shared TradeBox, order actions, lifecycle notifications and pinned GMX WASM. It combines existing product PRs before their upstream merge. Product acceptance and review remain with those PRs.

## Integrated formal PRs

Trading submission, lifecycle notifications, shared entry and close/edit/cancel now come from the single consolidated [#3337](https://github.com/gmx-io/gmx-interface/pull/3337) at `19850b6b461d598b5f9205bd14c60a4c9fc44342`, including release `c588a42b4c`. Future trading integration updates follow that shared branch instead of independently merging #3315, #3316, #3317 and #3293. Their historical commits remain ancestors of #3337; no source history is rewritten. TRD-83 / #3335 collateral deposits and withdrawals remain excluded.

The consolidated implementation supplies the close Receive helper and token metadata, so the separate TRD-136 receive-selector override has been removed. Existing chart/account-retry integration, confirmation-slot floors, stale-data guards and playground build configuration remain. The app consumes the merged public API contract; deployment does not establish API capacity or complete financial-reference acceptance.

The table records the consolidated trading source and retained prerequisite versions; the other rows are historical integration pins, not claims about current open PR heads.

| Capability                                      | PR                                                         | Source head  |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------ |
| Consolidated trading submission, lifecycle, entry and order actions | [#3337](https://github.com/gmx-io/gmx-interface/pull/3337) | `19850b6b46` |
| GMX-owned WASM and latest release               | [#3314](https://github.com/gmx-io/gmx-interface/pull/3314) | `161e89e4a4` |
| Wallet balances and address keys                | [#3195](https://github.com/gmx-io/gmx-interface/pull/3195) | `58e343bb14` |
| Fee-discount fields                             | [#3205](https://github.com/gmx-io/gmx-interface/pull/3205) | `31bb690ebe` |
| Order fields                                    | [#3207](https://github.com/gmx-io/gmx-interface/pull/3207) | `6bb15c691f` |
| SDK input units                                 | [#3287](https://github.com/gmx-io/gmx-interface/pull/3287) | `24e983c4c4` |
| Solana pages and TradeBox entries               | [#3294](https://github.com/gmx-io/gmx-interface/pull/3294) | `5e30dbc18f` |
| Charts and account retry                        | [#3223](https://github.com/gmx-io/gmx-interface/pull/3223) | `c8f9c4a85d` |
| Ticker response contract                        | [#3273](https://github.com/gmx-io/gmx-interface/pull/3273) | `6995d3a0d5` |
| Preview UI version                              | [#3271](https://github.com/gmx-io/gmx-interface/pull/3271) | `cb6f535c9b` |

The official API includes merged [gmx-api #340](https://github.com/gmx-io/gmx-api/pull/340) at `c82a14e990` and SDK 2.9.3. The public market config serves 67 gmsol markets. Financial-reference and complete post-trade acceptance remain in TRD-108.

The historical wallet-scoped API patch, local database/indexer/reader launcher, loopback frontend launcher, capacity probe and automatic diagnostic RPC proxy are retired. No local API services or Docker are required for normal playground use. Existing running services are not stopped by removing these source tools; recover or stop a service only after verifying its ownership.

The component workflow uses the normal upstream report steps. It no longer carries fork-specific report conditions; report publication failures remain distinct from test failures.

## Integration configuration

The former close Receive patch is now owned by #3337. Pay selectors use the formal #3294 implementation. Frozen tables from merged #3325 replace the experimental empty-table override; their earlier mainnet verification established 73/155 entries in order and null authorities. No experimental transaction builder or no-LUT override is retained.

The official app now uses GMX RPC proxy routes. Playground maps that shared provider entry to its configured Alchemy endpoints for the app and Web Worker, retaining development and production-purpose selection. Ordinary app builds keep the official proxy routes. No local proxy is required.

## Build and inspect

Edit the tracked `.env.playground.local` in this checkout to update the four `PLAYGROUND_ALCHEMY_*_KEY` values. This playground-specific file intentionally contains public browser keys and is committed with the branch so local and CI builds use the same configuration. `.env.playground.example` lists the variable names. `DEVELOPMENT` is used on localhost and Pages previews unless UseProductionRpcRoutes / production preview is enabled. `FALLBACK`, `LARGE_ACCOUNT` and `EXPRESS` retain the existing purpose selection. These overrides cover every Alchemy chain used by playground; enable Solana Mainnet and the EVM networks you use on the corresponding Alchemy apps. One authorized key can fill multiple purposes. Other providers and ordinary app builds are unchanged.

For local development:

```sh
NODE_OPTIONS=--max-old-space-size=8192 yarn start-playground
# http://127.0.0.1:3016/trade
```

Restart the dev server after editing the file. For a production preview:

```sh
NODE_OPTIONS=--max-old-space-size=8192 yarn build-playground
NODE_OPTIONS=--max-old-space-size=8192 yarn vite preview --host 127.0.0.1 --port 3016
```

Restart preview after rebuilding. Editing the env file does not change an existing build or the deployed website. To update the deployed playground, supply the same variables to its build process, rebuild and deploy with the normal authorization. Process environment variables take precedence over the local file. Missing/blank or malformed keys stop playground startup/build with the variable name, without printing its value or falling back to a hardcoded key. Vite playground mode also reads standard `.env` files; keep unrelated credentials out of this browser configuration.

Both playground entry points apply their RPC override only to `src/config/rpc.ts`, including its separate Web Worker build; a changed source contract fails explicitly. The non-`VITE_` names are consumed by the playground tooling, not exposed wholesale. The selected key values still become browser-visible RPC URLs in the bundle/network panel. This tracked configuration is for browser RPC keys only; do not put server credentials in it.

`build-playground` uses the normal production app environment and SDK build, with the formal frozen LUT configuration and the `solanaNetwork` AB flag at share 1 from `abFlagConfiguration.mjs`. New visitors have Solana enabled immediately; existing disabled settings are enabled on reload through the normal AB initialization. Turning the flag off in Debug settings also reloads the app and re-enables it. Network selection still follows the existing user preference.

Preparation, validation and sending use the same formal frozen LUT selection. Other feature flags, including the independent `solanaTrading` gate, fresh trading checks, transaction-size limits and pre-signature simulation remain in place. Standard `build-app` retains share 0 and uses the same formal LUT configuration. Deployment is a separate action.

Transactions still must fit the 1232-byte packet limit. Account preparation may precede an indivisible increase plus TP/SL transaction. No automatic no-LUT fallback or altered acceptable price is provided. Frozen tables and passing builds do not complete the four-wallet or atomic TP/SL acceptance.

## Optional diagnostics

```sh
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/measure.mjs
NODE_OPTIONS=--max-old-space-size=8192 node tools/local-solana-trades/simulate.mjs \
  --wallet YOUR_PUBLIC_SOLANA_ADDRESS
# Add --atomic to simulate an increase with attached TP and SL.
```

`measure.mjs` uses generated identities and fixed offline inputs only to measure transaction encoding/size. Those inputs never enter live trading configuration.

`simulate.mjs` defaults to the official public API. It requires an explicitly configured, authorized read/simulation endpoint in `TRD136_RPC_URL`; it never starts a proxy or selects a fallback. An explicit loopback API remains accepted for diagnostics against an independently managed API environment. It uses real data, hash-verified WASM and the product prepare/builder/validator checks. The Node adapter omits browser loader/tracker/sender behavior, neither signs nor broadcasts, and does not establish spending authorization or browser acceptance.

## Recorded live evidence

Historical fixed-source evidence includes a Phantom market long with eight successful Lighthouse assertions on November 18 and a full market close through formal TRD-84 actions on November 19, with keeper execution, received USDC and account refresh. Those transactions do not validate this newly merged head. Limit creation/edit/cancel/trigger, atomic TP/SL, all wallets, use of the frozen production LUTs in landed transactions, and full financial-reference parity remain separate acceptance work. New wallet signing, broadcasting and deployment require their own authorization.
