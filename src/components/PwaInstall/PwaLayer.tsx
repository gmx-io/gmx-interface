import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useIsAutoReloadBlocked } from "lib/pwa/blockAutoReload";

import { InstallSheet } from "./InstallSheet";
import { closeCopyLinkCard, closeWelcomeCard, dismissInstallCard } from "./pwaActions";
import {
  CopyLinkCard,
  InstallCard,
  NotificationsOfferCard,
  NotificationsOnCard,
  WelcomeBanner,
  WelcomeCard,
} from "./PwaCards";
import { getCanShowInstallCard, getCanUseNotifications, getIsPwaInstallUiEnabled } from "./pwaPlatform";
import {
  getIsNudgeHidden,
  NOTIFICATIONS_OFFER_FROM_POSITION,
  resetPwaSession,
  setPwaState,
  usePwaState,
} from "./pwaStore";
import { useIsToastVisible } from "./useIsToastVisible";
import { usePwaEnvironment } from "./usePwaEnvironment";

/** The welcome card waits this long on first launch, so a restored wallet doesn't flip it between card and line. */
const WELCOME_SETTLE_MS = 1500;

export function PwaLayer() {
  if (!getIsPwaInstallUiEnabled()) {
    return null;
  }

  return <PwaLayerContent />;
}

/**
 * Shows at most one nudge at a time, in this order:
 * 1. Welcome card, during the first launch of the installed app only (one line instead if everything is already set up).
 * 2. "Notifications are on", right after turning them on.
 * 3. Copy link, when a wallet or messenger browser opens "Install app" from the menu.
 * 4. Notifications offer, when a position opens on Arbitrum, from the 5th one.
 * 5. Install card (Copy link in wallet browsers) after a completed trade or on a return visit by someone who traded
 *    before. Never on the first visit.
 * Once a nudge is closed or acted on, no other nudge follows in that session. Nudges wait while a transaction toast is
 * open or an order is pending, so they never show mid-order. On Android the offer wins; the install card waits.
 */
function PwaLayerContent() {
  const env = usePwaEnvironment();
  const state = usePwaState();
  const { platform, isInstalled } = env;
  const isToastVisible = useIsToastVisible();
  const isOrderPending = useIsAutoReloadBlocked();
  const isHeld = isToastVisible || isOrderPending;

  const setIsInstallSheetOpen = useCallback((isOpen: boolean) => setPwaState({ isInstallSheetOpen: isOpen }), []);

  // A new account starts a new session: its moments and closed nudges don't carry over.
  const previousAccount = useRef(env.account);
  useEffect(() => {
    if (previousAccount.current !== env.account) {
      previousAccount.current = env.account;
      resetPwaSession();
    }
  }, [env.account]);

  const isEverythingSetUp = env.isSignedIn && env.isFunded && env.isOneClickOn;
  const isWelcomeCandidate =
    isInstalled && !state.isWelcomeClosed && (state.welcomeShownAt === null || state.isWelcomeSessionActive);
  const [welcomeVariant, setWelcomeVariant] = useState<"card" | "banner" | null>(null);

  useEffect(() => {
    if (isInstalled && !state.isWelcomeClosed && state.welcomeShownAt === null) {
      setPwaState({ welcomeShownAt: Date.now(), isWelcomeSessionActive: true });
    }
  }, [isInstalled, state.isWelcomeClosed, state.welcomeShownAt]);

  useEffect(() => {
    if (!isWelcomeCandidate) {
      setWelcomeVariant(null);
      return;
    }
    if (welcomeVariant) return;

    const timer = window.setTimeout(() => setWelcomeVariant(isEverythingSetUp ? "banner" : "card"), WELCOME_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [isWelcomeCandidate, welcomeVariant, isEverythingSetUp]);

  // The card's job is done once every step is: it closes by itself instead of turning into the line.
  useEffect(() => {
    if (welcomeVariant === "card" && isEverythingSetUp) {
      closeWelcomeCard();
    }
  }, [welcomeVariant, isEverythingSetUp]);

  let card: ReactNode = null;

  if (isWelcomeCandidate) {
    if (welcomeVariant && !isHeld) {
      card = welcomeVariant === "banner" ? <WelcomeBanner /> : <WelcomeCard env={env} />;
    }
  } else if (state.isNotificationsOnCardVisible) {
    card = <NotificationsOnCard />;
  } else if (state.isCopyLinkCardOpen) {
    card = <CopyLinkCard onClose={closeCopyLinkCard} />;
  } else if (!state.isNudgeDoneThisSession && !isHeld) {
    if (
      getCanUseNotifications(platform, isInstalled) &&
      state.notifications === "off" &&
      state.hasOpenArbitrumPosition &&
      state.arbitrumPositionsOpened >= NOTIFICATIONS_OFFER_FROM_POSITION &&
      !getIsNudgeHidden(state.notificationsOffer)
    ) {
      card = <NotificationsOfferCard />;
    } else if (!isInstalled && !state.hasInstalled && state.hasCompletedTrade && !getIsNudgeHidden(state.installCard)) {
      if (platform === "in-app") {
        card = <CopyLinkCard onClose={dismissInstallCard} />;
      } else if (getCanShowInstallCard(platform)) {
        card = <InstallCard platform={platform} />;
      }
    }
  }

  return (
    <>
      {card}
      <InstallSheet
        platform={platform}
        iosVersion={env.iosVersion}
        isVisible={state.isInstallSheetOpen}
        setIsVisible={setIsInstallSheetOpen}
      />
    </>
  );
}
