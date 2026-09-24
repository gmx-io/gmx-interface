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

async function load(): Promise<GmsolRuntime> {
  const [sdk, anchor, idlModule] = await Promise.all([
    import("@gmsol-labs/gmsol-sdk"),
    import("@coral-xyz/anchor"),
    import("../idl/gmsol_store.json"),
  ]);
  const idl = idlModule.default as unknown as import("@coral-xyz/anchor").Idl;
  if (idl.address !== GMX_SOLANA_STORE_PROGRAM_ID) {
    throw new Error(`gmsol_store IDL address ${idl.address} does not match GMX_SOLANA_STORE_PROGRAM_ID`);
  }
  return { sdk, coder: new anchor.BorshCoder(camelCaseGmsolIdl(idl)) };
}
