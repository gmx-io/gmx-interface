import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EventData } from "config/events";

import { AnnouncementBanner } from "components/AnnouncementBanner/AnnouncementBanner";

import { useWhatsNewAnnouncements } from "./useWhatsNewAnnouncements";

const AUTO_ROTATE_INTERVAL_MS = 5000;
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
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [cards.length, isPaused]);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);
  const handleDotClick = useCallback((index: number) => setActiveIndex(index), []);

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

  return (
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
