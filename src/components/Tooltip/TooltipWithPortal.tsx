import React, { CSSProperties, MouseEvent, PropsWithChildren, useCallback, useMemo, useRef, useState } from "react";
import cx from "classnames";

import "./Tooltip.scss";
import { IS_TOUCH } from "config/env";
import Portal from "../Common/Portal";
import { TooltipPosition } from "./Tooltip";
import { TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "config/ui";

type Props = PropsWithChildren<{
  /**
   * Takes precedence over `children`
   */
  handle?: React.ReactNode;
  renderContent: () => React.ReactNode;
  position?: TooltipPosition;
  trigger?: string;
  className?: string;
  portalClassName?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
  isHandlerDisabled?: boolean;
  fitHandleWidth?: boolean;
  closeOnDoubleClick?: boolean;
  openDelay?: number;
  closeDelay?: number;
  shouldStopPropagation?: boolean;
  disabled?: boolean;
}>;

type Coords = {
  height?: number;
  width?: number;
  left?: number;
  top?: number;
};

export default function TooltipWithPortal(props: Props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<Coords>({});
  const [tooltipWidth, setTooltipWidth] = useState<string>();
  const intervalCloseRef = useRef<ReturnType<typeof setTimeout> | null>();
  const intervalOpenRef = useRef<ReturnType<typeof setTimeout> | null>();

  const position = props.position ?? "left-bottom";
  const trigger = props.trigger ?? "hover";
  const handlerRef = useRef<null | HTMLInputElement>(null);

  const updateTooltipCoords = useCallback(() => {
    const rect = handlerRef?.current?.getBoundingClientRect();

    if (rect) {
      setCoords({
        height: rect.height,
        width: rect.width,
        left: rect.x,
        top: rect.y + window.scrollY,
      });
      if (props.fitHandleWidth) {
        setTooltipWidth(`${rect.width}px`);
      }
    }
  }, [handlerRef, props.fitHandleWidth]);

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
      }, props.openDelay ?? TOOLTIP_OPEN_DELAY);
    }
    updateTooltipCoords();
  }, [setVisible, trigger, updateTooltipCoords, props.openDelay]);

  const onMouseClick = useCallback(
    (event: MouseEvent) => {
      if (props.shouldStopPropagation) {
        event.stopPropagation();
      }
      if (trigger !== "click" && !IS_TOUCH) return;
      if (intervalCloseRef.current) {
        clearInterval(intervalCloseRef.current);
        intervalCloseRef.current = null;
      }
      if (intervalOpenRef.current) {
        clearInterval(intervalOpenRef.current);
        intervalOpenRef.current = null;
      }
      updateTooltipCoords();

      if (props.closeOnDoubleClick) {
        setVisible((old) => !old);
      } else {
        setVisible(true);
      }
    },
    [props.closeOnDoubleClick, props.shouldStopPropagation, trigger, updateTooltipCoords]
  );

  const onMouseLeave = useCallback(() => {
    intervalCloseRef.current = setTimeout(() => {
      setVisible(false);
      intervalCloseRef.current = null;
    }, props.closeDelay ?? TOOLTIP_CLOSE_DELAY);
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
    updateTooltipCoords();
  }, [setVisible, updateTooltipCoords, props.closeDelay]);

  const onHandleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  const className = cx("Tooltip", props.className);
  const portalStyle = useMemo<CSSProperties>(() => ({ ...coords, position: "absolute" }), [coords]);
  const popupStyle = useMemo(() => ({ width: tooltipWidth }), [tooltipWidth]);

  return (
    <span className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
      <span
        className={cx({ "Tooltip-handle": !props.disableHandleStyle }, [props.handleClassName], { active: visible })}
        onClick={onHandleClick}
        ref={handlerRef}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {props.isHandlerDisabled ? (
          <div className="Tooltip-disabled-wrapper">{props.handle || props.children}</div>
        ) : (
          <>{props.handle || props.children}</>
        )}
      </span>
      {visible && coords.left && !props.disabled && (
        <Portal>
          <div style={portalStyle} className={props.portalClassName}>
            <div className={cx(["Tooltip-popup z-index-1001", position])} style={popupStyle}>
              {props.renderContent()}
            </div>
          </div>
        </Portal>
      )}
    </span>
  );
}
