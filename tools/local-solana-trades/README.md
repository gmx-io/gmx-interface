# TRD-136 Solana integration playground

This integration uses the formal public Solana API, configured GMX RPC, shared TradeBox, order actions, lifecycle notifications and pinned GMX WASM. It combines existing product PRs before their upstream merge. Product acceptance and review remain with those PRs.

## Integrated formal PRs

The November 20 integration merges these exact PR heads, including open and draft work. Existing source commits are preserved. Conflicts retain the composed behavior: lifecycle tracking and failure reasons, confirmed-slot floors, account retries, order metadata, close actions and Solana page gates.

| Capability                                      | PR                                                         | Source head  |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------ |
| GMX-owned WASM and latest release               | [#3314](https://github.com/gmx-io/gmx-interface/pull/3314) | `161e89e4a4` |
| Transaction preparation, validation and sending | [#3315](https://github.com/gmx-io/gmx-interface/pull/3315) | `c59c5fc672` |
| Order lifecycle and notifications               | [#3316](https://github.com/gmx-io/gmx-interface/pull/3316) | `5da468c4a3` |
| Shared order entry                              | [#3317](https://github.com/gmx-io/gmx-interface/pull/3317) | `c4347d2577` |
| Wallet balances and address keys                | [#3195](https://github.com/gmx-io/gmx-interface/pull/3195) | `58e343bb14` |
| Fee-discount fields                             | [#3205](https://github.com/gmx-io/gmx-interface/pull/3205) | `31bb690ebe` |
| Order fields                                    | [#3207](https://github.com/gmx-io/gmx-interface/pull/3207) | `6bb15c691f` |
| SDK input units                                 | [#3287](https://github.com/gmx-io/gmx-interface/pull/3287) | `24e983c4c4` |
| Close, edit and cancel actions                  | [#3293](https://github.com/gmx-io/gmx-interface/pull/3293) | `0722cc8701` |
| Solana pages and TradeBox entries               | [#3294](https://github.com/gmx-io/gmx-interface/pull/3294) | `5e30dbc18f` |
| Charts and account retry                        | [#3223](https://github.com/gmx-io/gmx-interface/pull/3223) | `c8f9c4a85d` |
| Ticker response contract                        | [#3273](https://github.com/gmx-io/gmx-interface/pull/3273) | `6995d3a0d5` |
| Preview UI version                              | [#3271](https://github.com/gmx-io/gmx-interface/pull/3271) | `cb6f535c9b` |

The official API includes merged [gmx-api #340](https://github.com/gmx-io/gmx-api/pull/340) at `c82a14e990` and SDK 2.9.3. The public market config serves 67 gmsol markets. Financial-reference and complete post-trade acceptance remain in TRD-108.

The historical wallet-scoped API patch, local database/indexer/reader launcher, loopback frontend launcher, capacity probe and automatic diagnostic RPC proxy are retired. No local API services or Docker are required for normal playground use. Existing running services are not stopped by removing these source tools; recover or stop a service only after verifying its ownership.

The component workflow uses the normal upstream report steps. It no longer carries fork-specific report conditions; report publication failures remain distinct from test failures.

## Remaining integration-specific support

| Support still retained                                           | Missing formal replacement                                         | Retirement condition                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Solana close receive-token metadata and available receive tokens | PR #3293 does not yet supply the complete shared selector contract | Have TRD-84 absorb the receive selector/tokenInfo fix, then remove its separate integration ownership without removing the behavior |

The close receive selector remains a product integration fix. The Pay selectors now use the formal #3294 implementation. Frozen tables from merged #3325 replace the experimental empty-table override; their 73/155 entries were verified against the originals in order, with null authorities on mainnet.

The RPC proxy Worker in the separate private repository has a proposed Solana route, but its PR is still open and a deployed, configured replacement endpoint is not established here. This app continues using the existing central GMX RPC configuration; it does not need a local proxy. Deploying or configuring the Worker is separate infrastructure work.

## Build and inspect

```sh
NODE_OPTIONS=--max-old-space-size=8192 yarn build-playground
NODE_OPTIONS=--max-old-space-size=8192 yarn vite preview --host 127.0.0.1 --port 3016
```

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
