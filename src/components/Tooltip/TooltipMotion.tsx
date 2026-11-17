import { type FloatingContext, useTransitionStatus } from "@floating-ui/react";
import { type Side, getSide } from "@floating-ui/utils";
import { type CSSProperties, useEffect } from "react";

import {
  TOOLTIP_EASING,
  TOOLTIP_ENTER_DURATION,
  TOOLTIP_ENTER_OFFSET,
  TOOLTIP_ENTER_SCALE,
  TOOLTIP_EXIT_DURATION,
} from "config/ui";

import { getPointerCenterX } from "./TooltipPointer";

export type TooltipMotionProps = {
  "data-status": ReturnType<typeof useTransitionStatus>["status"];
  "data-side": Side;
  "data-instant": true | undefined;
  style: CSSProperties;
};

const MOTION_VARIABLES = {
  "--tooltip-enter-duration": `${TOOLTIP_ENTER_DURATION}ms`,
  "--tooltip-exit-duration": `${TOOLTIP_EXIT_DURATION}ms`,
  "--tooltip-enter-scale": String(TOOLTIP_ENTER_SCALE),
  "--tooltip-enter-offset": `${TOOLTIP_ENTER_OFFSET}px`,
  "--tooltip-easing": TOOLTIP_EASING,
};

type Props = {
  context: FloatingContext;
  instant: boolean;
  onExited: () => void;
  children: (motion: TooltipMotionProps) => JSX.Element;
};

export function TooltipMotion({ context, instant, onExited, children }: Props) {
  const { isMounted, status } = useTransitionStatus(context, {
    duration: { close: instant ? 0 : TOOLTIP_EXIT_DURATION },
  });

  useEffect(() => {
    if (!isMounted) {
      onExited();
    }
  }, [isMounted, onExited]);

  if (!isMounted) {
    return null;
  }

  const arrowX = context.middlewareData.arrow?.x;
  const pointerX = arrowX === undefined ? "center" : `${getPointerCenterX(arrowX)}px`;

  return children({
    "data-status": status,
    "data-side": getSide(context.placement),
    "data-instant": instant || undefined,
    style: { ...MOTION_VARIABLES, "--tooltip-pointer-x": pointerX } as CSSProperties,
  });
}
