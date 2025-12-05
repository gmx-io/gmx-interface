import cx from "classnames";
import { ReactNode } from "react";

type Props = {
  label: ReactNode;
  content: ReactNode;
  className?: string;
  labelClassName?: string;
  contentClassName?: string;
};

export function BlockField({ label, content, className, labelClassName, contentClassName }: Props) {
  return (
    <div className={cx("flex items-center justify-between gap-10 rounded-4 bg-slate-800 px-8 py-[3.5px]", className)}>
      <div className={cx("text-13 text-typography-secondary", labelClassName)}>{label}</div>
      <div className={cx("flex min-w-0 flex-1 justify-end", contentClassName)}>{content}</div>
    </div>
  );
}
