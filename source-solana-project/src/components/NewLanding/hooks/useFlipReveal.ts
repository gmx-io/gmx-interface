import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type UseFlipRevealOptions = {
  enabled?: boolean;
  durationMs?: number;
  fadeInRefs?: RefObject<HTMLElement | null>[];
  fadeOutRefs?: RefObject<HTMLElement | null>[];
  /** When true, keep layout revealed after the first flip until unmount/refresh. Default true. */
  once?: boolean;
};

function clearElementMotionStyles(element: HTMLElement) {
  element.style.transform = '';
  element.style.transition = '';
  element.style.opacity = '';
  element.style.visibility = '';
}

function finalizeFadeOutElement(element: HTMLElement) {
  element.style.transition = '';
  element.style.transform = '';
  element.style.opacity = '0';
  element.style.visibility = 'hidden';
}

export function useFlipReveal(
  revealed: boolean,
  refs: RefObject<HTMLElement | null>[],
  options: UseFlipRevealOptions = {}
) {
  const {
    enabled = true,
    durationMs = 500,
    fadeInRefs = [],
    fadeOutRefs = [],
    once = true,
  } = options;
  const [layoutRevealed, setLayoutRevealed] = useState(!enabled);
  const hasCompletedFlipRef = useRef(false);
  const firstRectsRef = useRef<Map<HTMLElement, DOMRect> | null>(null);
  const cleanupTimeoutRef = useRef<number | null>(null);
  const refsRef = useRef(refs);
  const fadeInRefsRef = useRef(fadeInRefs);
  const fadeOutRefsRef = useRef(fadeOutRefs);

  refsRef.current = refs;
  fadeInRefsRef.current = fadeInRefs;
  fadeOutRefsRef.current = fadeOutRefs;

  useEffect(() => {
    if (enabled) {
      return;
    }

    setLayoutRevealed(true);
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    if (cleanupTimeoutRef.current !== null) {
      window.clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (!revealed) {
      if (once && hasCompletedFlipRef.current) {
        return;
      }

      firstRectsRef.current = null;
      refsRef.current.forEach((targetRef) => {
        const element = targetRef.current;
        if (element) {
          clearElementMotionStyles(element);
        }
      });
      fadeInRefsRef.current.forEach((targetRef) => {
        const element = targetRef.current;
        if (element) {
          clearElementMotionStyles(element);
        }
      });
      fadeOutRefsRef.current.forEach((targetRef) => {
        const element = targetRef.current;
        if (element) {
          clearElementMotionStyles(element);
        }
      });
      setLayoutRevealed(false);
      return;
    }

    if (!layoutRevealed) {
      const firstRects = new Map<HTMLElement, DOMRect>();
      refsRef.current.forEach((targetRef) => {
        const element = targetRef.current;
        if (element) {
          firstRects.set(element, element.getBoundingClientRect());
        }
      });
      firstRectsRef.current = firstRects;
      hasCompletedFlipRef.current = true;
      setLayoutRevealed(true);
      return;
    }

    const firstRects = firstRectsRef.current;
    if (!firstRects || firstRects.size === 0) {
      return;
    }

    firstRectsRef.current = null;

    refsRef.current.forEach((targetRef) => {
      const element = targetRef.current;
      if (!element) {
        return;
      }

      const firstRect = firstRects.get(element);
      if (!firstRect) {
        return;
      }

      const lastRect = element.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    });

    fadeInRefsRef.current.forEach((targetRef) => {
      const element = targetRef.current;
      if (element) {
        element.style.opacity = '0';
      }
    });

    fadeOutRefsRef.current.forEach((targetRef) => {
      const element = targetRef.current;
      if (element) {
        element.style.visibility = 'visible';
        element.style.opacity = '1';
      }
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const transition = `transform ${durationMs}ms ease, opacity ${durationMs}ms ease`;

        refsRef.current.forEach((targetRef) => {
          const element = targetRef.current;
          if (!element) {
            return;
          }

          element.style.transition = transition;
          element.style.transform = 'translate(0, 0)';
        });

        fadeInRefsRef.current.forEach((targetRef) => {
          const element = targetRef.current;
          if (element) {
            element.style.transition = transition;
            element.style.opacity = '1';
          }
        });

        fadeOutRefsRef.current.forEach((targetRef) => {
          const element = targetRef.current;
          if (element) {
            element.style.transition = transition;
            element.style.opacity = '0';
          }
        });

        cleanupTimeoutRef.current = window.setTimeout(() => {
          const fadeOutElements = new Set(
            fadeOutRefsRef.current
              .map((targetRef) => targetRef.current)
              .filter((element): element is HTMLElement => element !== null)
          );

          refsRef.current.forEach((targetRef) => {
            const element = targetRef.current;
            if (!element) {
              return;
            }

            element.style.transform = '';
            element.style.transition = '';

            if (!fadeOutElements.has(element)) {
              element.style.opacity = '';
              element.style.visibility = '';
            }
          });

          fadeInRefsRef.current.forEach((targetRef) => {
            const element = targetRef.current;
            if (element) {
              clearElementMotionStyles(element);
            }
          });

          fadeOutRefsRef.current.forEach((targetRef) => {
            const element = targetRef.current;
            if (element) {
              finalizeFadeOutElement(element);
            }
          });

          cleanupTimeoutRef.current = null;
        }, durationMs);
      });
    });
  }, [durationMs, enabled, layoutRevealed, once, revealed]);

  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current !== null) {
        window.clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  return { layoutRevealed };
}
