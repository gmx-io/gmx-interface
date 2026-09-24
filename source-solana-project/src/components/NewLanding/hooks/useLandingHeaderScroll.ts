import { type RefObject, useEffect, useRef, useState } from 'react';

const SCROLL_HIDE_DELAY_MS = 180;
const SCROLL_SHOW_UP_THRESHOLD_PX = 60;
const AT_TOP_THRESHOLD_PX = 1;
const SCROLL_DIRECTION_THRESHOLD_PX = 4;
const APP_SCROLL_SELECTOR = '.App-content .overflow-y-auto';

function resolveScrollTarget(headerEl: HTMLElement | null): HTMLElement | Window {
  const fromClosest = headerEl?.closest('.overflow-y-auto');
  if (fromClosest instanceof HTMLElement) {
    return fromClosest;
  }

  const appScroller = document.querySelector(APP_SCROLL_SELECTOR);
  if (appScroller instanceof HTMLElement) {
    return appScroller;
  }

  if (headerEl) {
    let parent = headerEl.parentElement;

    while (parent) {
      const { overflowY } = getComputedStyle(parent);
      const isScrollableOverflow =
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay';

      if (isScrollableOverflow && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      parent = parent.parentElement;
    }
  }

  return window;
}

function getScrollTop(scrollTarget: HTMLElement | Window) {
  if (scrollTarget instanceof Window) {
    return scrollTarget.scrollY;
  }

  return scrollTarget.scrollTop;
}

function getEffectiveScrollTop(scrollTargets: (HTMLElement | Window)[]) {
  return scrollTargets.reduce(
    (maxScrollTop, target) => Math.max(maxScrollTop, getScrollTop(target)),
    0
  );
}

function resolveScrollTargets(
  headerEl: HTMLElement | null
): (HTMLElement | Window)[] {
  const primary = resolveScrollTarget(headerEl);
  const targets: (HTMLElement | Window)[] = [window];

  if (primary !== window) {
    targets.unshift(primary);
  }

  return targets;
}

export function useLandingHeaderScroll(
  headerRef: RefObject<HTMLElement | null>
) {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const headerEl = headerRef.current;
    const scrollTargets = resolveScrollTargets(headerEl);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let upScrollAccumPx = 0;

    const clearHideTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    };

    const scheduleHide = () => {
      if (hideTimer) {
        return;
      }

      hideTimer = setTimeout(() => {
        setIsVisible(false);
        hideTimer = undefined;
      }, SCROLL_HIDE_DELAY_MS);
    };

    const updateScrollState = () => {
      const scrollTop = getEffectiveScrollTop(scrollTargets);
      lastScrollTopRef.current = scrollTop;
      setIsAtTop(scrollTop <= AT_TOP_THRESHOLD_PX);
    };

    const handleScroll = () => {
      const scrollTop = getEffectiveScrollTop(scrollTargets);
      const atTop = scrollTop <= AT_TOP_THRESHOLD_PX;
      setIsAtTop(atTop);

      if (atTop) {
        clearHideTimer();
        upScrollAccumPx = 0;
        setIsVisible(true);
        lastScrollTopRef.current = scrollTop;
        return;
      }

      const delta = scrollTop - lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (delta > SCROLL_DIRECTION_THRESHOLD_PX) {
        upScrollAccumPx = 0;
        scheduleHide();
        return;
      }

      if (delta < -SCROLL_DIRECTION_THRESHOLD_PX) {
        upScrollAccumPx += Math.abs(delta);

        if (upScrollAccumPx >= SCROLL_SHOW_UP_THRESHOLD_PX) {
          clearHideTimer();
          setIsVisible(true);
          upScrollAccumPx = 0;
        }
      }
    };

    updateScrollState();
    scrollTargets.forEach((target) => {
      target.addEventListener('scroll', handleScroll, { passive: true });
    });

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });

    scrollTargets.forEach((target) => {
      if (target instanceof HTMLElement) {
        resizeObserver.observe(target);
      }
    });

    return () => {
      scrollTargets.forEach((target) => {
        target.removeEventListener('scroll', handleScroll);
      });
      clearHideTimer();
      resizeObserver.disconnect();
    };
  }, [headerRef]);

  return { isAtTop, isVisible, showGlass: !isAtTop };
}
