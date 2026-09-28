/**
 * Deep imports into the wasm-bindgen "bundler" output of @gmsol-labs/gmsol-sdk.
 * `index_bg.js` exports the same API as the package entry plus the glue setter;
 * `gmsolRuntime.ts` instantiates the wasm itself so no top-level await reaches the bundle.
 */
declare module "@gmsol-labs/gmsol-sdk/index_bg.js" {
  export * from "@gmsol-labs/gmsol-sdk";
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void;
}
