import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_SDK_ASSET_PATH } from "config/gmsol/sdk";

type GmsolSdk = typeof import("@gmsol-labs/gmsol-sdk");

type GmsolSdkEntry = { initialize: () => Promise<GmsolSdk> };

let gmsolSdkEntryPromise: Promise<GmsolSdkEntry> | undefined;

export function loadGmsolSdk(): Promise<GmsolSdk> {
  if (!getIsSolanaNetworkEnabled()) {
    return Promise.reject(new Error("Solana network is disabled"));
  }

  if (!gmsolSdkEntryPromise) {
    const url = `${import.meta.env.BASE_URL}${GMSOL_SDK_ASSET_PATH}/entry.js`;
    // Keep the independent artifact outside the application's module graph.
    gmsolSdkEntryPromise = import(/* @vite-ignore */ url).catch((error) => {
      gmsolSdkEntryPromise = undefined;
      throw error;
    });
  }

  return gmsolSdkEntryPromise.then((entry) => entry.initialize());
}
