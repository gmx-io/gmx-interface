import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EventData } from "config/events";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { useWhatsNewAnnouncements } from "./useWhatsNewAnnouncements";

const AUTO_ROTATE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;
const WHEEL_MIN_DELTA_PX = 4;
const WHEEL_STEP_INTERVAL_MS = 350;
const EMULATED_MOUSE_AFTER_TOUCH_MS = 500;
const WHATS_NEW_LABEL = <Trans>What's new</Trans>;
const SEE_MORE_LABEL = <Trans>See more</Trans>;

export function WhatsNewToast() {
  const { cards, dismiss } = useWhatsNewAnnouncements();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= cards.length && cards.length > 0) {
      setActiveIndex(0);
    }
  }, [cards.length, activeIndex]);

  useEffect(() => {
    if (cards.length <= 1 || isPaused) return;
    const id = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [cards.length, isPaused, activeIndex]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchEndRef = useRef(0);

  const handleMouseEnter = useCallback(() => {
    if (performance.now() - lastTouchEndRef.current < EMULATED_MOUSE_AFTER_TOUCH_MS) return;
    setIsPaused(true);
  }, []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);
  const handleDotClick = useCallback((index: number) => setActiveIndex(index), []);

  const goRelative = useCallback(
    (direction: 1 | -1) => setActiveIndex((prev) => (prev + direction + cards.length) % cards.length),
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
      lastTouchEndRef.current = performance.now();
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
      const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (Math.abs(delta) < WHEEL_MIN_DELTA_PX) return;

      e.preventDefault();

      const now = performance.now();
      if (now - lastWheelStepRef.current < WHEEL_STEP_INTERVAL_MS) return;
      lastWheelStepRef.current = now;
      goRelative(delta > 0 ? 1 : -1);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [cards.length, goRelative]);

  const safeIndex = cards.length > 0 ? Math.min(activeIndex, cards.length - 1) : 0;
  const current = cards[safeIndex];

  const footerLink = useMemo(
    () =>
      current && !current.requiresOpenPosition
        ? {
            text: SEE_MORE_LABEL,
            to: `/announcements?id=${encodeURIComponent(current.id)}`,
          }
        : undefined,
    [current]
  );

  const dots = useMemo(
    () => ({
      count: cards.length,
      activeIndex: safeIndex,
      onDotClick: handleDotClick,
    }),
    [cards.length, safeIndex, handleDotClick]
  );

  if (cards.length === 0 || !current) return null;

  const isCarousel = cards.length > 1;

  return (
    <div
      ref={containerRef}
      className={cx(isCarousel && "touch-pan-y")}
      role={isCarousel ? "region" : undefined}
      aria-roledescription={isCarousel ? "carousel" : undefined}
      aria-label={isCarousel ? t`What's new` : undefined}
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
        headerLabel={WHATS_NEW_LABEL}
        headerIcon="info"
        onClose={dismiss}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        footerLink={footerLink}
        dots={dots}
      >
        <CardContent event={current} variant={current.variant ?? "info"} />
      </AnnouncementBanner>
    </div>
  );
}

function CardContent({ event, variant }: { event: EventData; variant: NonNullable<EventData["variant"]> }) {
  const titleColor = {
    info: "text-blue-300",
    warning: "text-yellow-300",
    error: "text-red-100",
    success: "text-green-300",
  }[variant];

  return (
    <div>
      <p className={cx("text-body-medium mb-4 font-medium", titleColor)}>{event.title}</p>
      <div className="text-body-medium line-clamp-3 text-typography-primary">{event.description}</div>
    </div>
  );
}
