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
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import { getOppositePlacement, getOppositeAlignmentPlacement, getSide } from "@floating-ui/utils";
import cx from "classnames";
import {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  FocusEvent,
  MouseEvent,
  PointerEvent,
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
import { useLatestValueRef } from "lib/useLatestValueRef";
import { usePrevious } from "lib/usePrevious";

import InfoIcon from "img/ic_info_circle.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { subscribeToCloseAllTooltips, wereTooltipsClosedSince } from "./closeAllTooltips";
import { TooltipGroup, TooltipGroupContext } from "./TooltipGroup";
import { TooltipMotion, type TooltipMotionProps } from "./TooltipMotion";
import { getPointerGapX, TooltipPointer } from "./TooltipPointer";

import "./Tooltip.scss";

export type TooltipPosition = Placement;

export const DEFAULT_TOOLTIP_ARROW_CLASSNAME = "scale-3 fill-slate-700 dark:fill-[#2b2d41]";
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
  animated?: boolean;
  interactive?: boolean;
  seamlessPointer?: boolean;
  viewportPadding?: number;
  closeOnScroll?: boolean;
  keyboardAccessible?: boolean;
  handleTabIndex?: number;
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
  closeOnDoubleClick,
  disableClickToggle,
  flipOnlyToOppositeSide,
  variant = "underline",
  iconClassName,
  animated = false,
  interactive = true,
  seamlessPointer = false,
  viewportPadding,
  closeOnScroll = false,
  keyboardAccessible: keyboardAccessibleProp = false,
  handleTabIndex,
  describesTrigger = true,
  ...containerProps
}: TooltipProps<T>) {
  const keyboardAccessible = keyboardAccessibleProp || Boolean(isHandlerDisabled);
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);
  const referenceRef = useRef<Element | null>(null);
  const floatingRef = useRef<HTMLElement | null>(null);
  const disabledHandleLabelId = useId();
  const openedByKeyboardRef = useRef(false);
  const group = useContext(TooltipGroupContext);
  const instantRef = useRef(false);
  const openRequestTimeRef = useRef(0);
  const pointerTypeRef = useRef<string | undefined>(undefined);
  const openedByTouchRef = useRef(false);
  const escapedRef = useRef(false);
  const [keyboardEngaged, setKeyboardEngaged] = useState(false);
  const keyboardEngagedRef = useRef(false);
  keyboardEngagedRef.current = keyboardEngaged;

  const handleOpenChange = useCallback(
    (open: boolean, _event?: Event, reason?: OpenChangeReason) => {
      if (open && hasExpandedControl(referenceRef.current)) {
        return;
      }

      const isKeyboardFocusWithin =
        hasVisibleFocusWithin(referenceRef.current) ||
        (keyboardEngagedRef.current && containsFocus(floatingRef.current));

      if (!open && (reason === "hover" || reason === "safe-polygon" || reason === undefined) && isKeyboardFocusWithin) {
        return;
      }

      if (!open && (reason === "hover" || reason === "safe-polygon") && openedByTouchRef.current) {
        return;
      }

      const isFocusWithin = containsFocus(referenceRef.current) || containsFocus(floatingRef.current);

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
        instantRef.current = Boolean(group?.isActive());
        openRequestTimeRef.current = performance.now();
      }
      openedByTouchRef.current = open && pointerTypeRef.current === "touch";

      setVisible(open);
    },
    [group]
  );

  const handlePointer = useCallback((event: PointerEvent) => {
    pointerTypeRef.current = event.pointerType;
  }, []);

  const [hasFocusableChild, setHasFocusableChild] = useState(false);
  const [parentControl, setParentControl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (keyboardAccessible) {
      setParentControl(getParentControl(referenceRef.current));
    }
  }, [keyboardAccessible]);
  useLayoutEffect(() => {
    if (keyboardAccessible) {
      setHasFocusableChild(Boolean(getFocusableChild(referenceRef.current)));
    }
  }, [keyboardAccessible, handle, children]);
  const tabIndex =
    handleTabIndex ??
    (keyboardAccessible && !disabled && !parentControl && (isHandlerDisabled || !hasFocusableChild) ? 0 : undefined);

  const middleware = useMemo(
    () => [
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
        padding: viewportPadding ?? 10,
        apply: (state) => {
          state.elements.floating.style.setProperty("--tooltip-available-height", `${state.availableHeight}px`);

          const screenWidth = state.elements.floating.ownerDocument.documentElement.clientWidth;
          const maxWidth =
            viewportPadding === undefined
              ? maxAllowedWidth
              : Math.min(maxAllowedWidth, screenWidth - viewportPadding * 2);
          Object.assign(state.elements.floating.style, {
            maxWidth: `${maxWidth}px`,
          });
        },
      }),
      arrow({ element: arrowRef, padding: 6 }),
    ],
    [flipOnlyToOppositeSide, position, viewportPadding, maxAllowedWidth]
  );

  const { refs, floatingStyles, context } = useFloating({
    middleware,
    placement: position,
    whileElementsMounted: autoUpdate,
    open: visible,
    onOpenChange: handleOpenChange,
  });

  const setReference = useMergeRefs<Element>([refs.setReference, referenceRef]);
  const setFloating = useMergeRefs<HTMLElement>([refs.setFloating, floatingRef]);

  const { floatingId, onOpenChange } = context;

  useLayoutEffect(() => {
    if (!group || !visible) {
      return;
    }

    group.open(floatingId, () => {
      instantRef.current = true;
      onOpenChange(false);
    });
    return () => group.close(floatingId);
  }, [group, visible, floatingId, onOpenChange]);

  const hoverDelay = useMemo(
    () =>
      group
        ? {
            get open() {
              return group.isActive() ? 0 : openDelay;
            },
            close: closeDelay,
          }
        : { open: openDelay, close: closeDelay },
    [group, openDelay, closeDelay]
  );

  const [isMotionMounted, setIsMotionMounted] = useState(false);

  useLayoutEffect(() => {
    if (visible) {
      setIsMotionMounted(true);
    }
  }, [visible]);

  const handleMotionExited = useCallback(() => setIsMotionMounted(false), []);

  const previousDisabled = usePrevious(disabled);

  useEffect(() => {
    if (disabled && !previousDisabled && visible) {
      setVisible(false);
    }
  }, [disabled, previousDisabled, visible]);

  const hover = useHover(context, {
    enabled: !disabled,
    delay: hoverDelay,
    handleClose: interactive && keyboardAccessible ? safePolygon({ blockPointerEvents: false }) : null,
  });
  const click = useClick(context, {
    // `undefined` would fall back to the floating-ui default (true)
    enabled: Boolean(!disabled && !disableClickToggle && closeOnDoubleClick),
    toggle: closeOnDoubleClick,
  });
  const dismiss = useDismiss(context, {
    enabled: !disabled,
    ancestorScroll: closeOnScroll && !keyboardEngaged,
  });

  const isDescription = keyboardAccessible && describesTrigger;
  const role = useRole(context, { role: "tooltip", enabled: isDescription });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, click, dismiss, role]);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      if (!keyboardAccessible || disabled || !matchesFocusVisible(event.target as Element)) {
        return;
      }

      setKeyboardEngaged(true);

      if (escapedRef.current || hasExpandedControl(referenceRef.current)) {
        return;
      }

      openedByKeyboardRef.current = true;
      openRequestTimeRef.current = performance.now();
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
        if (hasVisibleFocusWithin(referenceRef.current) && !hasExpandedControl(referenceRef.current)) {
          openedByKeyboardRef.current = true;
          openRequestTimeRef.current = performance.now();
          setKeyboardEngaged(keyboardAccessible);
          setVisible(true);
        }
      });
    },
    [disabled, visible, keyboardAccessible]
  );

  useEffect(
    function closeWhenCovered() {
      const reference = referenceRef.current;
      if (!visible || !reference) {
        return;
      }

      const close = () => {
        setKeyboardEngaged(false);
        setVisible(false);
      };

      if (hasExpandedControl(reference) || wereTooltipsClosedSince(openRequestTimeRef.current)) {
        close();
        return;
      }

      const observer = new MutationObserver(() => {
        if (hasExpandedControl(reference)) {
          close();
        }
      });
      observer.observe(reference, { attributes: true, attributeFilter: ["aria-expanded"], subtree: true });
      const unsubscribe = subscribeToCloseAllTooltips(close);

      return () => {
        observer.disconnect();
        unsubscribe();
      };
    },
    [visible]
  );

  useEffect(
    function openOnParentControlFocus() {
      if (!parentControl || disabled) {
        return;
      }

      const handleControlFocus = () => {
        if (!matchesFocusVisible(parentControl) || escapedRef.current) {
          return;
        }

        setKeyboardEngaged(true);
        openedByKeyboardRef.current = true;
        openRequestTimeRef.current = performance.now();
        setVisible(true);
      };

      const handleControlBlur = () => {
        escapedRef.current = false;
        setKeyboardEngaged(false);

        if (!isHovered(referenceRef.current) && !isHovered(floatingRef.current)) {
          setVisible(false);
        }
      };

      parentControl.addEventListener("focus", handleControlFocus);
      parentControl.addEventListener("blur", handleControlBlur);
      return () => {
        parentControl.removeEventListener("focus", handleControlFocus);
        parentControl.removeEventListener("blur", handleControlBlur);
      };
    },
    [parentControl, disabled]
  );

  const handleBlur = useCallback(
    (event: FocusEvent) => {
      const reference = referenceRef.current;
      const nextFocused = event.relatedTarget as Node | null;

      if (reference && nextFocused && reference.contains(nextFocused)) {
        return;
      }

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

  useLayoutEffect(() => {
    const target = isDescription && visible ? getFocusableChild(referenceRef.current) ?? parentControl : null;
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
  }, [isDescription, visible, context.floatingId, parentControl]);

  const arrowX = context.middlewareData.arrow?.x;
  const pointerGapX = seamlessPointer && arrowX !== undefined ? getPointerGapX(arrowX) : undefined;

  const outerStyles = useMemo(() => {
    const styles: CSSProperties = interactive ? floatingStyles : { ...floatingStyles, pointerEvents: "none" };
    return pointerGapX === undefined ? styles : ({ ...styles, "--tooltip-gap-x": `${pointerGapX}px` } as CSSProperties);
  }, [floatingStyles, interactive, pointerGapX]);

  const renderPopup = (motion?: TooltipMotionProps) => {
    const arrowElement = seamlessPointer ? (
      <TooltipPointer ref={arrowRef} side={getSide(context.placement)} arrowX={arrowX} />
    ) : (
      <FloatingArrow ref={arrowRef} context={context} className={DEFAULT_TOOLTIP_ARROW_CLASSNAME} />
    );
    const popupContent = content ?? renderContent?.();
    const finalContent = group ? <TooltipGroup>{popupContent}</TooltipGroup> : popupContent;

    let tooltipContent: JSX.Element;

    if (motion) {
      tooltipContent = (
        <div
          ref={setFloating}
          style={outerStyles}
          {...getFloatingProps(floatingFocusProps)}
          className="Tooltip-floating"
        >
          {seamlessPointer && <div className="Tooltip-shadow" {...motion} />}
          <div
            className={cx("Tooltip-popup relative", { "Tooltip-surface": seamlessPointer }, tooltipClassName)}
            {...motion}
          >
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

    if (keyboardAccessible && interactive) {
      tooltipContent = (
        <FloatingFocusManager
          context={context}
          modal={false}
          initialFocus={-1}
          disabled={!keyboardEngaged || Boolean(parentControl)}
        >
          {tooltipContent}
        </FloatingFocusManager>
      );
    }

    return withPortal ? <FloatingPortal>{tooltipContent}</FloatingPortal> : tooltipContent;
  };

  const popup = animated
    ? (visible || isMotionMounted) && (
        <TooltipMotion
          context={context}
          instant={openedByKeyboardRef.current || instantRef.current}
          onExited={handleMotionExited}
        >
          {renderPopup}
        </TooltipMotion>
      )
    : visible && renderPopup();

  const containerPropsRef = useLatestValueRef(containerProps);
  const hasCustomContainer = Boolean(as);
  const referenceProps = useMemo(
    () =>
      getReferenceProps({
        onClick: (e: MouseEvent) => {
          preventClick(e);
          containerPropsRef.current.onClick?.(e);
        },
        onFocus: (e: FocusEvent) => {
          handleFocus(e);
          if (hasCustomContainer) {
            containerPropsRef.current.onFocus?.(e);
          }
        },
        onBlur: (e: FocusEvent) => {
          handleBlur(e);
          if (hasCustomContainer) {
            containerPropsRef.current.onBlur?.(e);
          }
        },
        onPointerDown: (e: PointerEvent) => {
          handlePointer(e);
          if (hasCustomContainer) {
            containerPropsRef.current.onPointerDown?.(e);
          }
        },
        onPointerEnter: (e: PointerEvent) => {
          handlePointer(e);
          if (hasCustomContainer) {
            containerPropsRef.current.onPointerEnter?.(e);
          }
        },
      }),
    [getReferenceProps, preventClick, handleFocus, handleBlur, handlePointer, hasCustomContainer, containerPropsRef]
  );

  const disabledHandleProps =
    keyboardAccessible && isHandlerDisabled
      ? { role: "button", "aria-disabled": true, "aria-labelledby": disabledHandleLabelId }
      : undefined;

  if (as) {
    const Container = as as any;
    return (
      <Container
        tabIndex={tabIndex}
        {...containerProps}
        className={cx("Tooltip", className, handleClassName)}
        ref={setReference}
        {...referenceProps}
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
        tabIndex={tabIndex}
        {...disabledHandleProps}
        {...referenceProps}
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
          {variant === "underline" && <TooltipUnderline />}
        </div>
      </span>
      {popup}
    </span>
  );
}

export function TooltipUnderline() {
  return (
    <svg className="Tooltip-underline absolute -bottom-0 left-0 h-1 w-full overflow-hidden">
      <line stroke="currentColor" x1="0" y1="0" x2="100%" y2="0" strokeWidth="0.75" strokeDasharray="1.25,2.25" />
    </svg>
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

function getParentControl(element: Element | null): HTMLElement | null {
  return element?.parentElement?.closest<HTMLElement>('button, a[href], [role="button"]') ?? null;
}

function hasExpandedControl(element: Element | null): boolean {
  return !!element && (element.matches('[aria-expanded="true"]') || !!element.querySelector('[aria-expanded="true"]'));
}

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
