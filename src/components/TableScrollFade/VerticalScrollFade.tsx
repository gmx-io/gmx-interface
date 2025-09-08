import cx from "classnames";
import { PropsWithChildren, useCallback, useMemo, useRef, useState } from "react";
import { useEffectOnce } from "react-use";

const MIN_FADE_AREA = 24; //px
const MIN_SCROLL_END_SPACE = 5; // px

function useVerticalScrollFade() {
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollBottom, setScrollBottom] = useState(0);
  const [maxFadeArea, setMaxFadeArea] = useState(75);

  const setScrolls = useCallback(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) {
      return;
    }

    if (scrollable.scrollHeight > scrollable.clientHeight) {
      setScrollTop(scrollable.scrollTop);
      const bottom = scrollable.scrollHeight - scrollable.clientHeight - scrollable.scrollTop;
      setScrollBottom(bottom < MIN_SCROLL_END_SPACE ? 0 : bottom);
      setMaxFadeArea(scrollable.clientHeight / 10);
    } else {
      setScrollTop(0);
      setScrollBottom(0);
    }
  }, []);

  const setScrollableRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollableRef.current = node;
      if (node) {
        setScrolls();
      }
    },
    [setScrolls]
  );

  useEffectOnce(() => {
    if (!scrollableRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(setScrolls);

    resizeObserver.observe(scrollableRef.current);
    window.addEventListener("resize", setScrolls);
    scrollableRef.current?.addEventListener("scroll", setScrolls);

    return () => {
      window.removeEventListener("resize", setScrolls);
      scrollableRef.current?.removeEventListener("scroll", setScrolls);
      resizeObserver.disconnect();
    };
  });

  const topStyles = useMemo(() => {
    return {
      height: `${Math.max(MIN_FADE_AREA, Math.min(scrollTop + 8, maxFadeArea))}px`,
    };
  }, [scrollTop, maxFadeArea]);

  const bottomStyles = useMemo(() => {
    return {
      height: `${Math.max(MIN_FADE_AREA, Math.min(scrollBottom + 8, maxFadeArea))}px`,
    };
  }, [scrollBottom, maxFadeArea]);

  return {
    scrollableRef,
    setScrollableRef,
    scrollTop,
    scrollBottom,
    topStyles,
    bottomStyles,
  };
}

function VerticalScrollFadeControls({
  scrollTop,
  scrollBottom,
  topStyles,
  bottomStyles,
}: {
  scrollTop: number;
  scrollBottom: number;
  topStyles: React.CSSProperties;
  bottomStyles: React.CSSProperties;
}) {
  return (
    <div className="pointer-events-none absolute flex h-full w-full flex-col justify-between">
      <div
        className={cx("z-[120] max-h-50 w-full bg-gradient-to-t from-[transparent] to-slate-900 transition-opacity", {
          "opacity-0": scrollTop <= 0,
          "opacity-100": scrollTop > 0,
        })}
        style={topStyles}
      />
      <div
        className={cx("z-[120] max-h-50 w-full bg-gradient-to-b from-[transparent] to-slate-900 transition-opacity", {
          "opacity-0": scrollBottom <= 0,
          "opacity-100": scrollBottom > 0,
        })}
        style={bottomStyles}
      />
    </div>
  );
}

export function VerticalScrollFadeContainer({ children, className }: PropsWithChildren<{ className?: string }>) {
  const scrollFade = useVerticalScrollFade();

  return (
    <div className="relative flex grow flex-col overflow-y-auto">
      <VerticalScrollFadeControls {...scrollFade} />
      <div className={cx("overflow-y-auto", className)} ref={scrollFade.setScrollableRef}>
        {children}
      </div>
    </div>
  );
}
