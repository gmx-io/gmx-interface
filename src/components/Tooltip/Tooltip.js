import cx from "classnames";
import { useCallback, useState, useRef } from "react";
import { IS_TOUCH } from "config/ui";

const OPEN_DELAY = 0;
const CLOSE_DELAY = 100;

export default function Tooltip(props) {
  const [visible, setVisible] = useState(false);
  const intervalCloseRef = useRef(null);
  const intervalOpenRef = useRef(null);

  const position = props.position ?? "left-bottom";
  const trigger = props.trigger ?? "hover";

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
  }, [setVisible, intervalCloseRef, intervalOpenRef, trigger]);

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
  }, [setVisible, intervalCloseRef, trigger]);

  const onMouseLeave = useCallback(() => {
    intervalCloseRef.current = setTimeout(() => {
      setVisible(false);
      intervalCloseRef.current = null;
    }, CLOSE_DELAY);
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
  }, [setVisible, intervalCloseRef]);

  const className = cx("Tooltip", props.className);

  return (
    <span className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
      <span
        className={cx({ "Tooltip-handle": !props.disableHandleStyle }, [props.handleClassName], { active: visible })}
      >
        {props.handle}
      </span>
      {visible && <div className={cx(["Tooltip-popup", position])}>{props.renderContent()}</div>}
    </span>
  );
}
