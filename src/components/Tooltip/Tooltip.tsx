import {
  FloatingArrow,
  FloatingPortal,
  Placement,
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
import {
  ComponentType,
  HTMLProps,
  MouseEvent,
  PropsWithChildren,
  ReactHTML,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

import { DEFAULT_TOOLTIP_POSITION, TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";
import { DEFAULT_ARROW_COLOR, arrowColor } from "./arrowColor";

import "./Tooltip.scss";

export type TooltipPosition = Placement;

export type TooltipProps<T extends PropsWithChildren = PropsWithChildren> = {
  /**
   * Takes precedence over `children`
   */
  handle?: ReactNode;
  renderContent?: () => ReactNode;
  content?: ReactNode | undefined | null;
  position?: TooltipPosition;
  disableHandleStyle?: boolean;
  className?: string;
  handleClassName?: string;
  tooltipClassName?: string;
  /**
   * Disables interactions with the handle. Does not prevent the tooltip content from showing.
   */
  isHandlerDisabled?: boolean;
  /**
   * Disables the tooltip content from showing.
   */
  disabled?: boolean;
  openDelay?: number;
  closeDelay?: number;
  maxAllowedWidth?: number;
  /**
   * The element to render the tooltip as. Defaults to `span`.
   *
   * This element should extend `HTMLProps<HTMLElement>`.
   */
  as?: ComponentType<T> | keyof ReactHTML;
  withPortal?: boolean;
  shouldStopPropagation?: boolean;
  fitHandleWidth?: boolean;
  closeOnDoubleClick?: boolean;
} & T;

export default function Tooltip<T extends PropsWithChildren = PropsWithChildren>({
  handle,
  children,
  renderContent,
  content,
  position = DEFAULT_TOOLTIP_POSITION,
  className,
  disableHandleStyle,
  handleClassName,
  tooltipClassName,
  isHandlerDisabled,
  disabled,
  openDelay = TOOLTIP_OPEN_DELAY,
  closeDelay = TOOLTIP_CLOSE_DELAY,
  maxAllowedWidth = 350, // in px
  as,
  withPortal,
  shouldStopPropagation,
  fitHandleWidth,
  closeOnDoubleClick,
  ...containerProps
}: TooltipProps<T>) {
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, floatingStyles, context, middlewareData } = useFloating({
    middleware: [
      offset(10),
      flip(),
      shift(),
      size({
        apply: (state) => {
          Object.assign(state.elements.floating.style, {
            maxWidth: `${maxAllowedWidth}px`,
          });

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

  const preventClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (shouldStopPropagation) {
        event.stopPropagation();
      }
    },
    [shouldStopPropagation]
  );

  const color = middlewareData?.color?.color ?? DEFAULT_ARROW_COLOR;

  if (as) {
    const Container = as as any;
    return (
      <Container
        {...(containerProps as T)}
        className={cx("Tooltip", className)}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {children}
        {visible && withPortal && (
          <FloatingPortal>
            <div ref={refs.setFloating} {...getFloatingProps()} className={cx("Tooltip-popup", tooltipClassName)}>
              <FloatingArrow ref={arrowRef} context={context} fill={color} />
              {content ?? renderContent?.()}
            </div>
          </FloatingPortal>
        )}
        {visible && !withPortal && (
          <div ref={refs.setFloating} {...getFloatingProps()} className={cx("Tooltip-popup", tooltipClassName)}>
            <FloatingArrow ref={arrowRef} context={context} fill={color} />
            {content ?? renderContent?.()}
          </div>
        )}
      </Container>
    );
  }

  return (
    <span {...containerProps} className={cx("Tooltip", className)}>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={preventClick}
        className={cx({ "Tooltip-handle": !disableHandleStyle }, handleClassName)}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {isHandlerDisabled ? (
          <div className="pointer-events-none w-full flex-none">{handle ?? children}</div>
        ) : (
          <>{handle ?? children}</>
        )}
      </span>
      {visible && withPortal && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={cx("Tooltip-popup", tooltipClassName)}
          >
            <FloatingArrow ref={arrowRef} context={context} fill={color}></FloatingArrow>
            {content ?? renderContent?.()}
          </div>
        </FloatingPortal>
      )}
      {visible && !withPortal && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className={cx("Tooltip-popup", tooltipClassName)}
        >
          <FloatingArrow ref={arrowRef} context={context} fill={color}></FloatingArrow>
          {content ?? renderContent?.()}
        </div>
      )}
    </span>
  );
}
