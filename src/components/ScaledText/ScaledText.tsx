import cx from "classnames";
import { useMemo } from "react";
import { useMeasure } from "react-use";

export function ScaledText({ children, className }: { children: React.ReactNode; className?: string }) {
  const [wrapperRef, { width: wrapperWidth }] = useMeasure<HTMLDivElement>();
  const [textRef, { width: textWidth }] = useMeasure<HTMLSpanElement>();

  const isMeasured = wrapperWidth > 0;
  const scale = isMeasured && textWidth > wrapperWidth ? wrapperWidth / textWidth : 1;
  const scaleStyle = useMemo(() => (scale < 1 ? { transform: `scale(${scale})` } : undefined), [scale]);

  return (
    <div ref={wrapperRef} className="min-w-0 overflow-hidden">
      <span
        ref={textRef}
        className={cx("inline-block origin-left whitespace-nowrap", { "opacity-0": !isMeasured }, className)}
        style={scaleStyle}
      >
        {children}
      </span>
    </div>
  );
}
