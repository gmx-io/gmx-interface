/**
 * Workaround for an upstream bug in OneKey's Android in-app browser (FEDEV-4152): it overlays its
 * bottom toolbar on a full-height WebView, hiding `position: fixed; bottom: 0` UI. Nothing about
 * the covered strip reaches the page — `visualViewport`, `100dvh` and `env(safe-area-inset-bottom)`
 * all report the full WebView height — so the browser has to be detected and the height hardcoded.
 *
 * Reporting this upstream and deleting this file is tracked in FEDEV-4221;
 * `ONEKEY_ANDROID_FIXED_VERSION` disables it for updated users in the meantime.
 */

import { useSyncExternalStore } from "react";

/**
 * `BROWSER_BOTTOM_BAR_HEIGHT` from OneKey's `Discovery/config/Animation.constants.ts`. They pad the
 * bar by the Android safe-area inset on top of this, but the WebView ends above the system
 * navigation bar, so that inset is 0 and the bar height is the whole occlusion — measured on the
 * device in FEDEV-4152. It would not be, on a build that runs edge to edge.
 */
const BOTTOM_INSET = 54;

/** First OneKey version that positions the Android WebView above its toolbar. */
const ONEKEY_ANDROID_FIXED_VERSION: string | undefined = undefined;

/** The provider is injected before page scripts, but not always before we first ask for it. */
const DETECTION_RETRY_MS = 300;
const DETECTION_ATTEMPTS = 12;

type OneKeyWalletInfo = {
  version?: string;
  platformEnv?: {
    isNativeAndroid?: boolean;
  };
};

type OneKeyPrivateApi = {
  request: (params: { method: string }) => Promise<{ walletInfo?: OneKeyWalletInfo } | undefined>;
};

/** Read from a remote debugger to see what the shim decided on a device we can't reproduce on. */
export type OneKeyCompatDebugState = {
  inset: number;
  source: "privateApi" | "userAgent" | "none";
  version?: string;
  hasPrivateApi: boolean;
  hasOneKeyProvider: boolean;
  userAgent: string;
};

const debugState: OneKeyCompatDebugState = {
  inset: 0,
  source: "none",
  hasPrivateApi: false,
  hasOneKeyProvider: false,
  userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
};

let bottomInset = 0;
const subscribers = new Set<() => void>();

function setBottomInset(value: number, source: OneKeyCompatDebugState["source"]) {
  debugState.inset = value;
  debugState.source = source;

  if (bottomInset === value) {
    return;
  }

  bottomInset = value;
  subscribers.forEach((notify) => notify());
}

function isVersionAtLeast(version: string, target: string): boolean {
  const versionParts = version.split(".").map(Number);
  const targetParts = target.split(".").map(Number);

  for (let i = 0; i < Math.max(versionParts.length, targetParts.length); i++) {
    const versionPart = versionParts[i] ?? 0;
    const targetPart = targetParts[i] ?? 0;

    if (Number.isNaN(versionPart) || Number.isNaN(targetPart)) {
      return false;
    }

    if (versionPart !== targetPart) {
      return versionPart > targetPart;
    }
  }

  return true;
}

function getPrivateApi(): OneKeyPrivateApi | undefined {
  const privateApi = (window as any).$onekey?.$private as OneKeyPrivateApi | undefined;

  return typeof privateApi?.request === "function" ? privateApi : undefined;
}

function hasOneKeyProvider(): boolean {
  return Boolean((window as any).$onekey || (window as any).ethereum?.isOneKey);
}

/**
 * OneKey's own `$private` bridge is the only channel that states the platform outright, but it is
 * absent from `ENABLED_DAPP_SCOPE`, so it isn't guaranteed for arbitrary dapp origins. The user
 * agent is the fallback: `wv` marks an Android WebView, which rules out Chrome and the extension.
 */
async function detectOneKeyAndroidBrowser(): Promise<{ detected: boolean; version?: string } | undefined> {
  const privateApi = getPrivateApi();

  debugState.hasPrivateApi = Boolean(privateApi);
  debugState.hasOneKeyProvider = hasOneKeyProvider();

  if (privateApi) {
    const response = await privateApi.request({ method: "wallet_getConnectWalletInfo" });
    const platformEnv = response?.walletInfo?.platformEnv;

    if (platformEnv) {
      return { detected: Boolean(platformEnv.isNativeAndroid), version: response?.walletInfo?.version };
    }
  }

  if (!debugState.hasOneKeyProvider) {
    return undefined;
  }

  const userAgent = navigator.userAgent;

  return { detected: /Android/.test(userAgent) && /\bwv\b/.test(userAgent) };
}

async function runDetection() {
  for (let attempt = 0; attempt < DETECTION_ATTEMPTS; attempt++) {
    const result = await detectOneKeyAndroidBrowser().catch(() => undefined);

    if (!result) {
      await new Promise((resolve) => setTimeout(resolve, DETECTION_RETRY_MS));
      continue;
    }

    if (!result.detected) {
      return;
    }

    if (
      ONEKEY_ANDROID_FIXED_VERSION &&
      result.version &&
      isVersionAtLeast(result.version, ONEKEY_ANDROID_FIXED_VERSION)
    ) {
      return;
    }

    debugState.version = result.version;
    setBottomInset(BOTTOM_INSET, debugState.hasPrivateApi ? "privateApi" : "userAgent");

    return;
  }
}

let detectionStarted = false;

function startDetection() {
  if (detectionStarted) {
    return;
  }

  detectionStarted = true;

  void runDetection();

  (window as any).__gmxOneKeyCompat = debugState;
}

function subscribe(notify: () => void): () => void {
  startDetection();
  subscribers.add(notify);

  return () => {
    subscribers.delete(notify);
  };
}

/** Bottom strip of the viewport covered by the surrounding dapp browser's own chrome, 0 by default. */
export function getOverlayedBottomInset(): number {
  startDetection();

  return bottomInset;
}

export function useOverlayedBottomInset(): number {
  return useSyncExternalStore(subscribe, getOverlayedBottomInset, () => 0);
}
