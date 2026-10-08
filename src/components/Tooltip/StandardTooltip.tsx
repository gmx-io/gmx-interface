import cx from "classnames";
import { ElementType, useLayoutEffect, useRef, useState } from "react";

import { TOOLTIP_STANDARD_OPEN_DELAY } from "config/ui";

import type { TooltipProps } from "./Tooltip";
import TooltipWithPortal from "./TooltipWithPortal";

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
  popupClassName: "Tooltip-popup--standard theme-dark",
  arrowClassName: "Tooltip-arrow--standard",
  arrowStrokeWidth: 1,
  viewportPadding: 8,
};

type Props<T extends ElementType | undefined> = Omit<
  TooltipProps<T>,
  | "withPortal"
  | "maxAllowedWidth"
  | "animated"
  | "flipOnlyToOppositeSide"
  | "arrowClassName"
  | "arrowStrokeWidth"
  | "viewportPadding"
  | "closeOnScroll"
  | "keyboardAccessible"
  | "handleTabIndex"
  | "describesTrigger"
> & {
  /**
   * `wide` is only for multi-column tables.
   */
  size?: StandardTooltipSize;
  /**
   * `label` when the tooltip only repeats the trigger's own name (an icon button with the same aria-label),
   * so screen readers don't read it twice. Defaults to `description`: screen readers read it after the trigger.
   */
  type?: "description" | "label";
};

/**
 * Tooltip standard: one dark panel in both themes, two sizes, placement above or below the trigger,
 * 200 ms open delay, an origin-aware enter animation and a normal cursor over the trigger.
 * It stays open while the cursor moves into it, so links work and text can be copied.
 * Pass `interactive={false}` to let the cursor pass through.
 */
export default function StandardTooltip<T extends ElementType | undefined>({
  size = "default",
  type = "description",
  interactive = true,
  openDelay = TOOLTIP_STANDARD_OPEN_DELAY,
  tooltipClassName,
  handleClassName,
  content,
  ...props
}: Props<T>) {
  return (
    <TooltipWithPortal
      {...(props as Omit<TooltipProps<T>, "withPortal">)}
      content={typeof content === "string" ? <PlainText text={content} /> : content}
      animated
      interactive={interactive}
      openDelay={openDelay}
      maxAllowedWidth={STANDARD_TOOLTIP_MAX_WIDTH[size]}
      flipOnlyToOppositeSide
      tooltipClassName={cx(STANDARD_TOOLTIP_LOOK.popupClassName, tooltipClassName)}
      handleClassName={cx("Tooltip-handle--standard", handleClassName)}
      arrowClassName={STANDARD_TOOLTIP_LOOK.arrowClassName}
      arrowStrokeWidth={STANDARD_TOOLTIP_LOOK.arrowStrokeWidth}
      viewportPadding={STANDARD_TOOLTIP_LOOK.viewportPadding}
      closeOnScroll
      keyboardAccessible
      describesTrigger={type === "description"}
      // A text or disabled trigger has nothing focusable inside, so the handle itself joins the Tab order.
      // A turned-off tooltip has nothing to show, so it adds no Tab stop.
      handleTabIndex={props.disabled || (props.children && !props.isHandlerDisabled) ? undefined : 0}
    />
  );
}

/**
 * Plain text is centered while it fits in one or two lines; longer text aligns left.
 */
function PlainText({ text }: { text: string }) {
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
