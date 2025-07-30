import cx from "classnames";
import { ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  childrenContainerClassName?: string;
};

export function PoolsDetailsCard({ title, children, childrenContainerClassName }: Props) {
  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="border-b border-b-slate-600 p-20 text-[20px] font-medium">{title}</div>
      <div className={cx("p-20", childrenContainerClassName)}>{children}</div>
    </div>
  );
}
