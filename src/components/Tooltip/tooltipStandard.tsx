import cx from "classnames";
import { ElementType, useLayoutEffect, useRef, useState } from "react";

import { TOOLTIP_STANDARD_OPEN_DELAY } from "config/ui";

import type { TooltipProps } from "./Tooltip";

export type StandardTooltipSize = "default" | "wide";

export const STANDARD_TOOLTIP_MAX_WIDTH: Record<StandardTooltipSize, number> = {
  default: 350,
  wide: 480,
};

/**
 * The standard panel and pointer, and how close it may come to the screen edges.
 * The design system site draws open previews with the same look.
 */
export const STANDARD_TOOLTIP_LOOK = {
  popupClassName: "Tooltip-popup--standard",
  seamlessPointer: true,
  viewportPadding: 8,
};

/**
 * Every Tooltip and TooltipWithPortal uses the tooltip standard: the see-through, blurred panel, the seamless pointer,
 * the 150 ms open delay, the enter animation, keyboard and screen reader support, and it stays open while the cursor
 * moves into it. Props the caller sets still win; their classes are added to the standard ones.
 */
export function withStandardDefaults<T extends ElementType | undefined>(props: TooltipProps<T>): TooltipProps<T> {
  const { handle, children, disabled, isHandlerDisabled, content, tooltipClassName, handleClassName } = props;

  // A text trigger or a disabled one has nothing focusable inside, so the handle itself joins the Tab order.
  // A handle that is an element (a button, a link) keeps its own Tab stop, and a turned-off tooltip adds none.
  const handleIsText = handle !== undefined ? isTextNode(handle) : isTextNode(children);
  const handleTabIndex = !disabled && (isHandlerDisabled || handleIsText) ? 0 : undefined;

  return {
    animated: true,
    openDelay: TOOLTIP_STANDARD_OPEN_DELAY,
    flipOnlyToOppositeSide: true,
    seamlessPointer: STANDARD_TOOLTIP_LOOK.seamlessPointer,
    viewportPadding: STANDARD_TOOLTIP_LOOK.viewportPadding,
    closeOnScroll: true,
    keyboardAccessible: true,
    handleTabIndex,
    ...withoutUndefined(props),
    content: typeof content === "string" ? <TooltipPlainText text={content} /> : content,
    tooltipClassName: cx(STANDARD_TOOLTIP_LOOK.popupClassName, tooltipClassName),
    handleClassName: cx("Tooltip-handle--standard", handleClassName),
  } as TooltipProps<T>;
}

function isTextNode(node: unknown) {
  return typeof node === "string" || typeof node === "number";
}

// `openDelay={undefined}` from a caller should keep the standard delay, not turn it off
function withoutUndefined<P extends object>(props: P): Partial<P> {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as Partial<P>;
}

/**
 * Plain text is centered while it fits in one or two lines; longer text aligns left.
 */
export function TooltipPlainText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isShort, setIsShort] = useState(true);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element?.parentElement) {
      return;
    }

    // An inline element has one rect per line. The popup width settles after it opens, so measure again on resize.
    const measure = () => setIsShort(element.getClientRects().length <= 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className={cx({ "text-center": isShort })}>
      <span ref={ref}>{text}</span>
    </div>
  );
}
