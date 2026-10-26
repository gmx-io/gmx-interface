import cx from "classnames";
import { ElementType, ReactNode, useLayoutEffect, useRef, useState } from "react";

import { TOOLTIP_STANDARD_OPEN_DELAY } from "config/ui";

import Tooltip, { type TooltipProps } from "./Tooltip";

export type StandardTooltipSize = "default" | "wide";

export type StandardTooltipPosition = "bottom-start" | "bottom" | "bottom-end" | "top-start" | "top" | "top-end";

export type StandardTooltipVariant = "underline" | "iconStroke" | "none";

export const STANDARD_TOOLTIP_MAX_WIDTH: Record<StandardTooltipSize, number> = {
  default: 350,
  wide: 480,
};

export const STANDARD_TOOLTIP_LOOK = {
  popupClassName: "Tooltip-popup--standard",
  seamlessPointer: true,
  viewportPadding: 8,
};

type Props<T extends ElementType | undefined> = Omit<
  TooltipProps<T>,
  | "withPortal"
  | "position"
  | "variant"
  | "tooltipClassName"
  | "maxAllowedWidth"
  | "animated"
  | "flipOnlyToOppositeSide"
  | "seamlessPointer"
  | "viewportPadding"
  | "closeOnScroll"
  | "keyboardAccessible"
  | "handleTabIndex"
  | "describesTrigger"
> & {
  position?: StandardTooltipPosition;
  variant?: StandardTooltipVariant;
  size?: StandardTooltipSize;
  type?: "description" | "label";
};

export default function StandardTooltip<T extends ElementType | undefined>({
  size = "default",
  type = "description",
  interactive = true,
  openDelay = TOOLTIP_STANDARD_OPEN_DELAY,
  handleClassName,
  content,
  renderContent,
  ...props
}: Props<T>) {
  return (
    <Tooltip
      {...(props as TooltipProps<T>)}
      withPortal
      content={content === undefined ? undefined : toPlainText(content)}
      renderContent={renderContent && (() => toPlainText(renderContent()))}
      animated
      interactive={interactive}
      openDelay={openDelay}
      maxAllowedWidth={STANDARD_TOOLTIP_MAX_WIDTH[size]}
      flipOnlyToOppositeSide
      tooltipClassName={STANDARD_TOOLTIP_LOOK.popupClassName}
      handleClassName={cx("Tooltip-handle--standard", handleClassName)}
      seamlessPointer={STANDARD_TOOLTIP_LOOK.seamlessPointer}
      viewportPadding={STANDARD_TOOLTIP_LOOK.viewportPadding}
      closeOnScroll
      keyboardAccessible
      describesTrigger={type === "description"}
    />
  );
}

function toPlainText(content: ReactNode) {
  return typeof content === "string" ? <PlainText text={content} /> : content;
}

function PlainText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isShort, setIsShort] = useState(true);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element?.parentElement) {
      return;
    }

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
