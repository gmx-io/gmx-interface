import { type RefObject, useEffect, useRef, useState } from 'react';

const APP_SCROLL_SELECTOR = '.App-content .overflow-y-auto';

type ScrollDirection = 'down' | 'up' | null;

type UseScrollShrinkRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  enabled?: boolean;
  resetRef?: RefObject<HTMLElement | null>;
  /** When true, stay at normal scale after the first reveal until unmount/refresh. Default true. */
  once?: boolean;
  maxScale?: number;
  minScale?: number;
};

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

function getScrollTop(scrollTarget: HTMLElement | Window) {
  if (scrollTarget instanceof Window) {
    return scrollTarget.scrollY;
  }

  return scrollTarget.scrollTop;
}

function getVisibleProgress(
  element: HTMLElement,
  scrollRoot: HTMLElement | null
): number {
  const rootRect = scrollRoot?.getBoundingClientRect() ?? {
    top: 0,
    bottom: window.innerHeight,
  };
  const rect = element.getBoundingClientRect();
  const visibleTop = Math.max(rect.top, rootRect.top);
  const visibleBottom = Math.min(rect.bottom, rootRect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  return rect.height > 0 ? Math.min(1, visibleHeight / rect.height) : 0;
}

function getScaleFromProgress(
  progress: number,
  maxScale: number,
  minScale: number
) {
  return maxScale - (maxScale - minScale) * progress;
}

export function useScrollShrinkReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollShrinkRevealOptions = {}
) {
  const {
    threshold = 0.15,
    rootMargin = '0px',
    root: rootOption,
    enabled = true,
    resetRef,
    once = true,
    maxScale = 1.5,
    minScale = 1,
  } = options;

  const ref = useRef<T | null>(null);
  const isLatchedRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirectionRef = useRef<ScrollDirection>(null);

  const [isNormalScale, setIsNormalScale] = useState(false);
  const [scale, setScale] = useState(maxScale);
  const [isShrinking, setIsShrinking] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const resetElement = resetRef?.current ?? element;
    if (!enabled || !element || !resetElement) {
      return;
    }

    const scrollRoot =
      rootOption !== undefined ? rootOption : resolveScrollRoot(element);
    const scrollTarget = resolveScrollTarget(element, rootOption);
    lastScrollTopRef.current = getScrollTop(scrollTarget);
    lastScrollDirectionRef.current = null;

    const updateScrollState = () => {
      const scrollTop = getScrollTop(scrollTarget);
      const direction: ScrollDirection =
        scrollTop > lastScrollTopRef.current
          ? 'down'
          : scrollTop < lastScrollTopRef.current
            ? 'up'
            : lastScrollDirectionRef.current;

      lastScrollTopRef.current = scrollTop;
      lastScrollDirectionRef.current = direction;

      if (isLatchedRef.current) {
        setScale(minScale);
        setIsShrinking(false);
        setIsNormalScale(true);
        return;
      }

      const progress = getVisibleProgress(element, scrollRoot);
      const nextScale = getScaleFromProgress(progress, maxScale, minScale);

      setScale(nextScale);
      setIsShrinking(progress > 0 && progress < 1);

      if (progress >= 1 && direction !== 'up') {
        isLatchedRef.current = true;
        setScale(minScale);
        setIsShrinking(false);
        setIsNormalScale(true);
      }
    };

    updateScrollState();
    scrollTarget.addEventListener('scroll', updateScrollState, {
      passive: true,
    });

    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        updateScrollState();

        if (isLatchedRef.current) {
          setIsNormalScale(true);
          return;
        }

        if (
          entry.isIntersecting &&
          lastScrollDirectionRef.current !== 'up'
        ) {
          isLatchedRef.current = true;
          setScale(minScale);
          setIsShrinking(false);
          setIsNormalScale(true);
        }
      },
      {
        root: scrollRoot,
        rootMargin,
        threshold,
      }
    );

    revealObserver.observe(element);

    let resetObserver: IntersectionObserver | null = null;
    if (!once) {
      resetObserver = new IntersectionObserver(
        ([entry]) => {
          updateScrollState();

          if (!isLatchedRef.current || entry.isIntersecting) {
            return;
          }

          if (lastScrollDirectionRef.current !== 'up') {
            return;
          }

          isLatchedRef.current = false;
          setIsNormalScale(false);
          setScale(maxScale);
          setIsShrinking(false);
        },
        {
          root: scrollRoot,
          threshold: 0,
        }
      );

      resetObserver.observe(resetElement);
    }

    return () => {
      scrollTarget.removeEventListener('scroll', updateScrollState);
      revealObserver.disconnect();
      resetObserver?.disconnect();
    };
  }, [
    enabled,
    maxScale,
    minScale,
    once,
    rootMargin,
    rootOption,
    resetRef,
    threshold,
  ]);

  return {
    ref: ref as RefObject<T | null>,
    isNormalScale,
    scale,
    isShrinking,
  };
}
