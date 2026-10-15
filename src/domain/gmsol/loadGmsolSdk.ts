import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_SDK_ASSET_PATH } from "config/gmsol/sdk";

type GmsolSdk = typeof import("@gmsol-labs/gmsol-sdk");

let gmsolSdkPromise: Promise<GmsolSdk> | undefined;

export function loadGmsolSdk(): Promise<GmsolSdk> {
  if (!getIsSolanaNetworkEnabled()) {
    return Promise.reject(new Error("Solana network is disabled"));
  }

  if (!gmsolSdkPromise) {
    const url = `${import.meta.env.BASE_URL}${GMSOL_SDK_ASSET_PATH}/entry.js`;
    // Keep the independent artifact outside the application's module graph.
    gmsolSdkPromise = import(/* @vite-ignore */ url).then((entry: { initialize: () => Promise<GmsolSdk> }) =>
      entry.initialize()
    );
  }

  return gmsolSdkPromise;
}
