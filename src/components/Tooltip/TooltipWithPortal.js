import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import cx from "classnames";

import "./Tooltip.css";

function Portal({ children }) {
  const root = document.body;
  const el = document.createElement("div");

  useEffect(() => {
    root.appendChild(el);
    return () => root.removeChild(el);
  }, [el, root]);

  return createPortal(children, el);
}

const isTouch = "ontouchstart" in window;

const OPEN_DELAY = 0;
const CLOSE_DELAY = 100;

export default function TooltipWithPortal(props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({});
  const intervalCloseRef = useRef(null);
  const intervalOpenRef = useRef(null);

  const position = props.position ?? "left-bottom";
  const trigger = props.trigger ?? "hover";
  const handlerRef = useRef();

  const updateTooltipCoords = useCallback(() => {
    const rect = handlerRef.current.getBoundingClientRect();
    setCoords({
      left: rect.x + rect.width / 2,
      top: rect.y + window.scrollY,
    });
  }, [handlerRef]);

  const onMouseEnter = useCallback(() => {
    if (trigger !== "hover" || isTouch) return;

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
    if (trigger !== "click" && !isTouch) return;
    if (intervalCloseRef.current) {
      clearInterval(intervalCloseRef.current);
      intervalCloseRef.current = null;
    }
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
    updateTooltipCoords();
    setVisible(true);
  }, [setVisible, intervalCloseRef, trigger, updateTooltipCoords]);

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
            <div className={cx(["Tooltip-popup", position])}>{props.renderContent()}</div>
          </div>
        </Portal>
      )}
    </span>
  );
}
