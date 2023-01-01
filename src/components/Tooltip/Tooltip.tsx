import cx from "classnames";
import { useCallback, useState, useRef } from "react";
import { IS_TOUCH } from "config/env";

const OPEN_DELAY = 0;
const CLOSE_DELAY = 100;

type Props = {
  handle: React.ReactNode;
  renderContent: () => React.ReactNode;
  position?: string;
  trigger?: string;
  className?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
  isHandlerDisabled?: boolean;
};

export default function Tooltip(props: Props) {
  const [visible, setVisible] = useState(false);
  const intervalCloseRef = useRef<ReturnType<typeof setTimeout> | null>();
  const intervalOpenRef = useRef<ReturnType<typeof setTimeout> | null>();

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
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {props.isHandlerDisabled ? <div className="Tooltip-disabled-wrapper">{props.handle}</div> : <>{props.handle}</>}
      </span>
      {visible && <div className={cx(["Tooltip-popup", position])}>{props.renderContent()}</div>}
    </span>
  );
}
