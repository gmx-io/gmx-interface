import cx from "classnames";
import { ReactNode } from "react";

export default function PoolsCard({
  children,
  title,
  description,
  bottom,
  className,
}: {
  children: ReactNode;
  title: ReactNode;
  description: ReactNode;
  bottom?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("overflow-hidden rounded-6 bg-slate-900", className)}>
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-8 border-b-stroke border-slate-600 p-16">
          <span className="text-h3 font-medium max-md:text-body-medium">{title}</span>
          <span className="text-body-medium text-slate-100 max-md:text-body-small">{description}</span>
        </div>
        <div className="grow overflow-y-auto max-md:p-12">{children}</div>
        {bottom && <div className="border-t-stroke border-slate-600 p-16">{bottom}</div>}
      </div>
    </div>
  );
}
