// Tester for the Stats page design review: data states, shown only outside gmx.io. Never merged.
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";

import { isDevelopment } from "config/env";

import Button from "components/Button/Button";

import type { StatsDataState } from "../statsDataState";
import { setStatsTester, useStatsTester, type StatsTesterPosition } from "./statsTester";

const STATES: StatsDataState[] = ["ready", "loading", "empty"];

const STATE_PRESETS: Record<StatsDataState, { label: string; hint: string }> = {
  ready: { label: "Mock data", hint: "The page with the mock numbers, as it looks when every source has answered" },
  loading: {
    label: "Loading",
    hint: "Until every source has answered (at most 5 s): figures show a dash, charts, tables and maps the loader",
  },
  empty: {
    label: "No data",
    hint: "A source returned no data: figures show a dash, charts, tables and maps say No data available",
  },
};

const DEFAULT_POSITION_CLASSNAME = "bottom-16 right-16";
const EDGE = 8;
const CLICK_THRESHOLD = 4;

function clamp(position: StatsTesterPosition, element: HTMLElement): StatsTesterPosition {
  const maxX = Math.max(EDGE, window.innerWidth - element.offsetWidth - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - element.offsetHeight - EDGE);

  return {
    x: Math.min(Math.max(position.x, EDGE), maxX),
    y: Math.min(Math.max(position.y, EDGE), maxY),
  };
}

// Drag the Tester by a handle. onPointerUp returns true when the gesture was a click, not a drag.
function useDraggable(savedPosition: StatsTesterPosition | undefined) {
  const elementRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number; moved: boolean }>();
  const [livePosition, setLivePosition] = useState<StatsTesterPosition>();

  const position = livePosition ?? savedPosition;

  // Keep the Tester on screen when it opens, collapses or the window shrinks.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !savedPosition) return;

    const keepInView = () => {
      const next = clamp(savedPosition, element);
      if (next.x !== savedPosition.x || next.y !== savedPosition.y) setStatsTester({ position: next });
    };

    keepInView();
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  });

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const element = elementRef.current;
    if (!element || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;

    const rect = element.getBoundingClientRect();
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: rect.left,
      startY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const element = elementRef.current;
    if (!drag || !element) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(dx, dy) < CLICK_THRESHOLD) return;

    drag.moved = true;
    setLivePosition(clamp({ x: drag.startX + dx, y: drag.startY + dy }, element));
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      dragRef.current = undefined;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag) return false;

      if (drag.moved && livePosition) {
        setStatsTester({ position: livePosition });
        setLivePosition(undefined);
      }

      return !drag.moved;
    },
    [livePosition]
  );

  const style: CSSProperties | undefined = position ? { left: position.x, top: position.y } : undefined;
  const positionClassName = position ? "" : DEFAULT_POSITION_CLASSNAME;

  return {
    elementRef,
    style,
    positionClassName,
    isDragging: Boolean(livePosition),
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

export function StatsTesterPanel() {
  const { enabled, state, isCollapsed, position } = useStatsTester();
  const drag = useDraggable(position);

  if (!isDevelopment() || !enabled) return null;

  const dragHandlers = {
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
  };

  if (isCollapsed) {
    return createPortal(
      <button
        ref={(element) => {
          drag.elementRef.current = element;
        }}
        type="button"
        style={drag.style}
        className={`fixed z-[1100] flex touch-none select-none items-center gap-6 rounded-full border-1/2 border-slate-600 bg-slate-900 px-12 py-6 text-13 font-medium text-typography-primary hover:border-blue-300 ${drag.positionClassName} ${drag.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        title="Click to open, drag to move the local tester"
        {...dragHandlers}
        onPointerUp={(event) => {
          if (drag.onPointerUp(event)) setStatsTester({ isCollapsed: false });
        }}
        onClick={(event) => {
          if (event.detail === 0) setStatsTester({ isCollapsed: false });
        }}
      >
        Tester
        <span className="text-blue-300">· {STATE_PRESETS[state].label}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <section
      ref={(element) => {
        drag.elementRef.current = element;
      }}
      style={drag.style}
      className={`fixed z-[1100] flex w-[320px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-8 border-1/2 border-slate-600 bg-slate-900 text-13 shadow-lg ${drag.positionClassName}`}
      aria-label="Tester"
    >
      <div
        className={`flex touch-none select-none items-center justify-between gap-8 border-b border-slate-600 p-12 ${drag.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        title="Drag to move. Double-click to put it back in the corner."
        {...dragHandlers}
        onPointerUp={drag.onPointerUp}
        onDoubleClick={() => setStatsTester({ position: undefined })}
      >
        <div className="min-w-0">
          <div className="text-14 font-medium text-typography-primary">Tester</div>
          <div className="truncate text-12 text-blue-300">{STATE_PRESETS[state].label}</div>
        </div>
        <div data-no-drag>
          <Button variant="ghost" size="small" onClick={() => setStatsTester({ isCollapsed: true })}>
            Hide
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-12">
        <div className="text-12 font-medium uppercase text-typography-secondary">Stats data state</div>
        <div className="flex flex-wrap gap-6">
          {STATES.map((option) => (
            <Button
              key={option}
              variant={option === state ? "primary" : "secondary"}
              size="small"
              title={STATE_PRESETS[option].hint}
              onClick={() => setStatsTester({ state: option })}
            >
              {STATE_PRESETS[option].label}
            </Button>
          ))}
        </div>
        <div className="text-12 text-typography-secondary">{STATE_PRESETS[state].hint}.</div>
        <div className="text-12 text-typography-secondary">
          Every number on the page is mock data. Real data comes with the build task.
        </div>
      </div>
    </section>,
    document.body
  );
}
