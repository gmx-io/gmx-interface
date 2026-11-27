import { openBrowserInstallDialog } from "./installPrompt";
import { PwaPlatform } from "./pwaPlatform";
import { getDismissedNudge, setPwaState } from "./pwaStore";
import { pwaTesterHandlesBrowserDialog, pwaTesterHandlesPermission } from "./tester/pwaTester"; // rewards-tester

/** "Install app" in the menu and the button on the install card both start here. */
export async function startInstall(platform: PwaPlatform, source: "menu" | "card") {
  if (source === "menu") {
    setPwaState({ isMenuDotSeen: true });
  }

  if (platform === "in-app") {
    setPwaState({ isCopyLinkCardOpen: true });
    return;
  }

  if (platform === "android-chrome" || platform === "desktop-chromium") {
    if (pwaTesterHandlesBrowserDialog(source)) return; // rewards-tester
    const outcome = await openBrowserInstallDialog();

    if (outcome === "dismissed" && source === "card") {
      // Cancelling the browser's dialog counts as closing the card.
      dismissInstallCard();
    }

    if (outcome !== "unavailable") {
      return;
    }
  }

  if (source === "card") {
    // iPhone can't report the install, so opening the steps counts as acting on the card, like ✕.
    dismissInstallCard();
  }

  // iPhone, Mac Safari, or a browser that hasn't offered its dialog: show the steps.
  setPwaState({ isInstallSheetOpen: true });
}

export function dismissInstallCard() {
  setPwaState((prev) => ({ installCard: getDismissedNudge(prev.installCard), isNudgeDoneThisSession: true }));
}

export function dismissNotificationsOffer() {
  setPwaState((prev) => ({
    notificationsOffer: getDismissedNudge(prev.notificationsOffer),
    isNudgeDoneThisSession: true,
  }));
}

export function closeCopyLinkCard() {
  setPwaState({ isCopyLinkCardOpen: false, isNudgeDoneThisSession: true });
}

export function closeNotificationsOnCard() {
  setPwaState({ isNotificationsOnCardVisible: false, isNudgeDoneThisSession: true });
}

/**
 * The tap on "Turn on notifications" is what lets the browser show its permission prompt (Safari allows it only after a
 * tap). Placeholder for the build task, which connects it to the Notifications tab (useNotificationsContext):
 * - call turnOn(): the browser's prompt, then a wallet signature at the 10-device limit;
 * - status "on": show "Notifications are on";
 * - refused prompt ("blocked"): set notifications to "blocked", and the offer never returns;
 * - "turnOnFailed" or "limitReached": open Settings on the Notifications tab, where those states and "Try again" live.
 */
export function turnOnNotifications() {
  if (pwaTesterHandlesPermission()) return; // rewards-tester
  setPwaState({ notifications: "on", isNotificationsOnCardVisible: true, isNudgeDoneThisSession: true });
}

export function closeWelcomeCard() {
  setPwaState({ isWelcomeClosed: true, isNudgeDoneThisSession: true });
}

/** Moment for the install card. The build task calls this when an order executes for the connected account. */
export function recordCompletedTrade() {
  setPwaState({ hasCompletedTrade: true });
}

/**
 * Moment for the notifications offer: a position opened on Arbitrum. The offer appears from the 5th one.
 * The build task calls this when a position opens and takes the count from the connected account's history.
 */
export function recordArbitrumPositionOpened() {
  setPwaState((prev) => ({
    hasOpenArbitrumPosition: true,
    arbitrumPositionsOpened: prev.arbitrumPositionsOpened + 1,
  }));
}
