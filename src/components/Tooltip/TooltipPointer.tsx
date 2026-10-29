import type { Side } from "@floating-ui/utils";
import { type CSSProperties, forwardRef, useMemo } from "react";

// The pointer of the standard tooltip: a 14 × 7 triangle with a 1px outline that reads as one shape with the
// see-through panel. It sits just outside the panel's border instead of on top of it, the panel's border opens under
// its base, and the panel's shadow leaves it out (Tooltip.scss), so the outline runs on without a seam.

const BORDER = 1;
export const POINTER_WIDTH = 14;
export const POINTER_HEIGHT = 7;
// The outline runs 1px out from the 45° slopes, so it reaches √2 past the base corners and past the tip
const OVERHANG = Math.SQRT2 * BORDER;
export const POINTER_BOX_WIDTH = POINTER_WIDTH + 2 * OVERHANG;
const POINTER_BOX_HEIGHT = POINTER_HEIGHT + OVERHANG;

const round = (value: number) => Math.round(value * 1000) / 1000;
const W = round(POINTER_BOX_WIDTH);
const H = round(POINTER_BOX_HEIGHT);
const O = round(OVERHANG);
// Drawn pointing up, with the base on the bottom edge
const FILL_PATH = `M${O} ${H}L${round(W / 2)} ${O}L${round(W - O)} ${H}Z`;
// The outline: the triangle grown by 1px along both slopes, minus the fill (even-odd)
const OUTLINE_PATH = `M0 ${H}L${round(W / 2)} 0L${W} ${H}Z${FILL_PATH}`;

// floating-ui's arrow x is measured from the panel's padding edge, one border in from its outer edge

/**
 * Where the panel's border opens under the pointer's base, from the panel's outer left edge.
 */
export function getPointerGapX(arrowX: number): number {
  return arrowX + BORDER + OVERHANG;
}

/**
 * The middle of the pointer, from the panel's outer left edge.
 */
export function getPointerCenterX(arrowX: number): number {
  return arrowX + BORDER + POINTER_BOX_WIDTH / 2;
}

type Props = {
  // The side of the trigger the tooltip opens on: below it the pointer sits on the panel's top edge, above it on
  // the bottom edge
  side: Side;
  arrowX: number | undefined;
};

/**
 * Placed by Tooltip.scss: outside the panel's border on its own, or inside the panel's reach on a live tooltip, where
 * the panel's background fills it (`.Tooltip-surface`).
 */
export const TooltipPointer = forwardRef<SVGSVGElement, Props>(function TooltipPointer({ side, arrowX }, ref) {
  const style = useMemo<CSSProperties>(() => ({ left: arrowX }), [arrowX]);

  return (
    <svg
      ref={ref}
      aria-hidden
      className="Tooltip-pointer"
      data-edge={side === "top" ? "bottom" : "top"}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={style}
    >
      <path className="Tooltip-pointer-outline" fillRule="evenodd" d={OUTLINE_PATH} />
      <path className="Tooltip-pointer-fill" d={FILL_PATH} />
    </svg>
  );
});
