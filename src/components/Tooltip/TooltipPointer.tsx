import type { Side } from "@floating-ui/utils";
import { type CSSProperties, forwardRef, useMemo } from "react";

const BORDER = 1;
export const POINTER_WIDTH = 14;
export const POINTER_HEIGHT = 7;
const OVERHANG = Math.SQRT2 * BORDER;
export const POINTER_BOX_WIDTH = POINTER_WIDTH + 2 * OVERHANG;
const POINTER_BOX_HEIGHT = POINTER_HEIGHT + OVERHANG;

const round = (value: number) => Math.round(value * 1000) / 1000;
const W = round(POINTER_BOX_WIDTH);
const H = round(POINTER_BOX_HEIGHT);
const O = round(OVERHANG);
const FILL_PATH = `M${O} ${H}L${round(W / 2)} ${O}L${round(W - O)} ${H}Z`;
const OUTLINE_PATH = `M0 ${H}L${round(W / 2)} 0L${W} ${H}Z${FILL_PATH}`;

export function getPointerGapX(arrowX: number): number {
  return arrowX + BORDER + OVERHANG;
}

export function getPointerCenterX(arrowX: number): number {
  return arrowX + BORDER + POINTER_BOX_WIDTH / 2;
}

type Props = {
  side: Side;
  arrowX: number | undefined;
};

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
