import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { remapProgress } from './scrollRevealUtils';

type ScrubDelta = {
  deltaX: number;
  deltaY: number;
};

type FadeInConfig = {
  start?: number;
  end?: number;
  translateY?: number;
};

type UseScrollFlipRevealOptions = {
  enabled?: boolean;
  rootRef?: RefObject<HTMLElement | null>;
  metricRef?: RefObject<HTMLElement | null>;
  cardsRef?: RefObject<HTMLElement | null>;
  overlapGapPx?: number;
  fadeInRefs?: RefObject<HTMLElement | null>[];
  fadeInConfig?: FadeInConfig[];
  fadeOutRefs?: RefObject<HTMLElement | null>[];
};

const DEFAULT_OVERLAP_GAP_PX = 24;

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

function buildScrubTransform(delta: ScrubDelta, progress: number) {
  const factor = 1 - progress;

  return `translate(${delta.deltaX * factor}px, ${delta.deltaY * factor}px)`;
}

function measureScrubDeltas(
  root: HTMLElement,
  refs: RefObject<HTMLElement | null>[],
  metricRef?: RefObject<HTMLElement | null>,
  cardsRef?: RefObject<HTMLElement | null>,
  overlapGapPx = DEFAULT_OVERLAP_GAP_PX
) {
  const deltas = new Map<HTMLElement, ScrubDelta>();

  root.classList.add('is-scroll-revealing');
  root.style.setProperty('--core-value-reveal-progress', '0');
  void root.offsetHeight;

  const fromRects = new Map<HTMLElement, DOMRect>();

  refs.forEach((targetRef) => {
    const element = targetRef.current;
    if (element) {
      fromRects.set(element, element.getBoundingClientRect());
    }
  });

  root.classList.remove('is-scroll-revealing');
  root.classList.add('is-revealed');
  root.style.removeProperty('--core-value-reveal-progress');
  void root.offsetHeight;

  refs.forEach((targetRef) => {
    const element = targetRef.current;
    if (!element) {
      return;
    }

    const fromRect = fromRects.get(element);
    if (!fromRect) {
      return;
    }

    const toRect = element.getBoundingClientRect();
    deltas.set(element, {
      deltaX: fromRect.left - toRect.left,
      deltaY: fromRect.top - toRect.top,
    });
  });

  root.classList.remove('is-revealed');

  const metricElement = metricRef?.current;
  const cardsElement = cardsRef?.current;

  if (metricElement && cardsElement) {
    const metricFromRect = fromRects.get(metricElement);
    const cardsDelta = deltas.get(cardsElement);

    if (metricFromRect && cardsDelta) {
      const overlap = metricFromRect.bottom + overlapGapPx - fromRects.get(cardsElement)!.top;

      if (overlap > 0) {
        cardsDelta.deltaY += overlap;
      }
    }
  }

  return deltas;
}

export function useScrollFlipReveal(
  progress: number,
  refs: RefObject<HTMLElement | null>[],
  options: UseScrollFlipRevealOptions = {}
) {
  const {
    enabled = true,
    rootRef,
    metricRef,
    cardsRef,
    overlapGapPx = DEFAULT_OVERLAP_GAP_PX,
    fadeInRefs = [],
    fadeInConfig = [],
    fadeOutRefs = [],
  } = options;
  const [layoutRevealed, setLayoutRevealed] = useState(!enabled);
  const scrubDeltasRef = useRef<Map<HTMLElement, ScrubDelta> | null>(null);
  const refsRef = useRef(refs);
  const fadeInRefsRef = useRef(fadeInRefs);
  const fadeInConfigRef = useRef(fadeInConfig);
  const fadeOutRefsRef = useRef(fadeOutRefs);

  refsRef.current = refs;
  fadeInRefsRef.current = fadeInRefs;
  fadeInConfigRef.current = fadeInConfig;
  fadeOutRefsRef.current = fadeOutRefs;

  useEffect(() => {
    if (enabled) {
      return;
    }

    setLayoutRevealed(true);
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled || !rootRef?.current) {
      scrubDeltasRef.current = null;
      return;
    }

    const root = rootRef.current;

    const measure = () => {
      const elements = refsRef.current
        .map((targetRef) => targetRef.current)
        .filter((element): element is HTMLElement => element !== null);

      if (elements.length === 0) {
        scrubDeltasRef.current = null;
        return;
      }

      scrubDeltasRef.current = measureScrubDeltas(
        root,
        refsRef.current,
        metricRef,
        cardsRef,
        overlapGapPx
      );
    };

    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [cardsRef, enabled, metricRef, overlapGapPx, rootRef]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const clampedProgress = Math.min(1, Math.max(0, progress));
    const scrubDeltas = scrubDeltasRef.current;
    const fadeOutElements = new Set(
      fadeOutRefsRef.current
        .map((targetRef) => targetRef.current)
        .filter((element): element is HTMLElement => element !== null)
    );
    const fadeInElements = new Set(
      fadeInRefsRef.current
        .map((targetRef) => targetRef.current)
        .filter((element): element is HTMLElement => element !== null)
    );

    if (clampedProgress <= 0) {
      setLayoutRevealed(false);

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
      return;
    }

    setLayoutRevealed(true);

    if (clampedProgress >= 1) {
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

      return;
    }

    if (!scrubDeltas) {
      return;
    }

    refsRef.current.forEach((targetRef) => {
      const element = targetRef.current;
      if (!element) {
        return;
      }

      const delta = scrubDeltas.get(element);
      if (!delta) {
        return;
      }

      element.style.transition = 'none';
      element.style.transform = buildScrubTransform(delta, clampedProgress);

      if (!fadeInElements.has(element) && !fadeOutElements.has(element)) {
        element.style.opacity = '';
        element.style.visibility = '';
      }
    });

    fadeInRefsRef.current.forEach((targetRef, index) => {
      const element = targetRef.current;
      if (!element) {
        return;
      }

      const config = fadeInConfigRef.current[index] ?? {};
      const fadeProgress = remapProgress(
        clampedProgress,
        config.start ?? 0,
        config.end ?? 1
      );
      const translateY = (config.translateY ?? 0) * (1 - fadeProgress);
      const delta = scrubDeltas.get(element);
      const scrubTransform = delta
        ? buildScrubTransform(delta, clampedProgress)
        : '';

      element.style.transition = 'none';
      element.style.visibility = 'visible';
      element.style.opacity = String(fadeProgress);
      element.style.transform = translateY
        ? `${scrubTransform} translateY(${translateY}px)`.trim()
        : scrubTransform;
    });

    fadeOutRefsRef.current.forEach((targetRef) => {
      const element = targetRef.current;
      if (element) {
        element.style.transition = 'none';
        element.style.visibility = 'visible';
        element.style.opacity = String(1 - clampedProgress);
      }
    });
  }, [enabled, progress]);

  return { layoutRevealed };
}
