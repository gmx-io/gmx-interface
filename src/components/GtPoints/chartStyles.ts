import type { CSSProperties, SVGProps } from "react";

export const CHART_TICK_PROPS: SVGProps<SVGTextElement> = {
  fill: "var(--color-slate-100)",
  fontSize: 11,
  fontWeight: 500,
};
export const X_AXIS_LINE_PROPS: SVGProps<SVGLineElement> = { stroke: "var(--color-slate-600)", strokeWidth: 0.5 };
export const CHART_CURSOR_PROPS = { stroke: "var(--color-slate-500)", strokeWidth: 1, strokeDasharray: "2 2" };
/** Light dashed rows behind the lines, the same as GMX's net rate chart */
export const CHART_GRID_PROPS = { strokeDasharray: "5 3", strokeWidth: 0.5, stroke: "var(--color-slate-600)" };
/** 20px on the sides, the same as the card's padding, so the axis labels line up with the title and legend */
export const CHART_MARGIN = { top: 16, right: 20, bottom: 8, left: 20 };
export const CHART_TOOLTIP_WRAPPER_STYLE: CSSProperties = { zIndex: 10000 };
export const CHART_ACTIVE_DOT = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-slate-100)",
  fill: "var(--color-slate-900)",
};

/** Space between the plot and the Y-axis labels (YAxis tickMargin) */
export const Y_TICK_MARGIN = 8;
// Recharts draws Y-axis labels next to the plot: its default tick size (6) + the tick margin away from it.
const Y_TICK_GAP = 6 + Y_TICK_MARGIN;

/**
 * Y-axis label props that pin the labels to the card's edge: the left axis left-aligned,
 * the right axis right-aligned, so every label starts (or ends) on the same line.
 */
export function getEdgeTickProps(side: "left" | "right", axisWidth: number): SVGProps<SVGTextElement> {
  return side === "left"
    ? { ...CHART_TICK_PROPS, textAnchor: "start", dx: -(axisWidth - Y_TICK_GAP) }
    : { ...CHART_TICK_PROPS, textAnchor: "end", dx: axisWidth - Y_TICK_GAP };
}
