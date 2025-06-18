import cx from "classnames";
import { ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  childrenContainerClassName?: string;
};

export function PoolsDetailsCard({ title, children, childrenContainerClassName }: Props) {
  return (
    <div className="flex flex-col rounded-4 bg-slate-800">
      <div className="text-body-large border-b border-b-stroke-primary p-16">{title}</div>
      <div className={cx("p-16", childrenContainerClassName)}>{children}</div>
    </div>
  );
}
