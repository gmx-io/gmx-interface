import { type RefObject, useEffect, useRef, useState } from 'react';

const APP_SCROLL_SELECTOR = '.App-content .overflow-y-auto';

type ScrollDirection = 'down' | 'up' | null;

type UseScrollThresholdRevealOptions = {
  thresholdPx?: number;
  thresholdVh?: number;
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  enabled?: boolean;
  resetRef?: RefObject<HTMLElement | null>;
  /** When true, reset when the anchor element leaves the viewport (same as resetRef). */
  resetUsesAnchor?: boolean;
  /**
   * When true, resetRef only hides after the target has entered the viewport at least once
   * since the last reveal. Avoids resetting while the target is still below the fold.
   */
  resetRequiresPriorIntersection?: boolean;
  /** When true, stay revealed after the first reveal until unmount/refresh. Default true. */
  once?: boolean;
};

function resolveThresholdScrollPx(
  thresholdPx: number | undefined,
  thresholdVh: number | undefined
) {
  if (thresholdVh !== undefined) {
    if (typeof window === 'undefined') {
      return 0;
    }

    return window.innerHeight * (thresholdVh / 100);
  }

  return thresholdPx ?? 0;
}

function resolveScrollRoot(element: HTMLElement | null): HTMLElement | null {
  const fromClosest = element?.closest('.overflow-y-auto');
  if (fromClosest instanceof HTMLElement) {
    return fromClosest;
  }

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

function resolveScrollTarget(
  element: HTMLElement,
  rootOption: Element | null | undefined
): HTMLElement | Window {
  if (rootOption instanceof HTMLElement) {
    return rootOption;
  }

  const scrollRoot = resolveScrollRoot(element);
  return scrollRoot ?? window;
}

export function useScrollThresholdReveal<
  T extends HTMLElement = HTMLDivElement,
>(options: UseScrollThresholdRevealOptions = {}) {
  const {
    thresholdPx,
    thresholdVh,
    threshold = 0.15,
    rootMargin = '0px',
    root: rootOption,
    enabled = true,
    resetRef,
    resetUsesAnchor = false,
    resetRequiresPriorIntersection = false,
    once = true,
  } = options;

  const [thresholdScrollPx, setThresholdScrollPx] = useState(() =>
    resolveThresholdScrollPx(thresholdPx, thresholdVh)
  );

  const ref = useRef<T | null>(null);
  const entryScrollTopRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirectionRef = useRef<ScrollDirection>(null);
  const isLatchedRef = useRef(false);
  const isInViewportRef = useRef(false);
  const hasCompletedRevealRef = useRef(false);
  const resetAllStateRef = useRef<() => void>(() => undefined);

  const [isInViewport, setIsInViewport] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (thresholdVh === undefined) {
      setThresholdScrollPx(thresholdPx ?? 0);
      return;
    }

    const updateThresholdScrollPx = () => {
      setThresholdScrollPx(resolveThresholdScrollPx(thresholdPx, thresholdVh));
    };

    updateThresholdScrollPx();
    window.addEventListener('resize', updateThresholdScrollPx);

    return () => {
      window.removeEventListener('resize', updateThresholdScrollPx);
    };
  }, [thresholdPx, thresholdVh]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      return;
    }

    const resetAllState = () => {
      if (once && hasCompletedRevealRef.current) {
        return;
      }

      entryScrollTopRef.current = null;
      isLatchedRef.current = false;
      setIsRevealed(false);
    };

    resetAllStateRef.current = resetAllState;

    const scrollRoot =
      rootOption !== undefined ? rootOption : resolveScrollRoot(element);
    const scrollTarget = resolveScrollTarget(element, rootOption);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrollTop = getScrollTop(scrollTarget);
        const direction: ScrollDirection =
          scrollTop > lastScrollTopRef.current
            ? 'down'
            : scrollTop < lastScrollTopRef.current
              ? 'up'
              : lastScrollDirectionRef.current;

        lastScrollTopRef.current = scrollTop;
        lastScrollDirectionRef.current = direction;
        isInViewportRef.current = entry.isIntersecting;
        setIsInViewport(entry.isIntersecting);

        if (entry.isIntersecting) {
          if (entryScrollTopRef.current === null && !isLatchedRef.current) {
            entryScrollTopRef.current = scrollTop;
          }
          return;
        }

        if (direction === 'up' && !(once && hasCompletedRevealRef.current)) {
          resetAllState();
        }
      },
      {
        root: scrollRoot,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, once, rootMargin, rootOption, threshold]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      return;
    }

    const scrollTarget = resolveScrollTarget(element, rootOption);
    lastScrollTopRef.current = getScrollTop(scrollTarget);
    lastScrollDirectionRef.current = null;

    const setRevealed = (revealed: boolean) => {
      if (revealed) {
        hasCompletedRevealRef.current = true;
      }
      setIsRevealed(revealed);
    };

    const updateReveal = () => {
      if (once && hasCompletedRevealRef.current) {
        setIsRevealed(true);
        return;
      }

      const scrollTop = getScrollTop(scrollTarget);
      const direction: ScrollDirection =
        scrollTop > lastScrollTopRef.current
          ? 'down'
          : scrollTop < lastScrollTopRef.current
            ? 'up'
            : lastScrollDirectionRef.current;

      lastScrollDirectionRef.current = direction;
      lastScrollTopRef.current = scrollTop;

      if (isLatchedRef.current) {
        setRevealed(true);
        return;
      }

      if (!isInViewportRef.current) {
        return;
      }

      if (entryScrollTopRef.current === null) {
        entryScrollTopRef.current = scrollTop;
      }

      const entryScrollTop = entryScrollTopRef.current;
      if (entryScrollTop === null) {
        setRevealed(false);
        return;
      }

      if (direction === 'up' && !once) {
        setRevealed(false);
        return;
      }

      if (scrollTop - entryScrollTop >= thresholdScrollPx) {
        isLatchedRef.current = true;
        setRevealed(true);
        return;
      }

      setRevealed(false);
    };

    updateReveal();

    scrollTarget.addEventListener('scroll', updateReveal, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', updateReveal);
    };
  }, [enabled, once, rootOption, thresholdScrollPx]);

  useEffect(() => {
    if (once) {
      return;
    }

    const element = ref.current;
    const resetElement =
      resetRef?.current ?? (resetUsesAnchor ? element : null);
    if (!enabled || !element || !resetElement) {
      return;
    }

    const scrollRoot =
      rootOption !== undefined ? rootOption : resolveScrollRoot(element);
    const hasIntersectedResetTargetRef = { current: false };

    const resetObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasIntersectedResetTargetRef.current = true;
          return;
        }

        if (
          resetRequiresPriorIntersection &&
          !hasIntersectedResetTargetRef.current
        ) {
          return;
        }

        if (resetRequiresPriorIntersection) {
          hasIntersectedResetTargetRef.current = false;
        }

        if (!isLatchedRef.current) {
          return;
        }

        const scrollTarget = resolveScrollTarget(element, rootOption);
        const scrollTop = getScrollTop(scrollTarget);
        const direction: ScrollDirection =
          scrollTop > lastScrollTopRef.current
            ? 'down'
            : scrollTop < lastScrollTopRef.current
              ? 'up'
              : lastScrollDirectionRef.current;

        if (direction !== 'up') {
          return;
        }

        resetAllStateRef.current();
      },
      {
        root: scrollRoot,
        threshold: 0,
      }
    );

    resetObserver.observe(resetElement);

    return () => {
      resetObserver.disconnect();
    };
  }, [
    enabled,
    once,
    resetRef,
    resetRequiresPriorIntersection,
    resetUsesAnchor,
    rootOption,
  ]);

  return {
    ref: ref as RefObject<T | null>,
    isInViewport,
    isRevealed,
  };
}
