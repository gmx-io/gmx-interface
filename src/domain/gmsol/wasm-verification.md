# GMTrade Production WASM Verification

Issue: [FESOL-55](https://linear.app/gmx-io/issue/FESOL-55)

Verified at: 2026-10-14 00:53:05 UTC (08:53:05 Asia/Shanghai).

## Result

The WASM file referenced by GMTrade's production trading page is byte-for-byte identical to the WASM file in the locally installed `@gmsol-labs/gmsol-sdk@0.9.0-test.2` package. Both files have the same size and SHA-256 digest.

| Property | Production | Local SDK |
| --- | --- | --- |
| File | `https://gmtrade.xyz/assets/index_bg-BuNZvc_1.wasm` | `node_modules/@gmsol-labs/gmsol-sdk/index_bg.wasm` |
| Size | 1,127,415 bytes | 1,127,415 bytes |
| SHA-256 | `775a7ddb532d6d49a1800a3d8eccca523960d685db8e1800fbd5eb519ed8dd68` | `775a7ddb532d6d49a1800a3d8eccca523960d685db8e1800fbd5eb519ed8dd68` |

The production response returned HTTP 200 with `Content-Type: application/wasm`. Its first eight bytes were `0061736d01000000`, the WebAssembly magic number and version 1 header.

## Resource Discovery

The production page was fetched directly from:

`https://gmtrade.xyz/trade/SOL-USD`

Its HTML references `/assets/vendor-Bsc7PJoV.js`. That script declares the WASM URL as `/assets/index_bg-BuNZvc_1.wasm` and contains the code that fetches and instantiates it. The WASM reference is in this vendor chunk, rather than the separately named `/assets/gmsol-sdk-Bk17GTR2.js` chunk.

The inspected HTML identifies the deployment as:

- App version: `2.14.4`
- Commit: `65faa50b`
- Build time: `2026-10-06T04:00:46.820Z`

## Verification Method

1. Fetch the production page HTML and inspect its referenced JavaScript assets.
2. Locate the WASM URL in the vendor script.
3. Fetch the production WASM and read the local SDK's `index_bg.wasm`.
4. Confirm the local package version from its `package.json` is `0.9.0-test.2`.
5. Compute SHA-256 for both byte sequences using Node.js `crypto.createHash("sha256")`.
6. Compare the complete byte sequences using `Buffer.equals`; the result was `true`.

## Scope and Remaining Acceptance Checks

This verification establishes binary equality with the production resource served at the recorded time. It does not establish the SDK's upstream source provenance or validate its runtime behavior.

The following FESOL-55 acceptance work remains separate:

- Include the WASM URL, SHA-256, and comparison result in the PR description.
- Compare before-and-after bundle reports to verify that EVM chunks are unchanged.
- Verify that disabling `solanaNetwork` causes no SDK or WASM requests, and that enabling it loads the real SDK once on first use.
- Run the relevant tests and verify the trading flag behavior.

No build, browser session, or test suite was run as part of this binary comparison.
