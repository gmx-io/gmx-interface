import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { useUiFlagEvents } from "domain/synthetics/uiFlags/useUiFlagEvents";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

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
  const [isScrolled, setIsScrolled] = useState(false);

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

  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      zIndex: 801,
      right: 23,
      top: 56,
      transform: isScrolled ? "translateY(-40px)" : "translateY(0)",
      transition: "transform 200ms ease",
      willChange: "transform",
    }),
    [isScrolled]
  );

  return (
    <div style={containerStyle} data-qa="whats-new-toast-container">
      <div className="flex w-[400px] max-w-[calc(100vw-46px)] flex-col gap-12">
        <AnimatePresence>
          {activeUiFlagEvents.map((event) => (
            <motion.div key={event.data.id} initial={MOTION_INITIAL} animate={MOTION_ANIMATE} exit={MOTION_EXIT}>
              <AnnouncementBanner
                variant={event.data.variant}
                headerLabel={event.data.title}
                headerIcon="alert"
                onClose={event.dismiss}
              >
                {event.data.content}
              </AnnouncementBanner>
            </motion.div>
          ))}
        </AnimatePresence>
        <WhatsNewToast />
      </div>
    </div>
  );
}
