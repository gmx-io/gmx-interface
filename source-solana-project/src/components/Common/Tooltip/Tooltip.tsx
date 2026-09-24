/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  arrowColor,
  DEFAULT_ARROW_COLOR,
} from '@/components/Common/Tooltip/arrowColor';
import {
  DEFAULT_TOOLTIP_POSITION,
  TOOLTIP_CLOSE_DELAY,
  TOOLTIP_OPEN_DELAY,
} from '@/config/ui';
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  Placement,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import cx from 'classnames';
import {
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePrevious } from 'react-use';

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
  fitContentWidth?: boolean;
  preventDefault?: boolean;
};

export type TooltipProps<T extends ElementType | undefined> =
  InnerTooltipProps<T> &
  (T extends undefined
    ? {}
    : Omit<
      ComponentPropsWithoutRef<Exclude<T, undefined>>,
      keyof InnerTooltipProps<T>
    >);

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
  fitContentWidth,
  preventDefault = true,
  ...containerProps
}: TooltipProps<T>) {
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const { refs, floatingStyles, context, middlewareData } = useFloating({
    middleware: [
      offset(10),
      flip(),
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
          if (fitContentWidth) {
            Object.assign(state.elements.floating.style, {
              maxWidth: 'none',
              width: 'auto',
              minWidth: '0',
              whiteSpace: 'nowrap',
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

  const previousDisabled = usePrevious(disabled);

  useEffect(() => {
    if (disabled && !previousDisabled && visible) {
      setVisible(false);
    }
  }, [disabled, previousDisabled, visible]);

  useEffect(() => () => setVisible(false), []);

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

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    dismiss,
  ]);

  const preventClick = useCallback(
    (event: MouseEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }
      if (shouldStopPropagation) {
        event.stopPropagation();
      }
    },
    [preventDefault, shouldStopPropagation]
  );

  useEffect(
    function handleFocusWithin() {
      if (disabled || visible) {
        return;
      }

      // If element was blurred, allow some time so that activeElement is updated
      requestAnimationFrame(() => {
        const focusWithin = (refs.reference.current as HTMLElement)?.contains(
          document.activeElement
        );

        if (focusWithin) {
          setVisible(true);
        }
      });
    },
    [disabled, refs.reference, visible]
  );

  const color = middlewareData?.color?.color ?? DEFAULT_ARROW_COLOR;

  const finalContent = visible ? (content ?? renderContent?.()) : undefined;

  const tooltipContent = visible ? (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className={cx('tooltip-base', tooltipClassName)}
    >
      <FloatingArrow ref={arrowRef} context={context} fill={color} />
      {finalContent}
    </div>
  ) : undefined;

  if (as) {
    const Container = as as any;
    return (
      <Container
        {...containerProps}
        className={cx('tooltip-container', className)}
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
        })}
      >
        {children}
        {visible && withPortal && (
          <FloatingPortal>{tooltipContent}</FloatingPortal>
        )}
        {visible && !withPortal && tooltipContent}
      </Container>
    );
  }

  return (
    <span
      {...containerProps}
      className={cx('tooltip-container', className)}
      style={style}
    >
      <span
        ref={refs.setReference}
        className={cx(
          {
            'tooltip-handle': !disableHandleStyle,
          },
          handleClassName
        )}
        style={handleStyle}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
        })}
      >
        {isHandlerDisabled ? (
          <div className="tooltip-disabled-handle">{handle ?? children}</div>
        ) : (
          <>{handle ?? children}</>
        )}
      </span>
      {visible && withPortal && (
        <FloatingPortal>{tooltipContent}</FloatingPortal>
      )}
      {visible && !withPortal && tooltipContent}
    </span>
  );
}
