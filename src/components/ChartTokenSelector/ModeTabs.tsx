import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { TradeMode } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { useBreakpoints } from "lib/useBreakpoints";

type Props = {
  mode: TradeMode;
  setMode: (mode: TradeMode) => void;
};

export function ModeTabs({ mode, setMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const perpRef = useRef<HTMLButtonElement>(null);
  const swapRef = useRef<HTMLButtonElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  const updateThumb = useCallback(() => {
    const activeEl = mode === "perp" ? perpRef.current : swapRef.current;
    const container = containerRef.current;
    if (!activeEl || !container) return;
    const c = container.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    if (!c.width || !r.width) return;
    setThumb({ left: r.left - c.left, width: r.width });
  }, [mode]);

  const { isMobile } = useBreakpoints();

  useLayoutEffect(() => {
    updateThumb();

    const frame = requestAnimationFrame(updateThumb);
    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateThumb);

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      const activeEl = mode === "perp" ? perpRef.current : swapRef.current;
      if (activeEl) {
        resizeObserver.observe(activeEl);
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [isMobile, mode, updateThumb]);

  const thumbStyle = useMemo(
    () => (thumb ? { left: `${thumb.left}px`, width: isMobile ? "50%" : `${thumb.width}px` } : undefined),
    [thumb, isMobile]
  );

  const itemClass =
    "text-body-small relative z-10 flex h-full items-center justify-center rounded-6 px-10 py-4 font-medium transition-colors max-md:w-[50%] max-md:px-0";

  return (
    <div
      ref={containerRef}
      className="relative flex h-32 shrink-0 items-center gap-2 rounded-8 bg-slate-800 p-2 max-md:w-full"
    >
      {thumbStyle && (
        <div
          aria-hidden
          className="absolute bottom-2 top-2 rounded-6 bg-slate-600 transition-all duration-200 ease-out"
          style={thumbStyle}
        />
      )}
      <button
        ref={perpRef}
        type="button"
        className={cx(itemClass, {
          "text-typography-primary": mode === "perp",
          "text-typography-secondary hover:text-typography-primary": mode !== "perp",
        })}
        onClick={() => setMode("perp")}
        data-selected={mode === "perp"}
      >
        <Trans>Perpetuals</Trans>
      </button>
      <button
        ref={swapRef}
        type="button"
        className={cx(itemClass, {
          "text-typography-primary": mode === "swap",
          "text-typography-secondary hover:text-typography-primary": mode !== "swap",
        })}
        onClick={() => setMode("swap")}
        data-selected={mode === "swap"}
      >
        <Trans>Swap</Trans>
      </button>
    </div>
  );
}
