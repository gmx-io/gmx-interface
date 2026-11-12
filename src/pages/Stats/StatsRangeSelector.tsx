import { t } from "@lingui/macro";
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

/*
 * Range selector: a small preview of the whole history with a window over the part shown in the chart above.
 * Drag the window to move it, drag a handle to change where it starts or ends. A focused handle moves with the arrow
 * keys, Page Up / Page Down (bigger steps), Home and End.
 * The design system has no such component yet (logged as a gap).
 */

type Mode = "start" | "end" | "move";

const TRACK_H = 36;
const HANDLE_HIT_W = 24;
const HANDLE_H = 48;
const PREVIEW_MARGIN = { top: 4, right: 0, bottom: 0, left: 0 };
const Y_DOMAIN: [number, string] = [0, "auto"];
const WRAP_STYLE = { height: HANDLE_H };
const TRACK_STYLE = { top: (HANDLE_H - TRACK_H) / 2, height: TRACK_H };

export function StatsRangeSelector({
  values,
  start,
  end,
  onChange,
  formatLabel,
}: {
  values: number[];
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  formatLabel: (index: number) => string;
}) {
  const n = values.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Mode; x0: number; s0: number; e0: number } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<[number, number] | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  // x = i + 0.5 puts each point in the middle of its band, so the window edges line up with the preview.
  // Extend the first and last values to the edges so the preview fills the whole track.
  const data = useMemo(() => {
    const pts = values.map((v, i) => ({ x: i + 0.5, t: Math.max(0, v) }));
    if (!pts.length) return pts;
    return [{ x: 0, t: pts[0].t }, ...pts, { x: values.length, t: pts[pts.length - 1].t }];
  }, [values]);
  const xDomain = useMemo<[number, number]>(() => [0, n], [n]);

  const left = n ? (start / n) * 100 : 0;
  const right = n ? ((end + 1) / n) * 100 : 100;
  const styles = useMemo(
    () => ({
      dimLeft: { width: left + "%" },
      dimRight: { left: right + "%" },
      window: { left: left + "%", width: right - left + "%", touchAction: "pan-y" as const },
      start: {
        left: left + "%",
        width: HANDLE_HIT_W,
        height: HANDLE_H,
        transform: "translateX(-50%)",
        touchAction: "none" as const,
      },
      end: {
        left: right + "%",
        width: HANDLE_HIT_W,
        height: HANDLE_H,
        transform: "translateX(-50%)",
        touchAction: "none" as const,
      },
    }),
    [left, right]
  );

  const emit = (s: number, e: number) => {
    if (s === start && e === end && !pending.current) return;
    pending.current = [s, e];
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (pending.current) onChange(pending.current[0], pending.current[1]);
      pending.current = null;
    });
  };

  const indexAt = (clientX: number, round: "floor" | "ceil") => {
    const r = trackRef.current!.getBoundingClientRect();
    const raw = ((clientX - r.left) / r.width) * n;
    const i = round === "floor" ? Math.floor(raw) : Math.ceil(raw) - 1;
    return Math.min(n - 1, Math.max(0, i));
  };

  const onDown = (mode: Mode) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x0: e.clientX, s0: start, e0: end };
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !trackRef.current) return;
    if (d.mode === "start") emit(Math.min(indexAt(e.clientX, "floor"), d.e0), d.e0);
    else if (d.mode === "end") emit(d.s0, Math.max(indexAt(e.clientX, "ceil"), d.s0));
    else {
      const w = trackRef.current.getBoundingClientRect().width;
      const span = d.e0 - d.s0;
      const shift = Math.round(((e.clientX - d.x0) / w) * n);
      const s = Math.min(n - 1 - span, Math.max(0, d.s0 + shift));
      emit(s, s + span);
    }
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  // The start handle moves between 0 and the end; the end handle between the start and the last period.
  const onKey = (mode: "start" | "end") => (e: KeyboardEvent<HTMLDivElement>) => {
    const big = Math.max(1, Math.round(n / 10));
    const min = mode === "start" ? 0 : start;
    const max = mode === "start" ? end : n - 1;
    const cur = mode === "start" ? start : end;
    let next: number;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + 1;
    else if (e.key === "PageDown") next = cur - big;
    else if (e.key === "PageUp") next = cur + big;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    next = Math.min(max, Math.max(min, next));
    if (mode === "start") onChange(next, end);
    else onChange(start, next);
  };

  if (n < 2) return null;

  const pointer = { onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <div className="relative select-none" style={WRAP_STYLE}>
      <div ref={trackRef} className="absolute inset-x-0 overflow-hidden rounded-4" style={TRACK_STYLE}>
        <ResponsiveContainer width="100%" height={TRACK_H}>
          <AreaChart data={data} margin={PREVIEW_MARGIN}>
            <XAxis dataKey="x" type="number" domain={xDomain} hide />
            <YAxis hide domain={Y_DOMAIN} />
            <Area
              dataKey="t"
              type="monotone"
              stroke="var(--color-slate-500)"
              strokeWidth={1}
              fill="var(--color-slate-500)"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* dim the part outside the window */}
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-slate-900 opacity-70" style={styles.dimLeft} />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-slate-900 opacity-70"
          style={styles.dimRight}
        />
        {/* the window: drag to move */}
        <div
          className="absolute inset-y-0 cursor-move rounded-4"
          style={styles.window}
          onPointerDown={onDown("move")}
          {...pointer}
        >
          <div className="h-full w-full rounded-4 bg-blue-300 opacity-20" />
        </div>
      </div>
      {(["start", "end"] as const).map((mode) => {
        const idx = mode === "start" ? start : end;
        return (
          <div
            key={mode}
            role="slider"
            tabIndex={0}
            aria-label={mode === "start" ? t`Range start` : t`Range end`}
            aria-valuemin={mode === "start" ? 0 : start}
            aria-valuemax={mode === "start" ? end : n - 1}
            aria-valuenow={idx}
            aria-valuetext={formatLabel(idx)}
            title={formatLabel(idx)}
            className="group absolute top-0 z-[1] flex cursor-ew-resize justify-center outline-none"
            style={styles[mode]}
            onPointerDown={onDown(mode)}
            onKeyDown={onKey(mode)}
            {...pointer}
          >
            <div className="h-full w-3 rounded-full bg-typography-primary group-focus-visible:bg-blue-300" />
          </div>
        );
      })}
    </div>
  );
}
