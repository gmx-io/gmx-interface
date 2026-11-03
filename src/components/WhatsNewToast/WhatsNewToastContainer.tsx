import { Trans } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { isSolanaNetwork } from "config/chains";
import { useClosingPoolsLpNotice } from "domain/synthetics/markets/useClosingPoolsLpNotice";
import { useClosingPoolsNotices } from "domain/synthetics/markets/useClosingPoolsNotices";
import { ActiveUiFlagEvent, useUiFlagEvents } from "domain/synthetics/uiFlags/useUiFlagEvents";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { useChainId } from "lib/chains";
import { useIsInitialLoadSettled } from "lib/useIsInitialLoadSettled";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

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

import { useWhatsNewAnnouncements } from "./useWhatsNewAnnouncements";
import { WhatsNewToast } from "./WhatsNewToast";

const APP_UPDATE_RELOAD_LABEL = <Trans>Reload now</Trans>;
const INITIAL_LOAD_MAX_WAIT_MS = 5_000;

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

type TopRightMessage = {
  key: string;
  node: ReactNode;
};

function EvmAnnouncementToasts({
  isAnnouncementsPage,
  appUpdate,
}: {
  isAnnouncementsPage: boolean;
  appUpdate: TopRightMessage | undefined;
}) {
  const isWalletInitializing = useIsWalletInitializing();
  const { isLoading: isUiFlagsLoading } = useUiFlagsRequest();
  const uiFlagEvents = useUiFlagEvents();
  const delisting = useDelistingExitAnnouncements();
  const closingPools = useClosingPoolsNotices();
  const closingPoolsLp = useClosingPoolsLpNotice();
  const usdgPools = useTargetedAnnouncement(USDG_POOLS_ANNOUNCEMENT_CAMPAIGN);
  const balancerProgram = useTargetedAnnouncement(BALANCER_PROGRAM_ANNOUNCEMENT_CAMPAIGN);
  const whatsNew = useWhatsNewAnnouncements();

  const isInitialLoadSettled = useIsInitialLoadSettled(
    isWalletInitializing ||
      isUiFlagsLoading ||
      delisting.isLoading ||
      closingPools.isLoading ||
      closingPoolsLp.isLoading ||
      whatsNew.isLoading,
    INITIAL_LOAD_MAX_WAIT_MS
  );

  const outageWarnings: TopRightMessage[] = uiFlagEvents.filter(isOutageWarning).map(toUiFlagEventMessage);

  const fundsNotices: TopRightMessage[] = [
    ...delisting.announcements.map((item) => ({
      key: `delisting-${item.id}`,
      node: <DelistingBanner item={item} onDismiss={delisting.dismiss} />,
    })),
    ...closingPools.notices.map((notice) => ({
      key: notice.isClosed ? "closing-pools-closed" : "closing-pools",
      node: <ClosingPoolsNotice notice={notice} onClose={() => closingPools.markSeen(notice)} />,
    })),
    ...(closingPoolsLp.notice
      ? [
          {
            key: "closing-pools-lp",
            node: <ClosingPoolsLpNoticeBanner notice={closingPoolsLp.notice} onDismiss={closingPoolsLp.dismiss} />,
          },
        ]
      : []),
  ];

  const targetedMessages: TopRightMessage[] = [
    ...(usdgPools.isVisible && !isAnnouncementsPage
      ? [{ key: "usdg-pools", node: <UsdgPoolsAnnouncement onDismiss={usdgPools.dismiss} /> }]
      : []),
    ...(balancerProgram.isVisible
      ? [{ key: "balancer-program", node: <BalancerProgramAnnouncement onDismiss={balancerProgram.dismiss} /> }]
      : []),
  ];

  const appHints: TopRightMessage[] = [
    ...(appUpdate ? [appUpdate] : []),
    ...uiFlagEvents.filter((event) => !isOutageWarning(event)).map(toUiFlagEventMessage),
  ];

  const whatsNewMessages: TopRightMessage[] =
    whatsNew.cards.length > 0 && !isAnnouncementsPage
      ? [{ key: "whats-new", node: <WhatsNewToast cards={whatsNew.cards} onDismiss={whatsNew.dismiss} /> }]
      : [];

  const message = isInitialLoadSettled
    ? [...outageWarnings, ...fundsNotices, ...targetedMessages, ...appHints, ...whatsNewMessages][0]
    : undefined;

  return <TopRightMessageSlot message={message} />;
}

export function WhatsNewToastContainer() {
  const { networkId } = useChainId();
  const { pathname } = useLocation();
  const isAnnouncementsPage = pathname === "/announcements";
  const [isScrolled, setIsScrolled] = useState(false);
  const { isVisible: isAppUpdateVisible, dismiss: dismissAppUpdate, applyUpdate } = useAppUpdateBanner();
  const appUpdateFooterLink = useMemo(() => ({ text: APP_UPDATE_RELOAD_LABEL, onClick: applyUpdate }), [applyUpdate]);
  const appUpdate: TopRightMessage | undefined = isAppUpdateVisible
    ? {
        key: "app-update",
        node: (
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
        ),
      }
    : undefined;

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
          <TopRightMessageSlot message={appUpdate} />
        ) : (
          <EvmAnnouncementToasts isAnnouncementsPage={isAnnouncementsPage} appUpdate={appUpdate} />
        )}
      </div>
    </div>
  );
}

function TopRightMessageSlot({ message }: { message: TopRightMessage | undefined }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {message && (
        <motion.div key={message.key} initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
          {message.node}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isOutageWarning(event: ActiveUiFlagEvent) {
  return event.data.variant === "warning" || event.data.variant === "error";
}

function toUiFlagEventMessage(event: ActiveUiFlagEvent): TopRightMessage {
  return {
    key: `ui-flag-${event.data.id}`,
    node: (
      <AnnouncementBanner
        className="pointer-events-auto"
        variant={event.data.variant}
        headerLabel={event.data.title}
        headerIcon="alert"
        onClose={event.dismiss}
      >
        {event.data.content}
      </AnnouncementBanner>
    ),
  };
}
