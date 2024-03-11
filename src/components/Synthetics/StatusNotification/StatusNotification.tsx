import { ReactNode, memo } from "react";
import cx from "classnames";

interface Props {
  children: ReactNode;
  title: ReactNode;
  hasError?: boolean;
}

const StatusNotification = memo<Props>(function StatusNotification({ children, title, hasError }) {
  return (
    <div className="StatusNotification">
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">{title}</div>
        <div className="StatusNotification-items">{children}</div>
      </div>

      <div className={cx("StatusNotification-background", { error: hasError })} />
    </div>
  );
});

export { StatusNotification };
