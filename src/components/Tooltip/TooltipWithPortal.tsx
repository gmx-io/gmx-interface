import {
  FloatingArrow,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import cx from "classnames";
import React, { PropsWithChildren, useMemo, useRef, useState } from "react";

import { DEFAULT_TOOLTIP_POSITION, TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";
import { TooltipPosition } from "./Tooltip";
import { DEFAULT_ARROW_COLOR, arrowColor } from "./arrowColor";

import "./Tooltip.scss";

type Props = PropsWithChildren<{
  /**
   * Takes precedence over `children`
   */
  handle?: React.ReactNode;
  renderContent?: () => React.ReactNode;
  content?: React.ReactNode | undefined | null;
  position?: TooltipPosition;
  trigger?: string;
  className?: string;
  portalClassName?: string;
  popupClassName?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
  isHandlerDisabled?: boolean;
  fitHandleWidth?: boolean;
  closeOnDoubleClick?: boolean;
  openDelay?: number;
  closeDelay?: number;
  shouldStopPropagation?: boolean;
  maxAllowedWidth?: number;
  disabled?: boolean;
}>;

export default function TooltipWithPortal({
  handle,
  renderContent,
  content,
  position = DEFAULT_TOOLTIP_POSITION,
  className,
  portalClassName,
  popupClassName,
  disableHandleStyle,
  handleClassName,
  isHandlerDisabled,
  fitHandleWidth,
  closeOnDoubleClick,
  openDelay = TOOLTIP_OPEN_DELAY,
  closeDelay = TOOLTIP_CLOSE_DELAY,
  shouldStopPropagation,
  maxAllowedWidth = 350,
  disabled,
  children,
}: Props) {
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, floatingStyles, context, middlewareData } = useFloating({
    middleware: [
      offset(10),
      flip(),
      shift(),
      size({
        apply: (state) => {
          if (maxAllowedWidth) {
            Object.assign(state.elements.floating.style, {
              maxWidth: `${maxAllowedWidth}px`,
            });
          }

          if (fitHandleWidth) {
            Object.assign(state.elements.floating.style, {
              maxWidth: `${state.rects.reference.width}px`,
              minWidth: `${state.rects.reference.width}px`,
            });
          }
        },
      }),
      arrow({ element: arrowRef }),
      arrowColor(),
    ],
    placement: position,
    whileElementsMounted: autoUpdate,
    open: visible,
    onOpenChange: setVisible,
  });

  const color = middlewareData?.color?.color ?? DEFAULT_ARROW_COLOR;

  const hover = useHover(context, {
    enabled: !disabled,
    delay: {
      open: openDelay,
      close: closeDelay,
    },
  });
  const click = useClick(context, {
    enabled: !disabled && closeOnDoubleClick,
    toggle: closeOnDoubleClick,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click]);

  const referenceProps = useMemo(
    () =>
      getReferenceProps({
        onClick: (e) => {
          if (shouldStopPropagation) {
            e.stopPropagation();
          }
        },
      }),
    [getReferenceProps, shouldStopPropagation]
  );
  const floatingProps = useMemo(() => getFloatingProps({ onClick: (e) => e.stopPropagation() }), [getFloatingProps]);

  return (
    <span className={cx("Tooltip", className)}>
      <span
        className={cx({ "Tooltip-handle": !disableHandleStyle }, handleClassName)}
        ref={refs.setReference}
        {...referenceProps}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {isHandlerDisabled ? (
          <div className="Tooltip-disabled-wrapper">{handle || children}</div>
        ) : (
          <>{handle || children}</>
        )}
      </span>

      {visible && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={cx("Tooltip-popup z-[1001]", portalClassName, popupClassName)}
            {...floatingProps}
          >
            <FloatingArrow ref={arrowRef} context={context} fill={color} />
            {content ?? renderContent?.()}
          </div>
        </FloatingPortal>
      )}
    </span>
  );
}
