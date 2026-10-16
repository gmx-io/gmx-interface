import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_SDK_ASSET_PATH } from "config/gmsol/sdk";

type GmsolSdk = typeof import("@gmsol-labs/gmsol-sdk");

type GmsolSdkEntry = { initialize: () => Promise<GmsolSdk> };

let gmsolSdkEntryPromise: Promise<GmsolSdkEntry> | undefined;
let entryLoadFailures = 0;

export function loadGmsolSdk(): Promise<GmsolSdk> {
  if (!getIsSolanaNetworkEnabled()) {
    return Promise.reject(new Error("Solana network is disabled"));
  }

  if (!gmsolSdkEntryPromise) {
    // An absolute URL keeps Vite dev from adding ?import to this public artifact.
    const url = new URL(`${import.meta.env.BASE_URL}${GMSOL_SDK_ASSET_PATH}/entry.js`, window.location.origin);
    if (entryLoadFailures > 0) {
      // Browsers cache failed module loads by URL, even after the network recovers.
      url.searchParams.set("retry", String(entryLoadFailures));
    }
    // Keep the independent artifact outside the application's module graph.
    gmsolSdkEntryPromise = import(/* @vite-ignore */ url.href).catch((error) => {
      entryLoadFailures++;
      gmsolSdkEntryPromise = undefined;
      throw error;
    });
  }

  return gmsolSdkEntryPromise.then((entry) => entry.initialize());
}
