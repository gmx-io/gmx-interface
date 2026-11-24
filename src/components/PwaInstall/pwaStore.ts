import { useSyncExternalStore } from "react";

const STORAGE_KEY = "gmx-pwa-nudges-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
export const NUDGE_SNOOZE_MS = 30 * DAY_MS;
/** The notifications offer waits until the person opens their 5th position on Arbitrum. */
export const NOTIFICATIONS_OFFER_FROM_POSITION = 5;

/** How a dismissable nudge was closed on this device: ✕ once hides it for 30 days, ✕ twice hides it for good. */
export type NudgeMemory = {
  dismissCount: number;
  hiddenUntil: number | null;
};

export type NotificationsState = "off" | "on" | "blocked";

type PersistedState = {
  installCard: NudgeMemory;
  notificationsOffer: NudgeMemory;
  isMenuDotSeen: boolean;
  /** GMX was installed from this browser (the browser reported it), so its install card and menu item go for good. */
  hasInstalled: boolean;
  /** When the welcome card first showed in the installed app. It shows during that first launch only. */
  welcomeShownAt: number | null;
  isWelcomeClosed: boolean;
  /**
   * Placeholder for the Notifications tab's state (useNotificationsContext): the offer shows only while that
   * status is "notAsked"; "blocked" (the person refused the browser's prompt) ends the offer for good.
   */
  notifications: NotificationsState;
  /** Placeholder count of positions opened on Arbitrum. The build task takes it from the connected account's history. */
  arbitrumPositionsOpened: number;
};

/** Reset when the page reloads and when the connected account changes. */
type SessionState = {
  /** An order executed in this session for the connected account, or a return visit by someone who traded before. */
  hasCompletedTrade: boolean;
  /** A position opened on Arbitrum in this session for the connected account. */
  hasOpenArbitrumPosition: boolean;
  /** A nudge was closed or acted on in this session, so no other nudge follows until the next session. */
  isNudgeDoneThisSession: boolean;
  /** The first launch's session, in which the welcome card stays until closed. */
  isWelcomeSessionActive: boolean;
  isInstallSheetOpen: boolean;
  isCopyLinkCardOpen: boolean;
  isNotificationsOnCardVisible: boolean;
};

export type PwaState = PersistedState & SessionState;

const EMPTY_NUDGE: NudgeMemory = { dismissCount: 0, hiddenUntil: null };

const DEFAULT_PERSISTED: PersistedState = {
  installCard: EMPTY_NUDGE,
  notificationsOffer: EMPTY_NUDGE,
  isMenuDotSeen: false,
  hasInstalled: false,
  welcomeShownAt: null,
  isWelcomeClosed: false,
  notifications: "off",
  arbitrumPositionsOpened: 0,
};

export const DEFAULT_SESSION: SessionState = {
  hasCompletedTrade: false,
  hasOpenArbitrumPosition: false,
  isNudgeDoneThisSession: false,
  isWelcomeSessionActive: false,
  isInstallSheetOpen: false,
  isCopyLinkCardOpen: false,
  isNotificationsOnCardVisible: false,
};

function readPersisted(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PERSISTED, ...JSON.parse(raw) } : DEFAULT_PERSISTED;
  } catch {
    return DEFAULT_PERSISTED;
  }
}

function writePersisted(state: PwaState) {
  try {
    const persisted: PersistedState = {
      installCard: state.installCard,
      notificationsOffer: state.notificationsOffer,
      isMenuDotSeen: state.isMenuDotSeen,
      hasInstalled: state.hasInstalled,
      welcomeShownAt: state.welcomeShownAt,
      isWelcomeClosed: state.isWelcomeClosed,
      notifications: state.notifications,
      arbitrumPositionsOpened: state.arbitrumPositionsOpened,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage can be blocked (private mode); the nudges then follow the session only.
  }
}

let state: PwaState = { ...DEFAULT_PERSISTED, ...DEFAULT_SESSION, ...readPersisted() };
const listeners = new Set<() => void>();

export function getPwaState() {
  return state;
}

export function setPwaState(update: Partial<PwaState> | ((prev: PwaState) => Partial<PwaState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  writePersisted(state);
  listeners.forEach((listener) => listener());
}

export function resetPwaState() {
  state = { ...DEFAULT_PERSISTED, ...DEFAULT_SESSION };
  writePersisted(state);
  listeners.forEach((listener) => listener());
}

/** A new account starts a new session: its moments and closed nudges don't carry over. */
export function resetPwaSession() {
  setPwaState({ ...DEFAULT_SESSION, isWelcomeSessionActive: state.isWelcomeSessionActive });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePwaState() {
  return useSyncExternalStore(subscribe, getPwaState, getPwaState);
}

export function getIsNudgeHidden(memory: NudgeMemory, now = Date.now()) {
  if (memory.dismissCount >= 2) return true;
  return memory.hiddenUntil !== null && now < memory.hiddenUntil;
}

export function getDismissedNudge(memory: NudgeMemory, now = Date.now()): NudgeMemory {
  const dismissCount = memory.dismissCount + 1;
  return { dismissCount, hiddenUntil: dismissCount >= 2 ? null : now + NUDGE_SNOOZE_MS };
}
