# GMX Interface

Frontend monorepo of the [GMX](https://gmx.io) decentralized perpetual and spot exchange:

- `src/` — the trading app ([app.gmx.io](https://app.gmx.io))
- `landing/` — the landing page
- `sdk/` — the TypeScript SDK, published to npm as [`@gmx-io/sdk`](https://www.npmjs.com/package/@gmx-io/sdk); see [sdk/README.md](sdk/README.md)

The app imports the SDK sources directly (the `sdk` path alias points to `sdk/src`); `yarn build-sdk` produces the publishable package build.

## Requirements

- Node.js 20 (`.nvmrc`)
- Yarn

## Getting started

```bash
yarn
yarn start
```

The trading app dev server runs at [http://localhost:3010](http://localhost:3010).

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

## Documentation

- [GMX docs](https://docs.gmx.io) — protocol, API, and integration documentation
- [SDK overview](https://docs.gmx.io/docs/sdk/overview) — SDK guides on the docs site
- [SDK changelog](https://docs.gmx.io/docs/sdk/changelog) — the canonical `@gmx-io/sdk` changelog
