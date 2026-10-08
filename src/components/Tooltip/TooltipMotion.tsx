import { type FloatingContext, useTransitionStatus } from "@floating-ui/react";
import { type Side, getSide } from "@floating-ui/utils";
import type { CSSProperties } from "react";

import {
  TOOLTIP_EASING,
  TOOLTIP_ENTER_DURATION,
  TOOLTIP_ENTER_OFFSET,
  TOOLTIP_ENTER_SCALE,
  TOOLTIP_EXIT_DURATION,
} from "config/ui";

/**
 * Spread on the animated panel. Tooltip.scss runs the motion from these (`.Tooltip-popup[data-status]`).
 */
export type TooltipMotionProps = {
  "data-status": ReturnType<typeof useTransitionStatus>["status"];
  "data-side": Side;
  "data-instant": true | undefined;
  style: CSSProperties;
};

// The timing lives in config/ui.ts; Tooltip.scss reads it from these variables
const MOTION_VARIABLES = {
  "--tooltip-enter-duration": `${TOOLTIP_ENTER_DURATION}ms`,
  "--tooltip-exit-duration": `${TOOLTIP_EXIT_DURATION}ms`,
  "--tooltip-enter-scale": String(TOOLTIP_ENTER_SCALE),
  "--tooltip-enter-offset": `${TOOLTIP_ENTER_OFFSET}px`,
  "--tooltip-easing": TOOLTIP_EASING,
};

const ARROW_WIDTH = 14; // FloatingArrow default

type Props = {
  context: FloatingContext;
  /**
   * No motion: opened with the keyboard, or right after another tooltip in the same group.
   */
  instant: boolean;
  /**
   * Renders the popup. Called only while it is open or leaving.
   */
  children: (motion: TooltipMotionProps) => JSX.Element;
};

/**
 * Keeps an animated tooltip on screen until its exit ends, and marks the panel's state for the CSS.
 * Only animated tooltips render this, so the others pay nothing for motion.
 */
export function TooltipMotion({ context, instant, children }: Props) {
  // How long the popup stays on the page after it closes, so the exit can play
  const { isMounted, status } = useTransitionStatus(context, {
    duration: { close: instant ? 0 : TOOLTIP_EXIT_DURATION },
  });

  if (!isMounted) {
    return null;
  }

  // The panel grows from the pointer, so it looks like it comes out of the trigger.
  // Always set, so a tooltip nested inside another never inherits its value.
  const arrowX = context.middlewareData.arrow?.x;
  const pointerX = arrowX === undefined ? "center" : `${arrowX + ARROW_WIDTH / 2}px`;

  return children({
    "data-status": status,
    "data-side": getSide(context.placement),
    "data-instant": instant || undefined,
    style: { ...MOTION_VARIABLES, "--tooltip-pointer-x": pointerX } as CSSProperties,
  });
}
