import cx from "classnames";
import { ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
  childrenContainerClassName?: string;
};

export function PoolsDetailsCard({ title, children, childrenContainerClassName }: Props) {
  return (
    <div className="flex flex-col rounded-8 bg-fill-surfaceBase">
      <div className="text-h4 border-b-1/2 border-b-stroke-primary p-20">{title}</div>
      <div className={cx("p-20", childrenContainerClassName)}>{children}</div>
    </div>
  );
}
