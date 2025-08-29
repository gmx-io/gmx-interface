import { ReactNode, memo } from "react";

interface Props {
  children: ReactNode;
  title: ReactNode;
}

const StatusNotification = memo<Props>(function StatusNotification({ children, title }) {
  return (
    <div className="StatusNotification">
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">{title}</div>
        <div className="StatusNotification-items">{children}</div>
      </div>
    </div>
  );
});

export { StatusNotification };
