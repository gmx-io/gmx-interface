import cx from "classnames";
import { ReactNode } from "react";

import Tooltip from "../Tooltip/Tooltip";

type Props = {
  message?: string;
  tooltipText?: string;
  className?: string;
  children?: ReactNode;
};

function EmptyMessage({ message = "", tooltipText, className = "", children }: Props) {
  return (
    <div className={cx("empty-message", className)}>
      {tooltipText ? (
        <Tooltip handle={<span>{message}</span>} position="top" renderContent={() => tooltipText} />
      ) : (
        <p>{message}</p>
      )}
      {children}
    </div>
  );
}

export default EmptyMessage;
