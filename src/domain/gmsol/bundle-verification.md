# FESOL-55 EVM Bundle Comparison

> Historical verification of the previous global WASM/TLA plugin implementation.
> Superseded by [the independent SDK build](./independent-sdk-build.md); these results do not validate the current implementation.

Verified on 2026-10-14 (Asia/Shanghai).

## Result

The configuration-only integration builds successfully and loads the real WASM SDK, but does **not** satisfy strict byte-for-byte “EVM chunks unchanged”. All 263 JavaScript chunks retain their module membership and rendered module lengths, but their final bytes differ, even after normalizing JavaScript chunk references. CSS is byte-identical to the baseline.

The earlier Yarn patch has been removed. `package.json` and `yarn.lock` match HEAD again. The only production code change is three explicit build settings in `vite.config.ts`:

```ts
minify: "esbuild",
target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
cssTarget: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
```

These targets match Vite 6.4.3's original default. The official top-level-await plugin still internally changes the intermediate JavaScript target to `esnext`, then transforms output back to the explicit target. Explicit minification corrects its handling of the implicit default; explicit CSS targeting prevents the intermediate target from changing CSS output. Neither the plugin implementation nor generated bundle files are edited.

## Inputs and Method

| Input | Value |
| --- | --- |
| Before (`release`) | `0cad58d2e7f19bcacbedea825d307336b5d660f0` |
| After | `7446a5f2a45addc7142308f68320110eef0e8927` plus the three Vite settings above |
| Host | macOS arm64 |
| Node / Yarn | `22.17.0` / `4.12.0` |
| Vite / Rollup | `6.4.3` / `4.59.0` |
| top-level-await plugin | Official `1.6.0`, existing SWC pins retained |
| Mode | `production`, application build |
| Fixed `VITE_APP_VERSION` | `fesol55-bundle-comparison` |
| Fixed `VITE_APP_PWA_GENERATION` | `1791936000000` |
| Fixed `VITE_APP_IS_HOME_SITE` | `false` |
| Node heap limit | 8192 MiB |

Source snapshots were exported with `git archive` into `build/fesol55-comparison/before` and `after`. The after snapshot receives the working-tree Vite configuration. Each snapshot has separate installed dependencies, installed with `node .yarn/releases/yarn-4.12.0.cjs install --immutable --mode=skip-build`. Required Lingui extraction and compilation were run explicitly. The existing baseline build was reused; its inputs have not changed.

Input SHA-256 values:

- Identical tracked `.env`: `87c029f27b65ee9d6ae52919a7e2d11aaa40cf110a4bc35fa1f361fe410551d6`.
- Baseline lockfile: `a867478424113f04030825215e35805279fd8feceb238e830a2427b03c037606`.
- Current lockfile: `b93140a787840cbbd4320d31829b41870e71dee9d611548180b5f8827c9bd29a`.
- Current Vite configuration: `05069e9a61701e8feaa47f37b4bee7358b63962212b940ff1ca348b927193edc`.

The reporting script loads the existing Vite configuration and adds only a reporting plugin. Final files are measured in `writeBundle`, after output transformations. It records byte length, SHA-256, per-file gzip size, module IDs, static imports, and dynamic imports. Chunks are matched by their sorted module-ID lists, with snapshot roots normalized only in module IDs, not in hashed file contents.

Startup includes entry chunks and `src/App/bootstrap.tsx`, plus transitive static imports. Gzip totals sum individual files compressed with Node's default `gzipSync`; they are not measured browser transfer sizes. JavaScript totals exclude source maps, CSS, public files, and other assets.

## Measurements

All sizes are bytes.

| Measurement | Baseline | Configuration-only | Difference |
| --- | ---: | ---: | ---: |
| JavaScript chunks | 263 | 263 | 0 |
| JavaScript raw | 14,462,486 | 15,626,851 | +1,164,365 (+8.051%) |
| JavaScript gzip | 4,574,346 | 4,642,653 | +68,307 (+1.493%) |
| Startup chunks | 8 | 8 | 0 |
| Startup JavaScript raw | 9,911,189 | 9,927,572 | +16,383 (+0.165%) |
| Startup JavaScript gzip | 2,956,893 | 2,957,354 | +461 (+0.016%) |
| CSS raw | 238,073 | 238,073 | 0 |
| CSS gzip | 42,166 | 42,166 | 0 |

The largest remaining increases are localized `messages` chunks. The official plugin still reprocesses ordinary chunks; this report does not claim semantic equivalence merely because module inventories match or startup size is close. Before the explicit configuration, total JavaScript gzip growth was 478,067 bytes (+10.45%); the configuration reduces it to 68,307 bytes but does not eliminate it.

## Validation and Limitations

- Application production build succeeded in approximately 2m57s, including the Solana isolation check.
- `tscheck:ci` passed.
- `test:ci --exclude 'build/**' --exclude 'gmx-solana-interface/**'` passed: 263 files, 2,614 tests; one file/test skipped. The exclusions omit temporary snapshots and the separate reference project. Logs retain existing warnings and teardown messages.
- A separate smoke build makes the real `loadGmsolSdk` reachable with a controlled AB-flag module. The disabled flag causes no WASM fetch; enabling it makes concurrent and later calls share one SDK load and one WASM fetch. The real `default_store_program()` call succeeds. This executes in Node with a local-file-backed WASM fetch response, not a browser.
- The smoke fixture separately reports EVM byte comparisons without treating mismatches as runtime failures: its ordinary lazy EVM leaf matches, while its EVM entry and preload helper differ.
- The actual application still has no caller of the SDK loader, so its bundle contains no gmsol or WASM assets. The smoke build covers reachable WASM initialization separately.
- No browser, live AB-flag UI verification, deployment, or landing build was run.

On 2026-10-14 (Asia/Shanghai), the user explicitly accepted the current configuration-only solution and its measured bundle differences: startup JavaScript gzip increases by 461 bytes (+0.016%), total JavaScript gzip increases by 68,307 bytes (+1.493%), and CSS remains byte-identical. The decision is to retain this solution without a third-party plugin patch or an independent SDK build pipeline.

This acceptance does not change the measurements or claim byte-for-byte JavaScript equivalence. The original Linear requirement says “EVM chunks unchanged”; this document records the user's acceptance of the measured differences, without changing the Linear issue itself.

## Evidence and Reproduction

Current evidence lives in `build/fesol55-comparison/`:

- `before/bundle-report.json`, `after/bundle-report.json`: final hashes, sizes, module/import inventories.
- `before/stats.html`, `after/stats.html`: visualizer reports.
- `comparison.json`, `chunks.csv`: all 263 matched pairs.
- `config-build.log`, `config-snapshot-install.log`, `config-tscheck.log`, `config-tests.log`, `config-wasm-smoke.log`.
- `build-report.mjs`, `compare.mjs`, `wasm-smoke.mjs`: measurement and smoke scripts.
- `config-evidence.tar.gz`: current portable evidence, including the source configuration and lockfile. Earlier `evidence.tar.gz` and `fixed-evidence.tar.gz` describe superseded experiments.

To reproduce, export the two source commits into separate directories and overlay the current `vite.config.ts` onto the after snapshot. Install each with the immutable command above. In each snapshot run `NODE_ENV=development node .yarn/releases/yarn-4.12.0.cjs lingui extract --clean`, followed by `node .yarn/releases/yarn-4.12.0.cjs lingui compile`. Place the evidence scripts in the parent directory and run `NODE_OPTIONS=--max-old-space-size=8192 node ../build-report.mjs .` from each snapshot, then `node compare.mjs` from the parent. Run the smoke script from the main repository root with its installed dependencies.

The fixed metadata values are comparison inputs, not deployment values. Evidence under `build/` is ignored by Git and may be removed by a subsequent root build; retain the archive when sharing the report.
