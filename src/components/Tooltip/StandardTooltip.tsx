import cx from "classnames";
import { ElementType } from "react";

import { TOOLTIP_STANDARD_OPEN_DELAY } from "config/ui";

import { TooltipBase, type TooltipProps } from "./Tooltip";
import {
  STANDARD_TOOLTIP_LOOK,
  STANDARD_TOOLTIP_MAX_WIDTH,
  type StandardTooltipSize,
  TooltipPlainText,
} from "./tooltipStandard";

import "./Tooltip.scss";

export { STANDARD_TOOLTIP_LOOK, STANDARD_TOOLTIP_MAX_WIDTH, type StandardTooltipSize };

type Props<T extends ElementType | undefined> = Omit<
  TooltipProps<T>,
  | "withPortal"
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
 * Tooltip standard: one see-through, blurred panel that follows the app theme, two sizes, placement above or below the trigger,
 * 150 ms open delay, an origin-aware enter animation and a normal cursor over the trigger.
 * It stays open while the cursor moves into it, so links work and text can be copied.
 * Pass `interactive={false}` to let the cursor pass through.
 * Tooltip and TooltipWithPortal use the same standard; StandardTooltip adds the two sizes and the `type` prop.
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
    <TooltipBase
      {...(props as TooltipProps<T>)}
      withPortal
      content={typeof content === "string" ? <TooltipPlainText text={content} /> : content}
      animated
      interactive={interactive}
      openDelay={openDelay}
      maxAllowedWidth={STANDARD_TOOLTIP_MAX_WIDTH[size]}
      flipOnlyToOppositeSide
      tooltipClassName={cx(STANDARD_TOOLTIP_LOOK.popupClassName, tooltipClassName)}
      handleClassName={cx("Tooltip-handle--standard", handleClassName)}
      seamlessPointer={STANDARD_TOOLTIP_LOOK.seamlessPointer}
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
