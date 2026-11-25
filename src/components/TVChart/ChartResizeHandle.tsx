import { t } from "@lingui/macro";
import cx from "classnames";
import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { CHART_DRAG_THRESHOLD, CHART_HEIGHT_KEYBOARD_STEP, CHART_MIN_HEIGHT, clampChartHeight } from "./chartHeight";
import { useChartHeight } from "./useChartHeight";

// Set on the body during a drag: a resize cursor everywhere, and the chart iframe does not take the pointer
const DRAGGING_CLASS_NAME = "ChartResizeHandle-dragging";

type DragState = {
  pointerId: number;
  startY: number;
  startHeight: number;
  maxHeight: number;
  height: number;
  isMoved: boolean;
};

function setContainerHeight(container: HTMLElement | null, height: number | undefined) {
  if (!container) {
    return;
  }

  const value = height === undefined ? "" : `${height}px`;
  container.style.height = value;
  container.style.minHeight = value;
}

/**
 * Drag handle under the chart on the desktop trade page (TRD-212), built as a WAI-ARIA window splitter.
 * It owns the inline height of the chart container. During a drag it writes the height straight to the DOM,
 * so the page does not re-render on each pointer move, and it saves the height on release.
 */
export function ChartResizeHandle({ containerRef }: { containerRef: RefObject<HTMLDivElement> }) {
  const { chartHeight, maxHeight, getMaxHeight, saveChartHeight, resetChartHeight } = useChartHeight(containerRef);
  const dragRef = useRef<DragState | undefined>(undefined);
  const frameRef = useRef<number | undefined>(undefined);
  const [isPressed, setIsPressed] = useState(false);

  useLayoutEffect(() => {
    setContainerHeight(containerRef.current, chartHeight);
  }, [containerRef, chartHeight]);

  useLayoutEffect(() => {
    const container = containerRef.current;

    return () => {
      setContainerHeight(container, undefined);
      document.body.classList.remove(DRAGGING_CLASS_NAME);

      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [containerRef]);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    dragRef.current = undefined;
    setIsPressed(false);
    document.body.classList.remove(DRAGGING_CLASS_NAME);

    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    if (drag.isMoved) {
      // The saved height can equal the one before the drag, and then React does not write the style again
      setContainerHeight(containerRef.current, saveChartHeight(drag.height));
    }
  }, [containerRef, saveChartHeight]);

  useEffect(() => {
    if (!isPressed) {
      return;
    }

    window.addEventListener("blur", endDrag);

    return () => window.removeEventListener("blur", endDrag);
  }, [isPressed, endDrag]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: chartHeight,
      maxHeight: getMaxHeight(),
      height: chartHeight,
      isMoved: false,
    };
    setIsPressed(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const deltaY = event.clientY - drag.startY;

    if (!drag.isMoved) {
      if (Math.abs(deltaY) < CHART_DRAG_THRESHOLD) {
        return;
      }

      drag.isMoved = true;
      document.body.classList.add(DRAGGING_CLASS_NAME);
    }

    drag.height = clampChartHeight(drag.startHeight + deltaY, drag.maxHeight);

    if (frameRef.current === undefined) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = undefined;

        if (dragRef.current) {
          setContainerHeight(containerRef.current, dragRef.current.height);
        }
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.key === "ArrowUp" ? -CHART_HEIGHT_KEYBOARD_STEP : CHART_HEIGHT_KEYBOARD_STEP;
      saveChartHeight(clampChartHeight(chartHeight + step, getMaxHeight()));
    } else if (event.key === "Enter") {
      event.preventDefault();
      resetChartHeight();
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t`Resize chart`}
      aria-valuemin={CHART_MIN_HEIGHT}
      aria-valuemax={maxHeight}
      aria-valuenow={chartHeight}
      aria-valuetext={t`${chartHeight} pixels`}
      tabIndex={0}
      className={cx(
        // Centered on the 8 px gap under the chart: 12 px tall, 24 px on touch screens
        "group absolute inset-x-0 top-[calc(100%+4px)] z-10 flex h-12 -translate-y-1/2 cursor-row-resize touch-none",
        "items-center justify-center rounded-4 [@media(pointer:coarse)]:h-24",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={resetChartHeight}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cx(
          "h-4 rounded-full transition-[width,background-color] duration-150",
          isPressed ? "w-64 bg-slate-100" : "w-44 bg-slate-500 group-hover:w-64 group-hover:bg-slate-100"
        )}
      />
    </div>
  );
}
