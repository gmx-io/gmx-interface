import cx from "classnames";
import { useCallback, useState, useRef, MouseEvent, ReactNode } from "react";
import { IS_TOUCH } from "config/env";
import "./Tooltip.scss";
// import { computePosition, flip, shift } from "@floating-ui/dom";

const OPEN_DELAY = 0;
const CLOSE_DELAY = 100;

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

type Props = {
  handle: ReactNode;
  renderContent: () => ReactNode;
  position?: TooltipPosition;
  trigger?: string;
  className?: string;
  disableHandleStyle?: boolean;
  handleClassName?: string;
  isHandlerDisabled?: boolean;
  openDelay?: number;
  closeDelay?: number;
};

export default function Tooltip(props: Props) {
  const [visible, setVisible] = useState(false);
  const intervalCloseRef = useRef<ReturnType<typeof setTimeout> | null>();
  const intervalOpenRef = useRef<ReturnType<typeof setTimeout> | null>();

  const handleRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const openDelay = props.openDelay ?? OPEN_DELAY;
  const closeDelay = props.closeDelay ?? CLOSE_DELAY;

  const position = props.position ?? "bottom-start";
  const trigger = props.trigger ?? "hover";

  if (visible && handleRef.current && popupRef.current) {
    // computePosition(handleRef.current, popupRef.current, {
    //   middleware: [flip(), shift()],
    //   placement: "bottom-end",
    // }).then(({ placement }) => {
    // });
  }

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
  }, [setVisible, intervalCloseRef, intervalOpenRef, trigger, openDelay]);

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
    }, closeDelay);
    if (intervalOpenRef.current) {
      clearInterval(intervalOpenRef.current);
      intervalOpenRef.current = null;
    }
  }, [setVisible, intervalCloseRef, closeDelay]);

  const onHandleClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  const className = cx("Tooltip", props.className);

  return (
    <span className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onMouseClick}>
      <span
        ref={handleRef}
        onClick={onHandleClick}
        className={cx({ "Tooltip-handle": !props.disableHandleStyle }, [props.handleClassName], { active: visible })}
      >
        {/* For onMouseLeave to work on disabled button https://github.com/react-component/tooltip/issues/18#issuecomment-411476678 */}
        {props.isHandlerDisabled ? <div className="Tooltip-disabled-wrapper">{props.handle}</div> : <>{props.handle}</>}
      </span>
      {visible && (
        <div ref={popupRef} className={cx(["Tooltip-popup", position])}>
          {props.renderContent()}
        </div>
      )}
    </span>
  );
}
