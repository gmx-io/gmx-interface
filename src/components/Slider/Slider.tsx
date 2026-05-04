import cx from "classnames";
import RcSlider from "rc-slider";
import { ComponentProps, ReactElement, useEffect, useRef } from "react";

import "rc-slider/assets/index.css";
import "./Slider.scss";

type RcSliderProps = ComponentProps<typeof RcSlider>;

type Props = {
  min: number;
  max: number;
  value: number;
  step?: number;
  marks?: RcSliderProps["marks"];
  handle?: RcSliderProps["handle"];
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  qa?: string;
};

/**
 * Fullscreen overlay during drag prevents cross-origin iframes from
 * swallowing mouseup and leaving rc-slider stuck in drag mode.
 */
function useSliderDragOverlay(containerRef: React.RefObject<HTMLDivElement | null>, disabled?: boolean) {
  const activeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      activeCleanupRef.current?.();

      const overlay = document.createElement("div");
      overlay.id = "slider-drag-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:transparent;";
      document.body.appendChild(overlay);

      const cleanup = () => {
        overlay.remove();
        activeCleanupRef.current = null;
        document.removeEventListener("mouseup", cleanup);
        document.removeEventListener("pointerup", cleanup);
        document.removeEventListener("touchend", cleanup);
        document.removeEventListener("pointercancel", cleanup);
      };

      activeCleanupRef.current = cleanup;
      document.addEventListener("mouseup", cleanup);
      document.addEventListener("pointerup", cleanup);
      document.addEventListener("touchend", cleanup);
      document.addEventListener("pointercancel", cleanup);
    };

    el.addEventListener("pointerdown", onPointerDown);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      activeCleanupRef.current?.();
    };
  }, [containerRef, disabled]);
}

export function Slider({
  min,
  max,
  value,
  step = 1,
  marks,
  handle,
  onChange,
  className,
  disabled,
  qa,
}: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  useSliderDragOverlay(containerRef, disabled);

  return (
    <div
      className={cx("Slider", disabled ? "cursor-default" : "cursor-pointer", className)}
      data-qa={qa}
      ref={containerRef}
    >
      <RcSlider
        min={min}
        max={max}
        step={step}
        value={value}
        marks={marks}
        handle={handle}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
