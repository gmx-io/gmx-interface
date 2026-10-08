import {
  FloatingArrow,
  FloatingFocusManager,
  FloatingPortal,
  OpenChangeReason,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  size,
  useClick,
  useDelayGroup,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import { getOppositePlacement, getOppositeAlignmentPlacement } from "@floating-ui/utils";
import cx from "classnames";
import {
  ComponentPropsWithoutRef,
  ElementType,
  FocusEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DEFAULT_TOOLTIP_POSITION, TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";
import { usePrevious } from "lib/usePrevious";

import InfoIcon from "img/ic_info_circle.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { TooltipGroupContext } from "./TooltipGroup";
import { TooltipMotion, type TooltipMotionProps } from "./TooltipMotion";

import "./Tooltip.scss";

export type TooltipPosition = Placement;

export const DEFAULT_TOOLTIP_ARROW_CLASSNAME = "scale-3 fill-slate-700 dark:fill-[#2b2d41]";
// Gap between the trigger and the panel, in px
export const TOOLTIP_OFFSET = 10;
export const DEFAULT_TOOLTIP_MAX_WIDTH = 350;

type InnerTooltipProps<T extends ElementType | undefined> = {
  /**
   * Takes precedence over `children`
   */
  handle?: ReactNode;
  children?: ReactNode;
  /**
   * @deprecated Use `content` instead.
   */
  renderContent?: () => ReactNode;
  content?: ReactNode | undefined | null;
  position?: TooltipPosition;
  className?: string;
  style?: React.CSSProperties;
  handleClassName?: string;
  handleStyle?: React.CSSProperties;
  tooltipClassName?: string;
  contentClassName?: string;
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
  shouldPreventDefault?: boolean;
  fitHandleWidth?: boolean;
  closeOnDoubleClick?: boolean;
  /**
   * Disables the click toggle behavior that keeps the tooltip open after clicking.
   */
  disableClickToggle?: boolean;
  /**
   * Flips only to the opposite side when the preferred one has no room; horizontal overflow is shifted instead.
   */
  flipOnlyToOppositeSide?: boolean;

  variant?: "icon" | "iconStroke" | "underline" | "none";
  iconClassName?: string;
  /**
   * Fades and scales in from the pointer. Instant when opened with the keyboard
   * or when another tooltip in the same `TooltipGroup` was just open.
   */
  animated?: boolean;
  /**
   * When `false`, the popup ignores the pointer and closes as soon as the cursor leaves the handle.
   */
  interactive?: boolean;
  arrowClassName?: string;
  /**
   * Outline width of the pointer, to match a bordered tooltip panel. The outline color comes from CSS.
   */
  arrowStrokeWidth?: number;
  /**
   * Keeps the popup this many px away from the screen edges and never wider than the screen allows.
   */
  viewportPadding?: number;
  /**
   * Closes the popup when the page scrolls.
   */
  closeOnScroll?: boolean;
  /**
   * Opens on keyboard focus within the handle, and links the popup to its trigger for screen readers
   * (role="tooltip" and aria-describedby).
   */
  keyboardAccessible?: boolean;
  /**
   * Makes the handle itself focusable, for triggers with nothing focusable inside (text, disabled buttons).
   */
  handleTabIndex?: number;
  /**
   * With `keyboardAccessible`: `false` when the tooltip only repeats the trigger's own name (an icon button with
   * the same aria-label), so screen readers don't read it twice. Defaults to `true`.
   */
  describesTrigger?: boolean;
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
  handleClassName,
  handleStyle,
  tooltipClassName,
  contentClassName,
  isHandlerDisabled,
  disabled,
  openDelay = TOOLTIP_OPEN_DELAY,
  closeDelay = TOOLTIP_CLOSE_DELAY,
  maxAllowedWidth = DEFAULT_TOOLTIP_MAX_WIDTH, // in px
  as,
  withPortal,
  shouldStopPropagation,
  shouldPreventDefault = true,
  fitHandleWidth,
  closeOnDoubleClick,
  disableClickToggle,
  flipOnlyToOppositeSide,
  variant = "underline",
  iconClassName,
  animated = false,
  interactive = true,
  arrowClassName,
  arrowStrokeWidth,
  viewportPadding,
  closeOnScroll = false,
  keyboardAccessible = false,
  handleTabIndex,
  describesTrigger = true,
  ...containerProps
}: TooltipProps<T>) {
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const referenceRef = useRef<Element | null>(null);
  const floatingRef = useRef<HTMLElement | null>(null);
  const disabledHandleLabelId = useId();
  const openedByKeyboardRef = useRef(false);
  // After Escape the tooltip stays closed while focus stays on the handle
  const escapedRef = useRef(false);
  // True while keyboard focus is on the trigger or inside the tooltip. Only then does FloatingFocusManager handle
  // Tab, Escape and returning focus, so a tooltip opened by the pointer never moves focus or adds Tab stops.
  const [keyboardEngaged, setKeyboardEngaged] = useState(false);
  // The same, for callbacks that can't depend on state
  const keyboardEngagedRef = useRef(false);
  keyboardEngagedRef.current = keyboardEngaged;

  const handleOpenChange = useCallback((open: boolean, _event?: Event, reason?: OpenChangeReason) => {
    // Keyboard focus inside the tooltip (not a click into the panel), or on the trigger
    const isKeyboardFocusWithin =
      hasVisibleFocusWithin(referenceRef.current) || (keyboardEngagedRef.current && containsFocus(floatingRef.current));

    // Keyboard focus keeps it open when the pointer leaves (directly or along the safe path into the panel), or when
    // another tooltip in the same group opens (that close comes without a reason)
    if (!open && (reason === "hover" || reason === "safe-polygon" || reason === undefined) && isKeyboardFocusWithin) {
      return;
    }

    const isFocusWithin = containsFocus(referenceRef.current) || containsFocus(floatingRef.current);

    // Escape keeps it closed until focus leaves, but only when it was pressed with keyboard focus on the trigger or
    // inside the tooltip (focus then comes back to the trigger)
    if (
      !open &&
      reason === "escape-key" &&
      (containsFocus(referenceRef.current) || (keyboardEngagedRef.current && containsFocus(floatingRef.current)))
    ) {
      escapedRef.current = true;
    }

    if (!open && !isFocusWithin) {
      setKeyboardEngaged(false);
    }

    if (open) {
      openedByKeyboardRef.current = false;
    }

    setVisible(open);
  }, []);

  const { refs, floatingStyles, context } = useFloating({
    middleware: [
      offset(TOOLTIP_OFFSET),
      flip(
        flipOnlyToOppositeSide
          ? { crossAxis: false, fallbackPlacements: [getOppositePlacement(position)] }
          : {
              fallbackPlacements: [
                getOppositeAlignmentPlacement(position),
                getOppositePlacement(position),
                "left-start",
                "right-start",
                "bottom",
                "top",
              ],
            }
      ),
      shift({
        padding: viewportPadding ?? 10,
      }),
      size({
        apply: (state) => {
          const screenWidth = state.elements.floating.ownerDocument.documentElement.clientWidth;
          const maxWidth =
            viewportPadding === undefined
              ? maxAllowedWidth
              : Math.min(maxAllowedWidth, screenWidth - viewportPadding * 2);
          Object.assign(state.elements.floating.style, {
            maxWidth: `${maxWidth}px`,
          });

          if (fitHandleWidth) {
            Object.assign(state.elements.floating.style, {
              maxWidth: `${state.rects.reference.width}px`,
              minWidth: `${state.rects.reference.width}px`,
            });
          }
        },
      }),
      arrow({ element: arrowRef, padding: 6 }),
    ],
    placement: position,
    whileElementsMounted: autoUpdate,
    open: visible,
    onOpenChange: handleOpenChange,
  });

  const setReference = useMergeRefs<Element>([refs.setReference, referenceRef]);
  const setFloating = useMergeRefs<HTMLElement>([refs.setFloating, floatingRef]);

  const inGroup = useContext(TooltipGroupContext);
  const group = useDelayGroup(context, { id: context.floatingId });

  const previousDisabled = usePrevious(disabled);

  useEffect(() => {
    if (disabled && !previousDisabled && visible) {
      setVisible(false);
    }
  }, [disabled, previousDisabled, visible]);

  const hover = useHover(context, {
    enabled: !disabled,
    delay: inGroup
      ? group.delay
      : {
          open: openDelay,
          close: closeDelay,
        },
    // Standard tooltips stay open while the pointer heads from the trigger into the panel, even in one quick move
    handleClose: interactive && keyboardAccessible ? safePolygon({ blockPointerEvents: false }) : null,
  });
  const click = useClick(context, {
    // `undefined` would fall back to the floating-ui default (true)
    enabled: Boolean(!disabled && !disableClickToggle && closeOnDoubleClick),
    toggle: closeOnDoubleClick,
  });
  const dismiss = useDismiss(context, {
    enabled: !disabled,
    ancestorScroll: closeOnScroll,
  });

  const isDescription = keyboardAccessible && describesTrigger;
  const role = useRole(context, { role: "tooltip", enabled: isDescription });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss, role]);

  // Keyboard focus on the handle (or on something inside it) opens the tooltip right away, without animation
  const handleFocus = useCallback(
    (event: FocusEvent) => {
      if (!keyboardAccessible || disabled || !matchesFocusVisible(event.target as Element)) {
        return;
      }

      setKeyboardEngaged(true);

      // After Escape, focus comes back to the trigger; it stays closed until focus leaves (handleBlur resets this)
      if (escapedRef.current) {
        return;
      }

      openedByKeyboardRef.current = true;
      setVisible(true);
    },
    [keyboardAccessible, disabled]
  );

  const preventClick = useCallback(
    (event: MouseEvent) => {
      if (shouldPreventDefault) {
        event.preventDefault();
      }
      if (shouldStopPropagation) {
        event.stopPropagation();
      }
    },
    [shouldPreventDefault, shouldStopPropagation]
  );

  useEffect(
    function handleFocusWithin() {
      if (disabled || visible || escapedRef.current) {
        return;
      }

      // If element was blurred, allow some time so that activeElement is updated
      requestAnimationFrame(() => {
        if (hasVisibleFocusWithin(referenceRef.current)) {
          openedByKeyboardRef.current = true;
          setKeyboardEngaged(keyboardAccessible);
          setVisible(true);
        }
      });
    },
    [disabled, visible, keyboardAccessible]
  );

  const handleBlur = useCallback(
    (event: FocusEvent) => {
      const reference = referenceRef.current;
      const nextFocused = event.relatedTarget as Node | null;

      if (reference && nextFocused && reference.contains(nextFocused)) {
        return;
      }

      // Tab from the trigger into the tooltip: FloatingFocusManager takes over and closes it when focus leaves both
      if (
        keyboardAccessible &&
        nextFocused &&
        (floatingRef.current?.contains(nextFocused) || isFocusGuard(nextFocused))
      ) {
        return;
      }

      escapedRef.current = false;
      setKeyboardEngaged(false);

      if (isHovered(reference) || isHovered(refs.floating.current)) {
        return;
      }

      setVisible(false);
    },
    [refs.floating, keyboardAccessible]
  );

  // Tab can also reach a link in an open tooltip in page order (after the portal), without passing the trigger.
  // Keyboard focus there counts like focus on the trigger; leaving both closes it, as on the trigger.
  const handleFloatingFocus = useCallback(
    (event: FocusEvent) => {
      if (keyboardAccessible && !disabled && matchesFocusVisible(event.target as Element)) {
        setKeyboardEngaged(true);
      }
    },
    [keyboardAccessible, disabled]
  );

  const handleFloatingBlur = useCallback(
    (event: FocusEvent) => {
      if (!keyboardAccessible) {
        return;
      }

      const nextFocused = event.relatedTarget as Node | null;
      if (
        nextFocused &&
        (floatingRef.current?.contains(nextFocused) ||
          referenceRef.current?.contains(nextFocused) ||
          isFocusGuard(nextFocused))
      ) {
        return;
      }

      escapedRef.current = false;
      setKeyboardEngaged(false);

      if (isHovered(referenceRef.current) || isHovered(refs.floating.current)) {
        return;
      }

      setVisible(false);
    },
    [keyboardAccessible, refs.floating]
  );

  const floatingFocusProps = useMemo(
    () => ({ onFocus: handleFloatingFocus, onBlur: handleFloatingBlur }),
    [handleFloatingFocus, handleFloatingBlur]
  );

  // A button or link inside the trigger is what gets focus, so it carries the description too (the wrapper is
  // described by useRole). Disabled buttons can't take focus; the wrapper speaks for them (see below).
  useLayoutEffect(() => {
    const target = isDescription && visible ? getFocusableChild(referenceRef.current) : null;
    if (!target) {
      return;
    }

    const previous = target.getAttribute("aria-describedby");
    target.setAttribute("aria-describedby", previous ? `${previous} ${context.floatingId}` : context.floatingId);
    return () => {
      if (previous === null) {
        target.removeAttribute("aria-describedby");
      } else {
        target.setAttribute("aria-describedby", previous);
      }
    };
  }, [isDescription, visible, context.floatingId]);

  const outerStyles = useMemo(
    () => (interactive ? floatingStyles : { ...floatingStyles, pointerEvents: "none" as const }),
    [floatingStyles, interactive]
  );

  // Builds the popup only while it is on screen, so a closed tooltip renders no portal or focus manager.
  // Animated tooltips get `motion` from TooltipMotion, which also keeps the popup on screen while it leaves.
  const renderPopup = (motion?: TooltipMotionProps) => {
    const arrowElement = (
      <FloatingArrow
        ref={arrowRef}
        context={context}
        className={arrowClassName ?? DEFAULT_TOOLTIP_ARROW_CLASSNAME}
        strokeWidth={arrowStrokeWidth}
      />
    );
    const finalContent = content ?? renderContent?.();

    let tooltipContent: JSX.Element;

    if (motion) {
      // Positioning and the enter animation both use `transform`, so they live on separate elements.
      // The panel is `relative` so floating-ui measures the pointer inside its border, as the CSS draws it.
      tooltipContent = (
        <div
          ref={setFloating}
          style={outerStyles}
          {...getFloatingProps(floatingFocusProps)}
          className="Tooltip-floating"
        >
          <div className={cx("Tooltip-popup relative", tooltipClassName)} {...motion}>
            {arrowElement}
            {finalContent}
          </div>
        </div>
      );
    } else {
      tooltipContent = (
        <div
          ref={setFloating}
          style={outerStyles}
          {...getFloatingProps(floatingFocusProps)}
          className={cx("Tooltip-popup", tooltipClassName)}
        >
          {arrowElement}
          {finalContent}
        </div>
      );
    }

    // Keyboard users can Tab from the trigger into the tooltip (to reach a link) and out again; it closes once focus
    // leaves both. It never takes focus by itself, and Escape puts focus back on the trigger.
    if (keyboardAccessible && interactive) {
      tooltipContent = (
        <FloatingFocusManager context={context} modal={false} initialFocus={-1} disabled={!keyboardEngaged}>
          {tooltipContent}
        </FloatingFocusManager>
      );
    }

    return withPortal ? <FloatingPortal>{tooltipContent}</FloatingPortal> : tooltipContent;
  };

  // Only animated tooltips mount TooltipMotion, so the others run no motion code
  const popup = animated ? (
    <TooltipMotion context={context} instant={openedByKeyboardRef.current || (inGroup && group.isInstantPhase)}>
      {renderPopup}
    </TooltipMotion>
  ) : (
    visible && renderPopup()
  );

  // A disabled button can't take focus, so the focusable wrapper stands in for it: an unavailable button with its name
  const disabledHandleProps =
    keyboardAccessible && isHandlerDisabled
      ? { role: "button", "aria-disabled": true, "aria-labelledby": disabledHandleLabelId }
      : undefined;

  if (as) {
    const Container = as as any;
    return (
      <Container
        // Before the caller's props, so a tabIndex they pass still wins
        tabIndex={handleTabIndex}
        {...containerProps}
        className={cx("Tooltip", className)}
        ref={setReference}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
          onFocus: (e: FocusEvent) => {
            handleFocus(e);
            containerProps.onFocus?.(e);
          },
          onBlur: (e: FocusEvent) => {
            handleBlur(e);
            containerProps.onBlur?.(e);
          },
        })}
      >
        {handle ?? children}
        {popup}
      </Container>
    );
  }

  return (
    <span {...containerProps} className={cx("Tooltip", className)} style={style}>
      <span
        ref={setReference}
        className={cx("Tooltip-handle group", handleClassName)}
        style={handleStyle}
        tabIndex={handleTabIndex}
        {...disabledHandleProps}
        {...getReferenceProps({
          onClick: (e: MouseEvent) => {
            preventClick(e);
            containerProps.onClick?.(e);
          },
          onFocus: handleFocus,
          onBlur: handleBlur,
        })}
      >
        <div className={cx("flex grow items-center gap-2", contentClassName)}>
          {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
          {isHandlerDisabled ? (
            <div
              id={disabledHandleLabelId}
              aria-hidden={disabledHandleProps ? true : undefined}
              className="pointer-events-none w-full flex-none [text-decoration:inherit]"
            >
              {handle ?? children}
            </div>
          ) : (
            <>{handle ?? children}</>
          )}
          {variant === "icon" && <InfoIcon className={cx("h-16 w-16", iconClassName)} />}
          {variant === "iconStroke" && <InfoIconStroke className={cx("h-16 w-16", iconClassName)} />}
          {variant === "underline" && (
            <svg className="Tooltip-underline absolute -bottom-0 left-0 h-1 w-full overflow-hidden">
              <line
                stroke="currentColor"
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                strokeWidth="0.75"
                strokeDasharray="1.25,2.25"
              />
            </svg>
          )}
        </div>
      </span>
      {popup}
    </span>
  );
}

function containsFocus(element: Element | null): boolean {
  const activeElement = document.activeElement;
  return !!element && !!activeElement && element.contains(activeElement);
}

// :focus-visible filters out handles focused by a pointer click; text inputs match it either way
function hasVisibleFocusWithin(element: Element | null): boolean {
  const activeElement = document.activeElement;

  return !!element && !!activeElement && element.contains(activeElement) && matchesFocusVisible(activeElement);
}

function matchesFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableChild(element: Element | null): Element | null {
  return element?.querySelector(FOCUSABLE_SELECTOR) ?? null;
}

// FloatingFocusManager and FloatingPortal move focus through invisible guard elements
function isFocusGuard(node: Node): boolean {
  return node instanceof Element && node.hasAttribute("data-floating-ui-focus-guard");
}

function isHovered(element: Element | null): boolean {
  try {
    return !!element && element.matches(":hover");
  } catch {
    return false;
  }
}
