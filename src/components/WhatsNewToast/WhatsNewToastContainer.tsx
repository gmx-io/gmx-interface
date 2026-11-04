import { Trans } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { isSolanaNetwork } from "config/chains";
import { useClosingPoolsLpNotice } from "domain/synthetics/markets/useClosingPoolsLpNotice";
import { useClosingPoolsNotices } from "domain/synthetics/markets/useClosingPoolsNotices";
import { useUiFlagEvents } from "domain/synthetics/uiFlags/useUiFlagEvents";
import { useChainId } from "lib/chains";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";
import { useAppUpdateBanner } from "components/AppUpdateBanner/useAppUpdateBanner";
import { BalancerProgramAnnouncement } from "components/BalancerProgramAnnouncement/BalancerProgramAnnouncement";
import { BALANCER_PROGRAM_ANNOUNCEMENT_CAMPAIGN } from "components/BalancerProgramAnnouncement/balancerProgramAnnouncementCampaign";
import { ClosingPoolsLpNoticeBanner } from "components/ClosingPoolsLpNotice/ClosingPoolsLpNoticeBanner";
import { ClosingPoolsNotice } from "components/ClosingPoolsNotice/ClosingPoolsNotice";
import { DelistingBanner } from "components/DelistingExitAnnouncements/DelistingBanner";
import { useDelistingExitAnnouncements } from "components/DelistingExitAnnouncements/useDelistingExitAnnouncements";
import { useTargetedAnnouncement } from "components/TargetedAnnouncement/useTargetedAnnouncement";
import { UsdgPoolsAnnouncement } from "components/UsdgPoolsAnnouncement/UsdgPoolsAnnouncement";
import { USDG_POOLS_ANNOUNCEMENT_CAMPAIGN } from "components/UsdgPoolsAnnouncement/usdgPoolsAnnouncementCampaign";
import { useWalletExtensionConnectionBanner } from "components/WalletExtensionConnectionBanner/useWalletExtensionConnectionBanner";

import { useWhatsNewAnnouncements } from "./useWhatsNewAnnouncements";
import { WhatsNewToast } from "./WhatsNewToast";

const APP_UPDATE_RELOAD_LABEL = <Trans>Reload now</Trans>;

const MOTION_INITIAL = { opacity: 0, y: -8, height: 0, overflow: "hidden" } as const;
const MOTION_ANIMATE = {
  opacity: 1,
  y: 0,
  height: "auto",
  overflow: "visible",
  transition: { duration: 0.2, ease: "easeInOut", overflow: { delay: 0.2 } },
} as const;
const MOTION_EXIT = {
  opacity: 0,
  y: -8,
  height: 0,
  overflow: "hidden",
  transition: { duration: 0.2, ease: "easeInOut" },
} as const;

function EvmAnnouncementToasts({
  isAnnouncementsPage,
  appUpdate,
  walletExtension,
}: {
  isAnnouncementsPage: boolean;
  appUpdate: ReactNode;
  walletExtension: ReactNode;
}) {
  const activeUiFlagEvents = useUiFlagEvents();
  const { cards, dismiss } = useWhatsNewAnnouncements();
  const { announcements: delistingAnnouncements, dismiss: dismissDelisting } = useDelistingExitAnnouncements();
  const { notices: closingPoolsNotices, markSeen: markClosingPoolsNoticeSeen } = useClosingPoolsNotices();
  const { isVisible: isUsdgPoolsAnnouncementVisible, dismiss: dismissUsdgPoolsAnnouncement } = useTargetedAnnouncement(
    USDG_POOLS_ANNOUNCEMENT_CAMPAIGN
  );
  const { isVisible: isBalancerProgramAnnouncementVisible, dismiss: dismissBalancerProgramAnnouncement } =
    useTargetedAnnouncement(BALANCER_PROGRAM_ANNOUNCEMENT_CAMPAIGN);
  const { notice: closingPoolsLpNotice, dismiss: dismissClosingPoolsLpNotice } = useClosingPoolsLpNotice();

  const warningUiFlagEvents = activeUiFlagEvents.filter(
    (event) => event.data.variant === "warning" || event.data.variant === "error"
  );
  const genericUiFlagEvents = activeUiFlagEvents.filter(
    (event) => event.data.variant !== "warning" && event.data.variant !== "error"
  );

  useEffect(() => {
    if (isAnnouncementsPage) dismiss();
  }, [isAnnouncementsPage, dismiss]);

  return (
    <AnimatePresence initial={false}>
      {delistingAnnouncements.map((item) => (
        <motion.div key={item.id} initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <DelistingBanner item={item} onDismiss={dismissDelisting} />
          </div>
        </motion.div>
      ))}
      {delistingAnnouncements.length === 0 &&
        closingPoolsNotices.map((notice) => (
          <motion.div
            key={notice.isClosed ? "closing-pools-closed" : "closing-pools"}
            initial={MOTION_INITIAL}
            animate={MOTION_ANIMATE}
            exit={MOTION_EXIT}
          >
            <div className="pb-12">
              <ClosingPoolsNotice notice={notice} onClose={() => markClosingPoolsNoticeSeen(notice)} />
            </div>
          </motion.div>
        ))}
      {warningUiFlagEvents.map((event) => (
        <motion.div key={event.data.id} initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <AnnouncementBanner
              className="pointer-events-auto"
              variant={event.data.variant}
              headerLabel={event.data.title}
              headerIcon="alert"
              onClose={event.dismiss}
            >
              {event.data.content}
            </AnnouncementBanner>
          </div>
        </motion.div>
      ))}
      {closingPoolsLpNotice && (
        <motion.div key="closing-pools-lp" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <ClosingPoolsLpNoticeBanner notice={closingPoolsLpNotice} onDismiss={dismissClosingPoolsLpNotice} />
          </div>
        </motion.div>
      )}
      {appUpdate}
      {isUsdgPoolsAnnouncementVisible && !isAnnouncementsPage && (
        <motion.div key="usdg-pools" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <UsdgPoolsAnnouncement onDismiss={dismissUsdgPoolsAnnouncement} />
          </div>
        </motion.div>
      )}
      {isBalancerProgramAnnouncementVisible && (
        <motion.div key="balancer-program" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <BalancerProgramAnnouncement onDismiss={dismissBalancerProgramAnnouncement} />
          </div>
        </motion.div>
      )}
      {genericUiFlagEvents.map((event) => (
        <motion.div key={event.data.id} initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <div className="pb-12">
            <AnnouncementBanner
              className="pointer-events-auto"
              variant={event.data.variant}
              headerLabel={event.data.title}
              headerIcon="alert"
              onClose={event.dismiss}
            >
              {event.data.content}
            </AnnouncementBanner>
          </div>
        </motion.div>
      ))}
      {walletExtension}
      {cards.length > 0 && !isAnnouncementsPage && (
        <motion.div key="whats-new" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          <WhatsNewToast cards={cards} dismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function WhatsNewToastContainer() {
  const { networkId } = useChainId();
  const [isScrolled, setIsScrolled] = useState(false);
  const { pathname } = useLocation();
  const isAnnouncementsPage = pathname === "/announcements";
  const { isVisible: isWalletExtensionBannerVisible, dismiss: dismissWalletExtensionBanner } =
    useWalletExtensionConnectionBanner(pathname);
  const { isVisible: isAppUpdateVisible, dismiss: dismissAppUpdate, applyUpdate } = useAppUpdateBanner();
  const appUpdateFooterLink = useMemo(() => ({ text: APP_UPDATE_RELOAD_LABEL, onClick: applyUpdate }), [applyUpdate]);
  const appUpdate = isAppUpdateVisible ? (
    <motion.div key="app-update" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
      <div className="pb-12">
        <AnnouncementBanner
          className="pointer-events-auto"
          variant="info"
          headerLabel={<Trans>Update available</Trans>}
          headerIcon="info"
          onClose={dismissAppUpdate}
          footerLink={appUpdateFooterLink}
        >
          <Trans>A new version of GMX is ready. Reload when you are done to switch to it.</Trans>
        </AnnouncementBanner>
      </div>
    </motion.div>
  ) : null;
  const walletExtension = isWalletExtensionBannerVisible ? (
    <motion.div key="wallet-extension-connection" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
      <div className="pb-12">
        <AnnouncementBanner
          className="pointer-events-auto"
          variant="info"
          headerLabel="Wallet connection"
          headerIcon="info"
          onClose={dismissWalletExtensionBanner}
        >
          Disable and reenable your wallet extension if you are having trouble connecting it.
        </AnnouncementBanner>
      </div>
    </motion.div>
  ) : null;

  useEffect(() => {
    setIsScrolled(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        // the capture-phase listener catches every scrollable element; only the AppPageLayout
        // page wrapper (scrollbar-gutter-stable) should move the toast, not inner widgets
        if (!target.classList.contains("scrollbar-gutter-stable")) return;
        setIsScrolled(target.scrollTop > 60);
      } else {
        setIsScrolled(window.scrollY > 60);
      }
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return (
    <div
      className={cx(
        "pointer-events-none fixed right-[calc(14px+var(--safe-area-inset-right))] top-[calc(56px+var(--safe-area-inset-top))] z-[801] transition-transform duration-200 will-change-transform",
        isScrolled && "-translate-y-[40px]"
      )}
      data-qa="whats-new-toast-container"
    >
      <div className="flex w-[400px] max-w-[calc(100vw-28px)] flex-col">
        {isSolanaNetwork(networkId) ? (
          <AnimatePresence initial={false}>
            {appUpdate}
            {walletExtension}
          </AnimatePresence>
        ) : (
          <EvmAnnouncementToasts
            isAnnouncementsPage={isAnnouncementsPage}
            appUpdate={appUpdate}
            walletExtension={walletExtension}
          />
        )}
      </div>
    </div>
  );
}
