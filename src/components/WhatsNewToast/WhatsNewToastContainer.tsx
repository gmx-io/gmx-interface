import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useUiFlagEvents } from "domain/synthetics/uiFlags/useUiFlagEvents";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { useWhatsNewAnnouncements } from "./useWhatsNewAnnouncements";
import { WhatsNewToast } from "./WhatsNewToast";

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

export function WhatsNewToastContainer() {
  const activeUiFlagEvents = useUiFlagEvents();
  const { cards, dismiss } = useWhatsNewAnnouncements();
  const [isScrolled, setIsScrolled] = useState(false);
  const { pathname } = useLocation();

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
        "pointer-events-none fixed right-[23px] top-[56px] z-[801] transition-transform duration-200 will-change-transform",
        isScrolled && "-translate-y-[40px]"
      )}
      data-qa="whats-new-toast-container"
    >
      <div className="flex w-[400px] max-w-[calc(100vw-46px)] flex-col">
        <AnimatePresence initial={false}>
          {activeUiFlagEvents.map((event) => (
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
          {cards.length > 0 && (
            <motion.div key="whats-new" initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
              <WhatsNewToast cards={cards} dismiss={dismiss} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
