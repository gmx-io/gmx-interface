import { getIsSolanaNetworkEnabled } from "config/ab";

type GmsolSdk = typeof import("@gmsol-labs/gmsol-sdk");

let gmsolSdkPromise: Promise<GmsolSdk> | undefined;

export function loadGmsolSdk(): Promise<GmsolSdk> {
  if (!getIsSolanaNetworkEnabled()) {
    return Promise.reject(new Error("Solana network is disabled"));
  }

  if (!gmsolSdkPromise) {
    // WASM initialization failures are cached by the module runtime and require a page reload.
    gmsolSdkPromise = import("@gmsol-labs/gmsol-sdk");
  }

  return gmsolSdkPromise;
}
