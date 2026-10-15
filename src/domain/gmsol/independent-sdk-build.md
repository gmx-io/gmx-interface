# Independent gmsol SDK build

This replaces the shared WASM/TLA plugin integration described in `bundle-verification.md`
and `app-build-verification.md`. Those reports are historical, not validation of this implementation.

## Build and load contract

- `yarn build:gmsol-sdk` uses only `vite.gmsol.config.ts`. It writes to
  `public/gmsol-sdk/0.9.0-test.2-v1/`; the application's normal public-file copy deploys the assets.
- Application and landing build/start scripts prepare this artifact first. When invoking Vite
  directly, run `yarn build:gmsol-sdk` first as well.
- Vite's native `?init` loader instantiates the pinned WASM with its `./index_bg.js` imports.
  `sdk-entry.js` performs the same binding and start calls as the package's `index.js`, inside an
  explicit asynchronous initializer. No top-level await or third-party WASM/TLA plugin is needed.
- The main loader imports the artifact URL with `@vite-ignore`, waits for `initialize()`, and
  shares the initialization promise. Network-disabled calls reject before importing anything.
  Failed initialization stays rejected until the page is reloaded.
- Both builds use Vite's normal browser target, minification and source-map pipeline.
- The independent build checks the input WASM SHA-256 against the approved production binary.
  WASM is emitted as a separate asset, not inlined or compiled into a different binary.
- Increment the artifact revision in `config/gmsol/sdk.ts` whenever the wrapper or SDK build
  configuration changes. Update the SDK version and approved hash together when replacing the SDK.
  Preserve older artifact directories on the host if supporting already-open tabs across releases.

## Build verification — 2026-10-15 (Asia/Shanghai)

Actual production builds passed:

| Build | Duration |
| --- | ---: |
| Independent SDK | 463 ms |
| Current application | 1m 38s |
| Baseline application | 1m 35s |
| Current landing | 30.09s |

The baseline is `f8ff46df3faf40f1997a2d8d9e58841d09cc6d33`, the branch's merge base with
`origin/release`. The older `0cad58d` used in the historical report predates unrelated EVM changes
already merged into this branch and is not the comparison baseline for this implementation.

Both app builds used `VITE_APP_VERSION=fesol55-independent-verification`,
`VITE_APP_PWA_GENERATION=1791936000000`, `VITE_APP_IS_HOME_SITE=false`, production mode and an
8192 MiB Node heap. The baseline source was exported with `git archive` without changing the checkout.
It shared the current installed dependencies via symlinks: the lockfile delta from the baseline now
contains only the added gmsol SDK package, which the baseline does not import. This comparison does
not claim to test a separate clean dependency installation. Landing used `VITE_APP_IS_HOME_SITE=true`.

`compare-evm-chunks.mjs` passed: all **1,243 JavaScript files** outside `gmsol-sdk/` have identical
filenames and SHA-256 digests. This includes **265 generated JavaScript chunks** under `assets/`
(total 15,623,871 bytes) and copied public JavaScript resources. No filename/reference normalization
or size tolerance was applied.

The actual SDK artifact was imported and initialized in Node using a file-backed WASM fetch:

- Importing the entry alone made no WASM request; concurrent and subsequent initialization calls
  shared one promise and one WASM request.
- `default_store_program()` returned the expected program/store object.
- A failed WASM request rejected initialization and remained cached without another fetch.
- The emitted and deployed-copy WASM is 1,127,415 bytes with SHA-256
  `775a7ddb532d6d49a1800a3d8eccca523960d685db8e1800fbd5eb519ed8dd68`.
- The generated entry's initializer maps back to `sdk-entry.js`, line 6, through its emitted source map.

Builds logged non-fatal dependency annotation/large-chunk warnings and, in the working checkout,
the reference project's missing Docusaurus tsconfig warning. No build failed.

Evidence is in the ignored `build/fesol55-independent/` directory: `sdk.log`, `current.log`,
`baseline.log`, `landing.log`, `comparison.log`, `result.json`, and the generated output directories.
These artifacts may be removed by a later root build. Browser network/flag behavior and deployment
were not tested; Node artifact checks do not replace browser acceptance.

## Reproduction and remaining browser acceptance

1. Build the baseline and current application into separate directories with identical Node/Yarn,
   environment, `VITE_APP_VERSION`, `VITE_APP_PWA_GENERATION`, mode and generated locale inputs.
   For a fixed version, invoke Vite directly after preparing the independent SDK; the package build
   scripts intentionally set the version to the current Git commit.
2. Run `node scripts/compare-evm-chunks.mjs <baseline-output> <current-output>`. This requires exact
   filename and SHA-256 equality for every JavaScript file outside `gmsol-sdk/`, without normalizing
   references or tolerating size differences. Compare against the pre-integration release source,
   not the previous TLA-enabled implementation.
3. Check the emitted WASM SHA-256 against `config/gmsol/sdk.ts` and the production verification report.
4. In a browser preview, with `solanaNetwork` off, confirm no SDK/WASM requests. With it on, invoke
   the loader concurrently and again after resolution: it must initialize once, and a real SDK
   call such as `default_store_program()` must succeed. The application currently has no loader caller;
   use a temporary feature-gated caller for this acceptance check.
5. Block the WASM request and verify initialization rejects instead of exposing an uninitialized SDK.
6. Verify source-map locations for a known EVM call and an SDK wrapper call, plus the landing build.

This changes the FESOL-55 implementation detail from global WASM/TLA Vite plugins to native Vite
WASM initialization in an independent build. It preserves the pinned binary and lazy-loading goals.
Strict EVM byte equivalence remains an acceptance check, not an unverified claim.
