import cx from "classnames";
import {
  useCallback,
  useState,
  useRef,
  MouseEvent,
  ReactNode,
  useEffect,
  ComponentType,
  PropsWithChildren,
  ReactHTML,
} from "react";
import "./Tooltip.scss";
import { IS_TOUCH } from "config/env";
import { computePosition, flip, size } from "@floating-ui/dom";
import { DEFAULT_TOOLTIP_POSITION } from "config/ui";
import { TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";

export type TooltipPosition =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

type Props<T extends PropsWithChildren> = {
  handle?: ReactNode;
  renderContent?: () => ReactNode;
  content?: ReactNode | undefined | null;
  position?: TooltipPosition;
  trigger?: string;
  className?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
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
  trigger = "hover",
  className,
  disableHandleStyle,
  handleClassName,
  isHandlerDisabled,
  openDelay = TOOLTIP_OPEN_DELAY,
  closeDelay = TOOLTIP_CLOSE_DELAY,
  maxAllowedWidth, // in px
  as,
  ...containerProps
}: Props<T>) {
  const [visible, setVisible] = useState(false);
  const intervalCloseRef = useRef<ReturnType<typeof setTimeout> | null>();
  const intervalOpenRef = useRef<ReturnType<typeof setTimeout> | null>();
  const handlerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [computedPlacement, setComputedPlacement] = useState<TooltipPosition | undefined>(position);

  useEffect(() => {
    async function computeTooltipPlacement() {
      if (!handlerRef.current || !popupRef.current) return;

      const { placement } = await computePosition(handlerRef.current, popupRef.current, {
        middleware: [
          flip({ fallbackStrategy: "initialPlacement" }),
          size({
            padding: 10,
            apply({ availableWidth, elements }) {
              const { floating } = elements;
              if (!floating) return;
              const maxWidth = maxAllowedWidth ?? floating.offsetWidth;
              const minWidth = Math.min(availableWidth, maxWidth);
              Object.assign(floating.style, {
                minWidth: `${minWidth}px`,
                maxWidth: `${maxWidth}px`,
              });
            },
          }),
        ].filter(Boolean),
        placement: position,
      });
      setComputedPlacement(placement);
    }

    computeTooltipPlacement();
  }, [visible, position, maxAllowedWidth]);

  const onMouseEnter = useCallback(() => {
    if (trigger !== "hover" || IS_TOUCH) return;
    if (intervalCloseRef.current) {
      clearInterval(intervalCloseRef.current);
      intervalCloseRef.current = null;
    }
    if (!intervalOpenRef.current) {
      intervalOpenRef.current = setTimeout(() => {
        setVisible(true);
        intervalOpenRef.current = null;
      }, openDelay);
    }
  }, [setVisible, trigger, openDelay]);

  const onMouseClick = useCallback(() => {
    if (trigger !== "click" && !IS_TOUCH) return;
    if (intervalCloseRef.current) {
      clearInterval(intervalCloseRef.current);
      intervalCloseRef.current = null;
    }
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }

    setVisible(true);
  }, [setVisible, trigger]);

  const onMouseLeave = useCallback(() => {
    intervalCloseRef.current = setTimeout(() => {
      setVisible(false);
      intervalCloseRef.current = null;
    }, closeDelay);
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
  }, [setVisible, closeDelay]);

  useEffect(() => {
    return () => {
      if (intervalCloseRef.current) {
        clearInterval(intervalCloseRef.current);
        intervalCloseRef.current = null;
      }
      if (intervalOpenRef.current) {
        clearInterval(intervalOpenRef.current);
        intervalOpenRef.current = null;
      }
    };
  }, []);

  const onHandleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  if (as) {
    const Container = as;
    return (
      <Container
        {...(containerProps as T)}
        className={cx("Tooltip", className)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onMouseClick}
      >
        {containerProps.children}
        {visible && (
          <div ref={popupRef} className={cx(["Tooltip-popup", computedPlacement])}>
            {content ?? renderContent?.()}
          </div>
        )}
      </Container>
    );
  }

  return (
    <span
      {...containerProps}
      className={cx("Tooltip", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onMouseClick}
    >
      <span
        ref={handlerRef}
        onClick={onHandleClick}
        className={cx({ "Tooltip-handle": !disableHandleStyle }, [handleClassName], { active: visible })}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {isHandlerDisabled ? <div className="Tooltip-disabled-wrapper">{handle}</div> : <>{handle}</>}
      </span>
      {visible && (
        <div ref={popupRef} className={cx(["Tooltip-popup", computedPlacement])}>
          {content ?? renderContent?.()}
        </div>
      )}
    </span>
  );
}
