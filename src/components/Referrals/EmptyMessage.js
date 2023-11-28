import Tooltip from "../Tooltip/Tooltip";
import cx from "classnames";

function EmptyMessage({ message = "", tooltipText, className = "" }) {
  return (
    <div className={cx("empty-message", className)}>
      {tooltipText ? (
        <Tooltip handle={<p>{message}</p>} position="center-bottom" renderContent={() => tooltipText} />
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}

export default EmptyMessage;
