# GMX Interface

Frontend monorepo of the GMX decentralized perpetual and spot exchange:

- `src/` — the trading app ([app.gmx.io](https://app.gmx.io))
- `landing/` — the landing page
- `sdk/` — the TypeScript SDK, published to npm as [`@gmx-io/sdk`](https://www.npmjs.com/package/@gmx-io/sdk); see [sdk/README.md](sdk/README.md)

The app imports the SDK sources directly (the `sdk` path alias points to `sdk/src`); `yarn build-sdk` produces the publishable package build.

## Requirements

- Node.js 20 (`.nvmrc`; CI runs 22)
- Yarn 4.12, checked in at `.yarn/releases/`; run `corepack enable` once per Node version
- A git clone: the scripts and `vite.config.ts` read `HEAD`
- A POSIX shell (macOS, Linux or WSL): the git hooks are `sh` scripts
- Playwright Chromium for `yarn test:ct`: `yarn playwright install chromium`

## Getting started

```bash
yarn install
yarn prepare
yarn start
```

The trading app dev server runs at [http://localhost:3010](http://localhost:3010).

- `yarn install` ends with a `postinstall` step that installs the SDK's dependencies and builds it into `sdk/build`.
- `yarn prepare` installs the git hooks and re-extracts the translation catalogs. Yarn 4 does not run it on install, so run it once per clone.

## Scripts

| Command                              | Description                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `yarn start`                         | Trading app dev server on port 3010                                              |
| `yarn start-home`                    | Landing dev server on port 3010                                                  |
| `yarn start-app`                     | Trading app dev server on port 3011 with the `development-app` env profile       |
| `yarn build`                         | Build the app into `build/`                                                      |
| `yarn build-app` / `yarn build-home` | Production app / landing builds with the matching env profiles from `.env-cmdrc` |
| `yarn build-sdk`                     | Build the `@gmx-io/sdk` package                                                  |
| `yarn test` / `yarn test:ci`         | Vitest in watch / single-run mode                                                |
| `yarn test:ct`                       | Playwright component tests                                                       |
| `yarn tscheck`                       | Typecheck the app and the landing                                                |
| `yarn lint`                          | ESLint with autofix; `yarn lint:ci` checks only                                  |
| `yarn lingui:prepare`                | Extract and compile translation catalogs                                         |

## Environment

`yarn start` needs no environment variables. The committed `.env` holds shared defaults; put personal values in `.env.local`, which git ignores.

| Variable                                                                                 | Effect                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_ARBITRUM_RPC_URLS`, `VITE_APP_AVALANCHE_RPC_URLS`, `VITE_APP_MEGAETH_RPC_URLS` | A JSON array of RPC URLs that replaces the fallback RPC for that chain.                                             |
| `VITE_APP_DISABLE_PWA`, `VITE_APP_PWA_GENERATION`                                        | `VITE_APP_DISABLE_PWA=true` unregisters the service worker. The PWA build id defaults to the commit time of `HEAD`. |
| `VITE_APP_IS_HOME_SITE`, `VITE_APP_BASE_URL`                                             | Landing page or app. The `start-home` and `start-app` profiles in `.env-cmdrc` set them.                            |

Root tests read `.env.local` too. An RPC override whose host is missing from `src/domain/testUtils/rpc/chainIdFromRpcUrl.ts` fails `chainIdFromRpcUrl.spec.ts`, and with it `yarn test:ci` and the pre-push hook.

## Development mode

On any host whose name does not contain `gmx.io`, the app runs in development mode (`isDevelopment()` in `src/config/env.ts`):

- every market in `src/config/static/markets.ts` is enabled, and the testnets join the network selector;
- markets, positions and orders follow the AB flag `abSdk3`, off by default, so they read chain RPC until you turn it on;
- Settings (the button in the app header) gets a **Debug settings** tab.

The localStorage key `production-preview` turns development mode off.

## Test API

Under Settings > Debug settings > AB flags, then reload:

- `useTestApi` points the API, the stats API and the express relay at the test API. Prices, indexers and chain RPC stay on production.
- `abSdk3` reads markets, positions and orders from the API.

The flags live in localStorage `ab-flags`, which is per origin: set them again on port 3011.

- The test API is not a testnet. `arbitrum-test.gmxapi.ai` serves Arbitrum mainnet data, so orders placed with `useTestApi` on are real. To trade without real funds, pick Arbitrum Sepolia in the network selector.
- Only Arbitrum and Arbitrum Sepolia have a test host. With the flag on, the API on the other chains is treated as unsupported.
- In development, the localStorage key `stats-api-url` replaces the stats API base URL, and `subgraphUrl:<chainId>:<indexer>` replaces one indexer URL (`subsquid`, `stats`, `referrals`, `syntheticsStats` or `chainLink`).
- Against a local API: set `GMX_TEST_API_URL` in `sdk/.env` for the SDK e2e suites and `stats-api-url` for the stats pages. For the rest of the app, make a local, uncommitted edit of `API_URLS.test` in `sdk/src/configs/api.ts` and turn on `useTestApi` and `abSdk3`.

## Working on the SDK

`sdk/` is a separate Yarn project with its own `yarn.lock`.

- Root `yarn tscheck` reads the SDK declarations in `sdk/build/types`. Run `yarn build-sdk` after editing `sdk/src`.
- Root `yarn prebuild` regenerates `sdk/src/codegen/prebuilt/*.json`, the hashed DataStore keys of the configured markets. Run it after changing the market list or market keys.
- SDK specs run only from `sdk/`:

| Command in `sdk/`          | Runs                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `yarn test:ci`             | unit specs; the market and token config specs compare with the live oracle keeper, so they need network access |
| `yarn test:multicall`      | the multicall specs, with recorded responses                                                                   |
| `yarn test:v2:public`      | public e2e specs; a throwaway signer is generated when no key is set                                           |
| `yarn test:v2`             | the full e2e suite with a funded wallet: real orders and fees                                                  |
| `yarn dev`, `yarn dev:cjs` | watch builds: ESM and declarations, or CommonJS and declarations                                               |

The e2e suites read `sdk/.env`, which git ignores. Use `sdk/.env.example` as a reference rather than a copy: `GMX_TEST_SEND=1` sends real bridge transactions, and the placeholder `GMX_TEST_PRIVATE_KEY` fails signer creation. CI runs `yarn test:v2:public` with no `GMX_TEST_*` variable set.

## Checks before a PR

CI runs on pull requests into `master`, `release` and `release-*`. The same checks, locally:

```bash
yarn build-sdk && yarn lint:ci && yarn tscheck:ci && yarn test:ci && yarn test:ct
cd sdk && yarn lint:ci && yarn tscheck:ci && yarn test:ci && yarn test:multicall && yarn test:v2:public
```

CI also builds the SDK the way it is published and runs `yarn npm audit` for the root and the SDK. A PR into any other branch runs none of this, so run it yourself.

## Git hooks and tests

- pre-commit: `yarn lingui:prepare` and `yarn build-sdk`, then `yarn tscheck` and `lint-staged`, then `git add src/locales/`. The last step stages every catalog change in the tree: check the `src/locales/` part of each commit, since catalogs from a stale base ride along and conflict with other PRs.
- pre-push: `yarn test:ci`, `yarn test:ct` and the SDK's `yarn test:ci`.
- Root vitest runs in happy-dom with `TZ=Asia/Dubai` and skips `sdk/`, `autotests/` and `*.ct.spec.tsx`.
- `yarn test:ct` runs the Playwright component tests in Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects another Chromium.
- `autotests/` is a separate Playwright e2e project; no hook or CI workflow runs it.

## Common problems

| Symptom                                                                      | Fix                                                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `yarn tscheck` reports SDK type errors the source does not have, or `TS6305` | Run `yarn build-sdk`.                                                                  |
| Commits and pushes run no checks                                             | Run `yarn prepare`.                                                                    |
| `Executable doesn't exist` in `yarn test:ct`                                 | Run `yarn playwright install chromium`.                                                |
| `yarn install` ends with `couldn't be built successfully`                    | The SDK postinstall step failed. Rerun it with `cd sdk && yarn install && yarn build`. |
| Settings has no Debug settings tab                                           | Open the app on localhost and remove the localStorage key `production-preview`.        |

## Documentation

- [GMX docs](https://docs.gmx.io) — protocol, API, and integration documentation
- [SDK overview](https://docs.gmx.io/docs/sdk/overview) — SDK guides on the docs site
- [SDK changelog](https://docs.gmx.io/docs/sdk/changelog) — the canonical `@gmx-io/sdk` changelog
