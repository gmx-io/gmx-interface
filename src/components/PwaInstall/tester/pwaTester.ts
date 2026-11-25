// Tester for the PWA install design review: devices and moments, shown only outside gmx.io. Never merged.
import { useSyncExternalStore } from "react";

import type { PwaPlatform } from "../pwaPlatform";
import { setPwaState } from "../pwaStore";
import type { PwaEnvironment } from "../usePwaEnvironment";

const KEY = "gmx-pwa-tester-v1";

export type PwaTesterState = {
  isOn: boolean;
  platform: PwaPlatform;
  iosVersion: number;
  isInstalled: boolean;
  isSignedIn: boolean;
  isFunded: boolean;
  isOneClickOn: boolean;
  isPanelOpen: boolean;
  /** Shows the other-network note without real positions (switch the network in the header to see it). */
  isOtherNetworkNoteForced: boolean;
  /** Stand-ins for screens GMX doesn't design: the browser's install dialog and the system permission prompt. */
  browserDialogSource: null | "card" | "menu";
  isPermissionPromptOpen: boolean;
};

const DEFAULT: PwaTesterState = {
  isOn: true,
  platform: "iphone-safari",
  iosVersion: 27,
  isInstalled: false,
  isSignedIn: false,
  isFunded: false,
  isOneClickOn: false,
  isPanelOpen: true,
  isOtherNetworkNoteForced: false,
  browserDialogSource: null,
  isPermissionPromptOpen: false,
};

function read(): PwaTesterState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw), browserDialogSource: null, isPermissionPromptOpen: false } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/**
 * Link presets, so a state can be shared as one link: ?pwaTester=other-network turns notifications on, shows the
 * other-network note and switches the app to Avalanche, then reloads with a clean address.
 */
function applyLinkPreset() {
  if (typeof window === "undefined") return;
  const preset = new URLSearchParams(window.location.search).get("pwaTester");
  if (preset !== "other-network") return;

  try {
    window.localStorage.setItem("SELECTED_NETWORK", "43114");
    window.localStorage.setItem("SELECTED_NETWORK_WAS_APP_SELECTED", "true");
    const nudges = JSON.parse(window.localStorage.getItem("gmx-pwa-nudges-v1") || "{}");
    window.localStorage.setItem("gmx-pwa-nudges-v1", JSON.stringify({ ...nudges, notifications: "on" }));
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...DEFAULT, ...saved, isOn: true, isOtherNetworkNoteForced: true, isPanelOpen: false })
    );
  } catch {
    return;
  }

  window.location.replace(window.location.pathname);
}

applyLinkPreset();

let tester: PwaTesterState = read();
const listeners = new Set<() => void>();

export function setPwaTester(patch: Partial<PwaTesterState>) {
  tester = { ...tester, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(tester));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function usePwaTester() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tester,
    () => tester
  );
}

export function usePwaTesterEnvironment(env: PwaEnvironment): PwaEnvironment {
  const state = usePwaTester();

  if (!state.isOn) {
    return env;
  }

  return {
    ...env,
    platform: state.platform,
    iosVersion: state.platform.startsWith("iphone") ? state.iosVersion : undefined,
    isInstalled: state.isInstalled,
    isSignedIn: state.isSignedIn,
    isFunded: state.isFunded,
    isOneClickOn: state.isOneClickOn,
  };
}

export function pwaTesterHandlesBrowserDialog(source: "card" | "menu") {
  if (!tester.isOn) return false;
  setPwaTester({ browserDialogSource: source });
  return true;
}

export function pwaTesterHandlesPermission() {
  if (!tester.isOn) return false;
  setPwaTester({ isPermissionPromptOpen: true });
  return true;
}

export function answerPermissionPrompt(answer: "allow" | "deny") {
  setPwaTester({ isPermissionPromptOpen: false });
  setPwaState(
    answer === "allow" ? { notifications: "on", isNotificationsOnCardVisible: true } : { notifications: "blocked" }
  );
}

export function usePwaTesterOtherNetworkNote(isVisible: boolean, isOtherNetwork: boolean) {
  const state = usePwaTester();
  return isVisible || (state.isOn && state.isOtherNetworkNoteForced && isOtherNetwork);
}
