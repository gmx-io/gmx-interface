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

type TriggerVariant = "underline" | "iconStroke";

export type TooltipLook = {
  popupClassName: string;
  seamlessPointer: boolean;
  viewportPadding?: number;
};

const LEGACY_LOOK: TooltipLook = {
  popupClassName: "",
  seamlessPointer: false,
};

export type TooltipPreviewGeometry = {
  arrowX: number;
  triggerWidth: number;
  triggerHeight: number;
};

type TriggerSize = { width: number; height: number };

const triggerSize: Middleware = {
  name: "triggerSize",
  fn: ({ rects }) => ({ data: { width: rects.reference.width, height: rects.reference.height } satisfies TriggerSize }),
};

const ALIGN_CLASSNAMES: Record<string, string> = {
  start: "items-start",
  end: "items-end",
  center: "items-center",
};

function followSizeChanges(reference: ReferenceType, floating: HTMLElement, update: () => void) {
  return autoUpdate(reference, floating, update, { ancestorScroll: false, layoutShift: false });
}

type TooltipPreviewProps = {
  trigger: ReactNode;
  content: ReactNode;
  look: TooltipLook;
  maxWidth: number;
  position?: Extract<TooltipPosition, "bottom-start" | "bottom" | "bottom-end">;
  renderOverlay?: (geometry: TooltipPreviewGeometry) => ReactNode;
};

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

  const groupStyle = useMemo<CSSProperties>(() => {
    const screenLimit = look.viewportPadding === undefined ? "" : `, calc(100vw - ${look.viewportPadding * 2}px)`;
    return { gap: TOOLTIP_OFFSET, maxWidth: `min(${maxWidth}px${screenLimit}, 100%)` };
  }, [maxWidth, look.viewportPadding]);
  const popupStyle = useMemo(
    () =>
      ({
        maxWidth: "100%",
        zIndex: 0,
        transform: alignmentOffset ? `translateX(${alignmentOffset}px)` : undefined,
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
