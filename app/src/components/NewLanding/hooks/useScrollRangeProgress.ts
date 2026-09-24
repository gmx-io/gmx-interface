import { type RefObject, useEffect, useRef, useState } from 'react';

import {
  clampProgress,
  getScrollDirection,
  getScrollTop,
  resolveScrollRoot,
  resolveScrollTarget,
  resolveVhScrollPx,
  type ScrollDirection,
} from './scrollRevealUtils';

type UseScrollRangeProgressOptions = {
  thresholdPx?: number;
  thresholdVh?: number;
  rangePx?: number;
  rangeVh?: number;
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  enabled?: boolean;
  /** When true, stay at progress 1 after completion until unmount/refresh. Default true. */
  once?: boolean;
};

function resolveRangeScrollPx(
  rangePx: number | undefined,
  rangeVh: number | undefined
) {
  if (rangeVh !== undefined) {
    return resolveVhScrollPx(rangeVh);
  }

  return rangePx ?? 0;
}

export function useScrollRangeProgress<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRangeProgressOptions = {}
) {
  const {
    thresholdPx,
    thresholdVh,
    rangePx,
    rangeVh,
    threshold = 0.15,
    rootMargin = '0px',
    root: rootOption,
    enabled = true,
    once = true,
  } = options;

  const [thresholdScrollPx, setThresholdScrollPx] = useState(() =>
    thresholdVh !== undefined
      ? resolveVhScrollPx(thresholdVh)
      : (thresholdPx ?? 0)
  );
  const [rangeScrollPx, setRangeScrollPx] = useState(() =>
    resolveRangeScrollPx(rangePx, rangeVh)
  );

  const ref = useRef<T | null>(null);
  const entryScrollTopRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirectionRef = useRef<ScrollDirection>(null);
  const isInViewportRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const updateThresholdScrollPx = () => {
      setThresholdScrollPx(
        thresholdVh !== undefined
          ? resolveVhScrollPx(thresholdVh)
          : (thresholdPx ?? 0)
      );
      setRangeScrollPx(resolveRangeScrollPx(rangePx, rangeVh));
    };

    updateThresholdScrollPx();
    window.addEventListener('resize', updateThresholdScrollPx);

    return () => {
      window.removeEventListener('resize', updateThresholdScrollPx);
    };
  }, [rangePx, rangeVh, thresholdPx, thresholdVh]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      return;
    }

    const resetAllState = () => {
      if (once && hasCompletedRef.current) {
        return;
      }

      entryScrollTopRef.current = null;
      setProgress(0);
      setIsComplete(false);
    };

    const scrollRoot =
      rootOption !== undefined ? rootOption : resolveScrollRoot(element);
    const scrollTarget = resolveScrollTarget(element, rootOption);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrollTop = getScrollTop(scrollTarget);
        lastScrollDirectionRef.current = getScrollDirection(
          scrollTop,
          lastScrollTopRef.current,
          lastScrollDirectionRef.current
        );
        lastScrollTopRef.current = scrollTop;
        isInViewportRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          if (entryScrollTopRef.current === null && !hasCompletedRef.current) {
            entryScrollTopRef.current = scrollTop;
          }
          return;
        }

        if (
          lastScrollDirectionRef.current === 'up' &&
          !(once && hasCompletedRef.current)
        ) {
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

    const updateProgress = () => {
      if (once && hasCompletedRef.current) {
        setProgress(1);
        setIsComplete(true);
        return;
      }

      const scrollTop = getScrollTop(scrollTarget);
      lastScrollDirectionRef.current = getScrollDirection(
        scrollTop,
        lastScrollTopRef.current,
        lastScrollDirectionRef.current
      );
      lastScrollTopRef.current = scrollTop;

      if (!isInViewportRef.current) {
        return;
      }

      if (entryScrollTopRef.current === null) {
        entryScrollTopRef.current = scrollTop;
      }

      const entryScrollTop = entryScrollTopRef.current;
      if (entryScrollTop === null) {
        setProgress(0);
        setIsComplete(false);
        return;
      }

      const delta = scrollTop - entryScrollTop;
      const animationDelta = delta - thresholdScrollPx;

      if (animationDelta < 0 || rangeScrollPx <= 0) {
        setProgress(0);
        setIsComplete(false);
        return;
      }

      const nextProgress = clampProgress(animationDelta / rangeScrollPx);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        hasCompletedRef.current = true;
        setIsComplete(true);
        return;
      }

      setIsComplete(false);
    };

    updateProgress();
    scrollTarget.addEventListener('scroll', updateProgress, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', updateProgress);
    };
  }, [enabled, once, rootOption, rangeScrollPx, thresholdScrollPx]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    setProgress(1);
    setIsComplete(true);
  }, [enabled]);

  return {
    ref: ref as RefObject<T | null>,
    progress,
    isComplete,
  };
}
