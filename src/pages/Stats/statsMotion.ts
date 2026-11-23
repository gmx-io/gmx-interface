import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "lib/usePrefersReducedMotion";

/*
 * Motion on the Stats page.
 * - A chart eases to its new data for one transition after a click that keeps its periods (chart type, legend,
 *   variant). Charts never animate on load, on resize or while a range handle is dragged.
 * - Swapped content fades in: tabs, table views, periods, and charts whose periods change (interval, dates), where a
 *   bar-by-bar morph would mislead.
 * - Bar charts with more than MAX_ANIMATED_BARS bars fade instead of easing (each bar is redrawn every frame).
 * Everything is off when the system asks for reduced motion.
 */
export const CHART_MOTION_MS = 450;
const FADE_MS = 200;
export const MAX_ANIMATED_BARS = 600;
/** The range window glides to a place set elsewhere (date picker, interval), in step with the fade. */
export const GLIDE = " transition-[left,width] duration-200 ease-out motion-reduce:transition-none";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function reducedMotionNow() {
  return typeof window !== "undefined" && !!window.matchMedia?.(REDUCED_MOTION).matches;
}

/** Props for a Recharts series (Bar, Line, Area): it eases to new data when `on`. */
export function seriesMotion(on: boolean) {
  return { isAnimationActive: on, animationDuration: CHART_MOTION_MS, animationEasing: "ease-out" as const };
}

/** Chart motion for one card: off by default; `ease()` turns it on for the next transition only, `hold()` stops it. */
export function useChartMotion() {
  const reduced = usePrefersReducedMotion();
  const [on, setOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);
  const hold = () => {
    window.clearTimeout(timer.current);
    setOn(false);
  };
  const ease = () => {
    window.clearTimeout(timer.current);
    setOn(true);
    timer.current = window.setTimeout(() => setOn(false), CHART_MOTION_MS + 50);
  };
  return { animate: on && !reduced, ease, hold };
}

/** Fades the element in whenever `key` changes (not on mount). */
export function useFadeIn<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const prev = useRef(key);
  useEffect(() => {
    if (Object.is(prev.current, key)) return;
    prev.current = key;
    const el = ref.current;
    if (!el || typeof el.animate !== "function" || reducedMotionNow()) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out" });
  }, [key]);
  return ref;
}
