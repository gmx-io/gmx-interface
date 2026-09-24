export const APP_SCROLL_SELECTOR = '.App-content .overflow-y-auto';

export type ScrollDirection = 'down' | 'up' | null;

export function resolveVhScrollPx(vh: number | undefined, fallbackPx = 0) {
  if (vh === undefined) {
    return fallbackPx;
  }

  if (typeof window === 'undefined') {
    return 0;
  }

  return window.innerHeight * (vh / 100);
}

export function resolveScrollRoot(element: HTMLElement | null): HTMLElement | null {
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

export function getScrollTop(scrollTarget: HTMLElement | Window) {
  if (scrollTarget instanceof Window) {
    return scrollTarget.scrollY;
  }

  return scrollTarget.scrollTop;
}

export function resolveScrollTarget(
  element: HTMLElement,
  rootOption: Element | null | undefined
): HTMLElement | Window {
  if (rootOption instanceof HTMLElement) {
    return rootOption;
  }

  const scrollRoot = resolveScrollRoot(element);
  return scrollRoot ?? window;
}

export function getScrollDirection(
  scrollTop: number,
  lastScrollTop: number,
  lastDirection: ScrollDirection
): ScrollDirection {
  if (scrollTop > lastScrollTop) {
    return 'down';
  }

  if (scrollTop < lastScrollTop) {
    return 'up';
  }

  return lastDirection;
}

export function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(value: number) {
  const t = clampProgress(value);
  return 1 - Math.pow(1 - t, 3);
}

export function remapProgress(
  progress: number,
  start: number,
  end: number
) {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }

  return clampProgress((progress - start) / (end - start));
}
