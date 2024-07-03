import {
  FloatingArrow,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import cx from "classnames";
import {
  ComponentType,
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

type Props<T extends PropsWithChildren> = {
  handle?: ReactNode;
  renderContent?: () => ReactNode;
  content?: ReactNode | undefined | null;
  position?: TooltipPosition;
  className?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
  tooltipClassName?: string;
  isHandlerDisabled?: boolean;
  openDelay?: number;
  closeDelay?: number;
  maxAllowedWidth?: number;
  as?: ComponentType<T> | keyof ReactHTML;
} & T;

export default function Tooltip<T extends PropsWithChildren = PropsWithChildren>({
  handle,
  renderContent,
  content,
  position = DEFAULT_TOOLTIP_POSITION,
  className,
  disableHandleStyle,
  handleClassName,
  tooltipClassName,
  isHandlerDisabled,
  openDelay = TOOLTIP_OPEN_DELAY,
  closeDelay = TOOLTIP_CLOSE_DELAY,
  maxAllowedWidth = 350, // in px
  as,
  ...containerProps
}: Props<T>) {
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
    delay: {
      open: openDelay,
      close: closeDelay,
    },
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const preventClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  const color = middlewareData?.color?.color ?? DEFAULT_ARROW_COLOR;

  if (as) {
    const Container = as as any;
    return (
      <Container {...(containerProps as T)} className={cx("Tooltip", className)} ref={refs.reference}>
        {containerProps.children}
        {visible && (
          <div ref={refs.setFloating} className={cx("Tooltip-popup", tooltipClassName)}>
            <FloatingArrow ref={arrowRef} context={context} fill={color} />
            {content ?? renderContent?.()}
          </div>
        )}
      </Container>
    );
  }

  return (
    <span {...containerProps} {...getReferenceProps()} className={cx("Tooltip", className)}>
      <span
        ref={refs.setReference}
        onClick={preventClick}
        className={cx({ "Tooltip-handle": !disableHandleStyle }, handleClassName)}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {isHandlerDisabled ? <div className="Tooltip-disabled-wrapper">{handle}</div> : <>{handle}</>}
      </span>
      {visible && (
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
