import {
  FloatingArrow,
  type Middleware,
  type Placement,
  type ReferenceType,
  arrow,
  autoUpdate,
  useFloating,
} from "@floating-ui/react";
import cx from "classnames";
import { type CSSProperties, type ReactNode, useMemo, useRef } from "react";

import StandardTooltip, {
  STANDARD_TOOLTIP_LOOK,
  STANDARD_TOOLTIP_MAX_WIDTH,
  type StandardTooltipSize,
} from "components/Tooltip/StandardTooltip";
import {
  DEFAULT_TOOLTIP_ARROW_CLASSNAME,
  DEFAULT_TOOLTIP_MAX_WIDTH,
  TOOLTIP_OFFSET,
  type TooltipPosition,
} from "components/Tooltip/Tooltip";
import { getPointerGapX, TooltipPointer } from "components/Tooltip/TooltipPointer";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

// Tooltips drawn open on the page, for the docs: the real trigger, panel, pointer and content, no hover needed.

type TriggerVariant = "underline" | "iconStroke";

// How a tooltip family draws its panel and pointer. Required keys, so a renamed key in a look fails to compile.
export type TooltipLook = {
  popupClassName: string;
  // The standard pointer (TooltipPointer) instead of the app's default arrow
  seamlessPointer: boolean;
  // Keeps the panel this far inside the screen edges, like the live tooltip
  viewportPadding?: number;
};

const LEGACY_LOOK: TooltipLook = {
  popupClassName: "",
  seamlessPointer: false,
};

// Where things are, for drawings on top of the panel
export type TooltipPreviewGeometry = {
  // The pointer's x inside the panel's border
  arrowX: number;
  triggerWidth: number;
  triggerHeight: number;
};

type TriggerSize = { width: number; height: number };

// Shares the trigger's size with the overlay
const triggerSize: Middleware = {
  name: "triggerSize",
  fn: ({ rects }) => ({ data: { width: rects.reference.width, height: rects.reference.height } satisfies TriggerSize }),
};

// The trigger and the panel line up at the start, center or end, like the live tooltip
const ALIGN_CLASSNAMES: Record<string, string> = {
  start: "items-start",
  end: "items-end",
  center: "items-center",
};

// Nothing in a preview moves on scroll, so it only follows size changes (column width, fonts)
function followSizeChanges(reference: ReferenceType, floating: HTMLElement, update: () => void) {
  return autoUpdate(reference, floating, update, { ancestorScroll: false, layoutShift: false });
}

type TooltipPreviewProps = {
  trigger: ReactNode;
  content: ReactNode;
  look: TooltipLook;
  maxWidth: number;
  // Below the trigger only; "bottom-start" by default, like the live tooltip
  position?: Extract<TooltipPosition, "bottom-start" | "bottom" | "bottom-end">;
  // Extra drawing on top of the panel (the anatomy markers), once the pointer is placed
  renderOverlay?: (geometry: TooltipPreviewGeometry) => ReactNode;
};

/**
 * The trigger with its tooltip open below it. floating-ui places the pointer exactly as in the live tooltip,
 * including the shift it makes for triggers too narrow to center the pointer on; the panel stays in the page flow.
 */
export function TooltipPreview({
  trigger,
  content,
  look,
  maxWidth,
  position = "bottom-start",
  renderOverlay,
}: TooltipPreviewProps) {
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, context, middlewareData } = useFloating({
    open: true,
    placement: position as Placement,
    middleware: [arrow({ element: arrowRef, padding: 6 }), triggerSize],
    whileElementsMounted: followSizeChanges,
  });

  const arrowX = middlewareData.arrow?.x;
  const alignmentOffset = middlewareData.arrow?.alignmentOffset ?? 0;
  const triggerRect = middlewareData[triggerSize.name] as TriggerSize | undefined;
  const triggerWidth = triggerRect?.width;
  const triggerHeight = triggerRect?.height;

  // The trigger and its panel form a group as wide as the wider of the two, capped by the live width rule
  // (never wider than the screen allows) and by this column. So an end-aligned pair still starts at the column's start.
  const groupStyle = useMemo<CSSProperties>(() => {
    const screenLimit = look.viewportPadding === undefined ? "" : `, calc(100vw - ${look.viewportPadding * 2}px)`;
    return { gap: TOOLTIP_OFFSET, maxWidth: `min(${maxWidth}px${screenLimit}, 100%)` };
  }, [maxWidth, look.viewportPadding]);
  // Inline max-width beats the panel classes' own limits. z-index 0: live tooltips and menus open above it.
  const popupStyle = useMemo(
    () =>
      ({
        maxWidth: "100%",
        zIndex: 0,
        transform: alignmentOffset ? `translateX(${alignmentOffset}px)` : undefined,
        // Where the border opens under the standard pointer, as on the live tooltip
        "--tooltip-gap-x": look.seamlessPointer && arrowX !== undefined ? `${getPointerGapX(arrowX)}px` : undefined,
      }) as CSSProperties,
    [alignmentOffset, look.seamlessPointer, arrowX]
  );

  const geometry = useMemo(
    () =>
      arrowX === undefined || triggerWidth === undefined || triggerHeight === undefined
        ? undefined
        : { arrowX, triggerWidth, triggerHeight },
    [arrowX, triggerWidth, triggerHeight]
  );

  const alignment = position.split("-")[1] ?? "center";

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className={cx("flex w-fit min-w-0 flex-col", ALIGN_CLASSNAMES[alignment])} style={groupStyle}>
        <div ref={refs.setReference} className="flex">
          {trigger}
        </div>
        <div
          ref={refs.setFloating}
          className={cx("Tooltip-popup relative", look.popupClassName)}
          style={popupStyle}
          // Below the trigger, as the live tooltip marks its side
          data-side="bottom"
        >
          {look.seamlessPointer ? (
            <TooltipPointer ref={arrowRef} side="bottom" arrowX={arrowX} />
          ) : (
            <FloatingArrow ref={arrowRef} context={context} className={DEFAULT_TOOLTIP_ARROW_CLASSNAME} />
          )}
          {content}
          {geometry && renderOverlay?.(geometry)}
        </div>
      </div>
    </div>
  );
}

type PreviewProps = {
  handle: ReactNode;
  variant?: TriggerVariant;
  position?: TooltipPreviewProps["position"];
  content: ReactNode;
};

/**
 * A StandardTooltip, open. The trigger is a turned-off StandardTooltip, so it looks real and doesn't open on hover.
 */
export function StandardTooltipPreview({
  handle,
  variant,
  position,
  size = "default",
  content,
}: PreviewProps & { size?: StandardTooltipSize }) {
  return (
    <TooltipPreview
      trigger={<StandardTooltip handle={handle} variant={variant} disabled />}
      content={content}
      look={STANDARD_TOOLTIP_LOOK}
      maxWidth={STANDARD_TOOLTIP_MAX_WIDTH[size]}
      position={position}
    />
  );
}

/**
 * A tooltip as the app draws it before the standard (TooltipWithPortal with its defaults), open.
 */
export function LegacyTooltipPreview({
  handle,
  variant,
  position,
  maxWidth = DEFAULT_TOOLTIP_MAX_WIDTH,
  content,
}: PreviewProps & { maxWidth?: number }) {
  return (
    <TooltipPreview
      trigger={<TooltipWithPortal handle={handle} variant={variant} disabled />}
      content={content}
      look={LEGACY_LOOK}
      maxWidth={maxWidth}
      position={position}
    />
  );
}
