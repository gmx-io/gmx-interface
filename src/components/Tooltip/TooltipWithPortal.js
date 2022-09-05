import { useCallback, useRef, useState } from "react";
import cx from "classnames";

import "./Tooltip.css";
import { IS_TOUCH } from "../../config/ui";
import Portal from "../Common/Portal";

const OPEN_DELAY = 0;
const CLOSE_DELAY = 100;

export default function TooltipWithPortal(props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({});
  const [tooltipWidth, setTooltipWidth] = useState();
  const intervalCloseRef = useRef(null);
  const intervalOpenRef = useRef(null);

  const position = props.position ?? "left-bottom";
  const trigger = props.trigger ?? "hover";
  const handlerRef = useRef();

  const updateTooltipCoords = useCallback(() => {
    const rect = handlerRef.current.getBoundingClientRect();

    setCoords({
      height: rect.height,
      width: rect.width,
      left: rect.x,
      top: rect.y + window.scrollY,
    });

    if (props.fitHandleWidth) {
      setTooltipWidth(`${rect.width}px`);
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
      }, OPEN_DELAY);
    }
    updateTooltipCoords();
  }, [setVisible, intervalCloseRef, intervalOpenRef, trigger, updateTooltipCoords]);

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
    updateTooltipCoords();

    if (props.closeOnDoubleClick) {
      setVisible((old) => !old);
    } else {
      setVisible(true);
    }
  }, [setVisible, intervalCloseRef, trigger, updateTooltipCoords, props.closeOnDoubleClick]);

  const onMouseLeave = useCallback(() => {
    intervalCloseRef.current = setTimeout(() => {
      setVisible(false);
      intervalCloseRef.current = null;
    }, CLOSE_DELAY);
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
    updateTooltipCoords();
  }, [setVisible, intervalCloseRef, updateTooltipCoords]);

  const className = cx("Tooltip", props.className);

  return (
    <span className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
      <span
        className={cx({ "Tooltip-handle": !props.disableHandleStyle }, [props.handleClassName], { active: visible })}
        ref={handlerRef}
      >
        {props.handle}
      </span>
      {visible && coords.left && (
        <Portal>
          <div style={{ ...coords, position: "absolute" }}>
            <div className={cx(["Tooltip-popup", position])} style={{ width: tooltipWidth }}>
              {props.renderContent()}
            </div>
          </div>
        </Portal>
      )}
    </span>
  );
}
