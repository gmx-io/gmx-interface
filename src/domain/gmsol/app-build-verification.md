# FESOL-55 Application Build with a Real SDK Reference

Verified on 2026-10-14 (Asia/Shanghai).

Issue: [FESOL-55](https://linear.app/gmx-io/issue/FESOL-55)

## Result

The full application production build succeeded with a temporary, reachable reference to the real `loadGmsolSdk()` implementation. Vite completed in **59.42 seconds**, and the verification process exited with code 0.

The build emitted separate loader and SDK chunks and one real WASM asset. The existing Solana build isolation check passed with the SDK reachable: the SDK and WASM were not included in the startup static dependency graph.

## Inputs and Method

- Source commit: `9c40f9b0b412a293c7b32af0992005c0466cfca6`.
- SDK: `@gmsol-labs/gmsol-sdk@0.9.0-test.2`.
- Mode: `production`, using the main application's existing `vite.config.ts`.
- Environment: `VITE_APP_IS_HOME_SITE=false`, `VITE_APP_VERSION=fesol55-app-reference`, and `NODE_OPTIONS=--max-old-space-size=8192`.
- Output directory: `build/fesol55-app-reference/`.

A temporary Vite transform plugin appended a callable `globalThis.__fesol55LoadSdk` function to `src/App/bootstrap.tsx` during compilation. The function checked the real `getIsSolanaNetworkEnabled()` helper before dynamically importing `domain/gmsol/loadGmsolSdk` and calling `loadGmsolSdk()`. The function was not invoked during the build. Neither the SDK nor the flag helper was mocked.

The verification script called Vite's `build()` API with the existing configuration, the additional transform plugin, and the separate output directory. It asserted that the bootstrap reference was injected, that the real loader and SDK modules appeared in the output, and that exactly one WASM asset was emitted. The existing application build isolation plugin remained active.

After the build, SHA-256 was computed for the emitted WASM and the installed SDK's `index_bg.wasm`.

## Verified Artifacts

| Artifact | Output |
| --- | --- |
| Loader chunk | `assets/loadGmsolSdk-CmmKuzDB.js` |
| SDK chunk | `assets/index-DGpfiUfw.js` |
| Loader's dynamic SDK import | `assets/index-DGpfiUfw.js` |
| WASM asset | `assets/index_bg-BuNZvc_1.wasm` |
| WASM size | 1,127,415 bytes |

The emitted WASM and `node_modules/@gmsol-labs/gmsol-sdk/index_bg.wasm` have the same SHA-256:

```text
775a7ddb532d6d49a1800a3d8eccca523960d685db8e1800fbd5eb519ed8dd68
```

## Warnings and Scope

The build logged non-fatal diagnostics concerning the reference project's missing `@docusaurus/tsconfig`, dependency pure annotations, large chunks, and the temporary transform's missing source map. Vite also noted that dynamically importing `config/ab` does not move it into a separate chunk because the application already imports it statically. These diagnostics did not prevent the build or artifact assertions from passing.

This run verifies that the full application can bundle a reachable real SDK reference using its current production configuration. It does not verify browser execution, actual network request counts, live AB-flag behavior, transaction construction or sending, or byte-for-byte EVM bundle equivalence. No browser, development server, deployment, or additional test suite was run for this check.

The reference existed only in the temporary build transform. The transform script was removed after verification, and application source files were not changed. The generated test build still contains the temporary callable reference and is a verification artifact, not a deployment artifact.

## Evidence

- `build/fesol55-app-reference.log`: full build output and assertion result.
- `build/fesol55-app-reference-result.json`: SDK and loader chunk names, the loader's dynamic imports, and WASM asset size.
- `build/fesol55-app-reference/`: generated application artifacts containing the temporary reference.

These local artifacts are ignored by Git and may be removed by a subsequent build. This document preserves the result; the temporary verification script is not retained.

Related records: [bundle comparison](./bundle-verification.md) and [production WASM comparison](./wasm-verification.md).
