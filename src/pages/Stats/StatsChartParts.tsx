import cx from "classnames";
import { type ReactNode, useMemo } from "react";

import { STANDARD_TOOLTIP_LOOK } from "components/Tooltip/StandardTooltip";

/* Shared chart look, taken from the app's existing charts (referral bar charts, buyback chart). */
export const AXIS_TICK = { fill: "var(--color-typography-secondary)", fontSize: 12, fontWeight: 500 };
export const GRID_PROPS = {
  vertical: false,
  strokeDasharray: "1.5 8",
  strokeWidth: 0.5,
  stroke: "var(--color-stroke-primary)",
};
export const LINE_CURSOR = { stroke: "var(--color-slate-500)", strokeWidth: 1, strokeDasharray: "2 2" };
export const CHART_MARGIN = { top: 8, right: 4, bottom: 0, left: 0 };
export const BAR_RADIUS_TOP: [number, number, number, number] = [4, 4, 0, 0];
export const BAR_RADIUS_TOP_THIN: [number, number, number, number] = [1, 1, 0, 0];
export const BAR_RADIUS_ALL: [number, number, number, number] = [2, 2, 2, 2];

/*
 * Hover highlight for bar charts. Combined charts draw a thin line cursor behind the bars, where wide bars hide it,
 * so bar charts get a full column highlight instead (like a plain bar chart).
 */
export function BandCursor(props: {
  points?: { x: number }[];
  top?: number;
  height?: number;
  width?: number;
  count: number;
}) {
  const { points, top = 0, height = 0, width = 0, count } = props;
  if (!points?.length || !count) return null;
  const band = width / count;
  return (
    <rect
      x={points[0].x - band / 2}
      y={top}
      width={band}
      height={height}
      fill="var(--color-slate-600)"
      fillOpacity={0.5}
      pointerEvents="none"
    />
  );
}
/* The hovered bar gets brighter (keeps its own colour), on top of the column highlight. */
export const ACTIVE_BAR = { style: { filter: "brightness(1.3)" } };
export const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--color-slate-900)" };
export const PARTIAL_OPACITY = 0.45;
export const TOOLTIP_WRAPPER_STYLE = { zIndex: 10000, outline: "none" };

/* Chart hover popup in the design system's standard tooltip look. */
export function ChartTip({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cx(
        "Tooltip-popup text-body-small flex min-w-[200px] flex-col gap-4",
        STANDARD_TOOLTIP_LOOK.popupClassName
      )}
    >
      <div className="mb-2 text-typography-secondary">{head}</div>
      {children}
    </div>
  );
}

export function ChartTipRow({
  label,
  value,
  color,
  total,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
  total?: boolean;
}) {
  const dotStyle = useMemo(() => ({ background: color }), [color]);
  return (
    <div
      className={
        total
          ? "mt-2 flex items-center justify-between gap-16 border-t-1/2 border-slate-600 pt-6"
          : "flex items-center justify-between gap-16"
      }
    >
      <span className="flex items-center gap-6 text-typography-secondary">
        {color ? <span className="size-8 shrink-0 rounded-full" style={dotStyle} /> : null}
        {label}
      </span>
      <span className="font-medium text-typography-primary numbers">{value}</span>
    </div>
  );
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return <div className="text-body-small px-4 font-medium text-typography-secondary">{children}</div>;
}
