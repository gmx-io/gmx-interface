import type { BorshCoder } from "@coral-xyz/anchor";

import { camelCaseGmsolIdl } from "./gmsolIdl";
import { GMX_SOLANA_STORE_PROGRAM_ID } from "../config/solanaProgram";

export type GmsolSdk = typeof import("@gmsol-labs/gmsol-sdk");

export type GmsolRuntime = {
  sdk: GmsolSdk;
  /** Anchor account coder for the gmsol_store program (decodes `position` / `market` accounts). */
  coder: BorshCoder;
};

let runtimePromise: Promise<GmsolRuntime> | undefined;

/**
 * Lazily loads the GMTrade SDK (wasm), Anchor and the gmsol_store IDL.
 * Kept out of the EVM bundle: only Solana positions code awaits it.
 */
export function loadGmsolRuntime(): Promise<GmsolRuntime> {
  if (!runtimePromise) {
    runtimePromise = load().catch((error: unknown) => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

/**
 * The SDK entry (`index.js`) imports its `.wasm` at top level, which needs `vite-plugin-wasm` plus
 * `vite-plugin-top-level-await` under the app's es2020 build target. Instead, instantiate the wasm
 * through Vite's built-in `?init` helper and wire the wasm-bindgen glue by hand, as `index.js` does.
 */
async function loadSdk(): Promise<GmsolSdk> {
  const [bindings, initWasm] = await Promise.all([
    import("@gmsol-labs/gmsol-sdk/index_bg.js"),
    import("@gmsol-labs/gmsol-sdk/index_bg.wasm?init"),
  ]);
  const instance = await initWasm.default({ "./index_bg.js": bindings as unknown as WebAssembly.ModuleImports });
  const exports = instance.exports as WebAssembly.Exports & { __wbindgen_start: () => void };
  bindings.__wbg_set_wasm(exports);
  exports.__wbindgen_start();
  return bindings;
}

async function load(): Promise<GmsolRuntime> {
  const [sdk, anchor, idlModule] = await Promise.all([
    loadSdk(),
    import("@coral-xyz/anchor"),
    import("../idl/gmsol_store.json"),
  ]);
  const idl = idlModule.default as unknown as import("@coral-xyz/anchor").Idl;
  if (idl.address !== GMX_SOLANA_STORE_PROGRAM_ID) {
    throw new Error(`gmsol_store IDL address ${idl.address} does not match GMX_SOLANA_STORE_PROGRAM_ID`);
  }
  return { sdk, coder: new anchor.BorshCoder(camelCaseGmsolIdl(idl)) };
}
