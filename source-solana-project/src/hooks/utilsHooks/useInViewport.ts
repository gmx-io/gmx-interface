import { type RefObject, useEffect, useRef, useState } from 'react';

const APP_SCROLL_SELECTOR = '.App-content .overflow-y-auto';

type ScrollDirection = 'down' | 'up' | null;

type UseInViewportOptions = {
  /** Reveal when page scroll distance reaches this many vh from the top. */
  revealAfterScrollVh?: number;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Intersection ratio for anchor visibility. Default 0 (any pixel visible). */
  anchorThreshold?: number;
  /** When true, stay in view after the first reveal until unmount/refresh. Default true. */
  once?: boolean;
};

function resolvePageScrollTarget(): HTMLElement | Window {
  const appScroller = document.querySelector(APP_SCROLL_SELECTOR);
  if (appScroller instanceof HTMLElement) {
    return appScroller;
  }

  return window;
}

function resolvePageScrollRoot(): Element | null {
  const appScroller = document.querySelector(APP_SCROLL_SELECTOR);
  if (appScroller instanceof HTMLElement) {
    return appScroller;
  }

  return null;
}

function getScrollTop(scrollTarget: HTMLElement | Window) {
  if (scrollTarget instanceof Window) {
    return scrollTarget.scrollY;
  }

  return scrollTarget.scrollTop;
}

function scrollVhToPx(vh: number) {
  return (vh / 100) * window.innerHeight;
}

export function useInViewport(options: UseInViewportOptions = {}) {
  const {
    revealAfterScrollVh = 20,
    anchorRef,
    anchorThreshold = 0,
    once = true,
  } = options;
  const [isInView, setIsInView] = useState(false);
  const anchorIntersectingRef = useRef(false);
  const isLatchedRef = useRef(false);
  const hasBeenInViewRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirectionRef = useRef<ScrollDirection>(null);

  useEffect(() => {
    const scrollTarget = resolvePageScrollTarget();
    const scrollRoot = resolvePageScrollRoot();
    const thresholdPx = scrollVhToPx(revealAfterScrollVh);

    const syncInView = () => {
      if (once && hasBeenInViewRef.current) {
        setIsInView(true);
        return;
      }

      const scrollTop = getScrollTop(scrollTarget);
      const direction: ScrollDirection =
        scrollTop > lastScrollTopRef.current
          ? 'down'
          : scrollTop < lastScrollTopRef.current
            ? 'up'
            : lastScrollDirectionRef.current;

      lastScrollTopRef.current = scrollTop;
      lastScrollDirectionRef.current = direction;

      const scrollPastThreshold = scrollTop >= thresholdPx;

      if (!scrollPastThreshold) {
        isLatchedRef.current = false;
        setIsInView(false);
        return;
      }

      if (isLatchedRef.current) {
        setIsInView(true);
        return;
      }

      if (!anchorRef) {
        isLatchedRef.current = true;
        hasBeenInViewRef.current = true;
        setIsInView(true);
        return;
      }

      const shouldReveal =
        anchorIntersectingRef.current && direction !== 'up';

      if (shouldReveal) {
        isLatchedRef.current = true;
        hasBeenInViewRef.current = true;
      }

      setIsInView(shouldReveal);
    };

    lastScrollTopRef.current = getScrollTop(scrollTarget);
    syncInView();

    scrollTarget.addEventListener('scroll', syncInView, { passive: true });
    window.addEventListener('resize', syncInView, { passive: true });

    const anchorElement = anchorRef?.current ?? null;
    let observer: IntersectionObserver | undefined;

    if (anchorElement) {
      observer = new IntersectionObserver(
        ([entry]) => {
          anchorIntersectingRef.current = entry.isIntersecting;
          syncInView();
        },
        {
          root: scrollRoot,
          threshold: anchorThreshold,
        }
      );

      observer.observe(anchorElement);
    }

    return () => {
      scrollTarget.removeEventListener('scroll', syncInView);
      window.removeEventListener('resize', syncInView);
      observer?.disconnect();
    };
  }, [anchorRef, anchorThreshold, once, revealAfterScrollVh]);

  return { isInView };
}
