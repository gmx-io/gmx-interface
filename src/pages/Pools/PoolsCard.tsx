import { ReactNode } from "react";

export default function PoolsCard({
  children,
  title,
  description,
  bottom,
}: {
  children: ReactNode;
  title: ReactNode;
  description: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <div className="rounded-6 bg-slate-900">
      <div className="flex flex-col p-16">
        <span className="text-body-large mb-8">{title}</span>
        <span className="text-body-medium mb-16 text-slate-100">{description}</span>
        <div>{children}</div>
      </div>
      {bottom && <div className="border-t border-stroke-primary p-8">{bottom}</div>}
    </div>
  );
}
