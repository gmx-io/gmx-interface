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
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { getOppositePlacement, getOppositeAlignmentPlacement } from "@floating-ui/utils";
import cx from "classnames";
import {
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { DEFAULT_TOOLTIP_POSITION, TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";
import { usePrevious } from "lib/usePrevious";

import InfoIcon from "img/ic_info_circle.svg?react";

import "./Tooltip.scss";

export type TooltipPosition = Placement;

type InnerTooltipProps<T extends ElementType | undefined> = {
  /**
   * Takes precedence over `children`
   */
  handle?: ReactNode;
  children?: ReactNode;
  renderContent?: () => ReactNode;
  content?: ReactNode | undefined | null;
  position?: TooltipPosition;
  disableHandleStyle?: boolean;
  className?: string;
  style?: React.CSSProperties;
  handleClassName?: string;
  handleStyle?: React.CSSProperties;
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
  as?: T;
  withPortal?: boolean;
  shouldStopPropagation?: boolean;
  fitHandleWidth?: boolean;
  closeOnDoubleClick?: boolean;

  showInfoIcon?: boolean;
};

export type TooltipProps<T extends ElementType | undefined> = InnerTooltipProps<T> &
  (T extends undefined ? {} : Omit<ComponentPropsWithoutRef<Exclude<T, undefined>>, keyof InnerTooltipProps<T>>);

export default function Tooltip<T extends ElementType>({
  handle,
  children,
  renderContent,
  content,
  position = DEFAULT_TOOLTIP_POSITION,
  className,
  style,
  disableHandleStyle,
  handleClassName,
  handleStyle,
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
  showInfoIcon,
  ...containerProps
}: TooltipProps<T>) {
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, floatingStyles, context } = useFloating({
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: [
          getOppositeAlignmentPlacement(position),
          getOppositePlacement(position),
          "left-start",
          "right-start",
          "bottom",
          "top",
        ],
      }),
      shift({
        padding: 10,
      }),
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
      arrow({ element: arrowRef, padding: 4 }),
    ],
    placement: position,
    whileElementsMounted: autoUpdate,
    open: visible,
    onOpenChange: setVisible,
  });

  const previousDisabled = usePrevious(disabled);

  useEffect(() => {
    if (disabled && !previousDisabled && visible) {
      setVisible(false);
    }
  }, [disabled, previousDisabled, visible]);

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
  const dismiss = useDismiss(context, {
    enabled: !disabled,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss]);

  const preventClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (shouldStopPropagation) {
        event.stopPropagation();
      }
    },
    [shouldStopPropagation]
  );

  useEffect(
    function handleFocusWithin() {
      if (disabled || visible) {
        return;
      }

      // If element was blurred, allow some time so that activeElement is updated
      requestAnimationFrame(() => {
        const focusWithin = (refs.reference.current as HTMLElement)?.contains(document.activeElement);

        if (focusWithin) {
          setVisible(true);
        }
      });
    },
    [disabled, refs.reference, visible]
  );

  const finalContent = visible ? content ?? renderContent?.() : undefined;

  const tooltipContent = visible ? (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className={cx("Tooltip-popup", tooltipClassName)}
    >
      <FloatingArrow ref={arrowRef} context={context} className="fill-new-gray-200" />
      {finalContent}
    </div>
  ) : undefined;

  if (as) {
    const Container = as as any;
    return (
      <Container
        {...containerProps}
        className={cx("Tooltip", className)}
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
        })}
      >
        {handle ?? children}
        {visible && withPortal && <FloatingPortal>{tooltipContent}</FloatingPortal>}
        {visible && !withPortal && tooltipContent}
      </Container>
    );
  }

  return (
    <span {...containerProps} className={cx("Tooltip", className)} style={style}>
      <span
        ref={refs.setReference}
        className={cx({ "Tooltip-handle": !disableHandleStyle }, handleClassName)}
        style={handleStyle}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
        })}
      >
        <div className="flex items-center gap-2">
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {isHandlerDisabled ? (
          <div className="pointer-events-none w-full flex-none [text-decoration:inherit]">{handle ?? children}</div>
        ) : (
          <>{handle ?? children}</>
        )}
        {showInfoIcon && <InfoIcon className="w-16 h-16" />}
        </div>
      </span>
      {visible && withPortal && <FloatingPortal>{tooltipContent}</FloatingPortal>}
      {visible && !withPortal && tooltipContent}
    </span>
  );
}
