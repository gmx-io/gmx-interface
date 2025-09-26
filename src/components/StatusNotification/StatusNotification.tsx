import { ReactNode, memo } from "react";

interface Props {
  children: ReactNode;
  title: ReactNode;
}

const StatusNotification = memo<Props>(function StatusNotification({ children, title }) {
  return (
    <div className="StatusNotification">
      <div className="relative z-[1]">
        <div className="StatusNotification-title">{title}</div>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
});

export { StatusNotification };
