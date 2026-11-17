import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence, motion, useIsPresent, Variants } from "framer-motion";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EventData, EventLink } from "config/events";
import { usePrefersReducedMotion } from "lib/usePrefersReducedMotion";

import {
  AnnouncementBanner,
  AnnouncementFooterLink,
  AnnouncementFooterLinkData,
} from "components/AnnouncementBanner/AnnouncementBanner";

import { INITIAL_SLIDE_STATE, SlideDirection, jumpToSlide, stepSlide } from "./whatsNewSlideState";

const AUTO_ROTATE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;
const WHEEL_MIN_DELTA_PX = 4;
const WHEEL_STEP_INTERVAL_MS = 350;
const SLIDE_ENTER_OFFSET_PX = 12;
const SLIDE_EXIT_OFFSET_PX = 8;
const SEE_MORE_LABEL = <Trans>See more</Trans>;

const SLIDE_VARIANTS: Variants = {
  enter: (shift: number) => ({ opacity: 0, x: shift * SLIDE_ENTER_OFFSET_PX }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      opacity: { duration: 0.18, ease: "linear" },
      x: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
    },
  },
  exit: (shift: number) => ({
    opacity: 0,
    x: -shift * SLIDE_EXIT_OFFSET_PX,
    transition: { duration: 0.12, ease: "easeIn" },
  }),
};

export function WhatsNewToast({ cards, onDismiss }: { cards: EventData[]; onDismiss: (id: string) => void }) {
  const [slide, setSlide] = useState(INITIAL_SLIDE_STATE);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const activeIndex = slide.index < cards.length ? slide.index : 0;
  const current: EventData | undefined = cards[activeIndex];
  const currentId = current?.id;

  useEffect(() => {
    if (slide.index >= cards.length && cards.length > 0) {
      setSlide(INITIAL_SLIDE_STATE);
    }
  }, [cards.length, slide.index]);

  useEffect(() => {
    if (cards.length <= 1 || isPaused) return;
    const id = window.setTimeout(() => {
      setSlide((prev) => stepSlide(prev, 1, cards.length));
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [cards.length, isPaused, currentId]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setIsPaused(true);
  }, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setIsPaused(false);
  }, []);
  const handleDotClick = useCallback((index: number) => setSlide((prev) => jumpToSlide(prev, index)), []);

  const goRelative = useCallback(
    (step: SlideDirection) => setSlide((prev) => stepSlide(prev, step, cards.length)),
    [cards.length]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goRelative(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goRelative(-1);
      }
    },
    [goRelative]
  );

  const handleFocus = useCallback(() => setIsPaused(true), []);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsPaused(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsPaused(true);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      setIsPaused(false);
      if (!start || cards.length <= 1) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;

      goRelative(dx < 0 ? 1 : -1);
    },
    [cards.length, goRelative]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelStepRef = useRef(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || cards.length <= 1) return;

    lastWheelStepRef.current = 0;

    const onWheel = (e: WheelEvent) => {
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        const page = node.clientHeight || 400;
        dx *= page;
        dy *= page;
      }
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < WHEEL_MIN_DELTA_PX) return;

      e.preventDefault();

      const now = performance.now();
      if (now - lastWheelStepRef.current < WHEEL_STEP_INTERVAL_MS) return;
      lastWheelStepRef.current = now;
      goRelative(dx > 0 ? 1 : -1);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [cards.length, goRelative]);

  const handleClose = useCallback(() => {
    if (currentId === undefined) return;
    setSlide((prev) => ({ ...prev, direction: 1 }));
    onDismiss(currentId);
  }, [currentId, onDismiss]);

  const renderFooterLinks = useCallback(
    (card: EventData) => <FooterLinks event={card} onSeeMore={onDismiss} />,
    [onDismiss]
  );

  const dots = useMemo(
    () => ({
      count: cards.length,
      activeIndex,
      onDotClick: handleDotClick,
    }),
    [cards.length, activeIndex, handleDotClick]
  );

  if (!current) return null;

  const isCarousel = cards.length > 1;
  const slideShift = prefersReducedMotion ? 0 : slide.direction;
  const hasFooterLinks = cards.some((card) => card.link || !card.requiresOpenPosition);

  return (
    <div
      ref={containerRef}
      className={cx("pointer-events-auto", isCarousel && "touch-pan-y")}
      role="region"
      aria-roledescription={isCarousel ? "carousel" : undefined}
      aria-label={t`What's new`}
      tabIndex={isCarousel ? 0 : undefined}
      onKeyDown={isCarousel ? handleKeyDown : undefined}
      onFocus={isCarousel ? handleFocus : undefined}
      onBlur={isCarousel ? handleBlur : undefined}
      onTouchStart={isCarousel ? handleTouchStart : undefined}
      onTouchEnd={isCarousel ? handleTouchEnd : undefined}
    >
      {isCarousel && (
        <span className="sr-only" aria-live="polite" aria-atomic>
          {current.title}
        </span>
      )}
      <AnnouncementBanner
        variant={current.variant ?? "info"}
        headerLabel={
          <SlideStack cards={cards} current={current} shift={slideShift} slideClassName="self-center">
            {renderTitle}
          </SlideStack>
        }
        headerIcon="info"
        truncateHeader={false}
        onClose={handleClose}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        footerContent={
          hasFooterLinks ? (
            <SlideStack cards={cards} current={current} shift={slideShift}>
              {renderFooterLinks}
            </SlideStack>
          ) : undefined
        }
        dots={dots}
      >
        <SlideStack cards={cards} current={current} shift={slideShift}>
          {renderBody}
        </SlideStack>
      </AnnouncementBanner>
    </div>
  );
}

function SlideStack({
  cards,
  current,
  shift,
  slideClassName,
  children,
}: {
  cards: EventData[];
  current: EventData;
  shift: number;
  slideClassName?: string;
  children: (event: EventData) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-1">
      {cards.length > 1 &&
        cards.map((card) => (
          <div key={card.id} aria-hidden className={cx("invisible col-start-1 row-start-1", slideClassName)}>
            {children(card)}
          </div>
        ))}
      <AnimatePresence initial={false} custom={shift}>
        <Slide key={current.id} shift={shift} className={slideClassName}>
          {children(current)}
        </Slide>
      </AnimatePresence>
    </div>
  );
}

function Slide({ shift, className, children }: { shift: number; className?: string; children: ReactNode }) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      className={cx("col-start-1 row-start-1", className, !isPresent && "pointer-events-none")}
      aria-hidden={isPresent ? undefined : true}
      custom={shift}
      variants={SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      data-qa="whats-new-slide"
    >
      {children}
    </motion.div>
  );
}

function renderTitle(event: EventData) {
  return <div className="line-clamp-2">{event.title}</div>;
}

function renderBody(event: EventData) {
  return <div className="line-clamp-4">{event.summary ?? event.description}</div>;
}

function FooterLinks({ event, onSeeMore }: { event: EventData; onSeeMore: (id: string) => void }) {
  const variant = event.variant ?? "info";
  const ownLink = useMemo(() => (event.link ? getOwnLink(event.link) : undefined), [event.link]);
  const seeMoreLink = useMemo(
    () =>
      event.requiresOpenPosition
        ? undefined
        : {
            text: SEE_MORE_LABEL,
            to: `/announcements?id=${encodeURIComponent(event.id)}`,
            onClick: () => onSeeMore(event.id),
          },
    [event.id, event.requiresOpenPosition, onSeeMore]
  );

  return (
    <div className="flex flex-wrap items-center gap-x-16 gap-y-4">
      {ownLink && <AnnouncementFooterLink variant={variant} link={ownLink} />}
      {seeMoreLink && <AnnouncementFooterLink variant={variant} link={seeMoreLink} isSecondary />}
    </div>
  );
}

function getOwnLink(link: EventLink): AnnouncementFooterLinkData {
  return link.href.startsWith("http") ? { text: link.text, href: link.href } : { text: link.text, to: link.href };
}
