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
      <div className="flex flex-col">
        <div className="flex flex-col gap-8 border-b-[0.5px] border-slate-600 p-16">
          <span className="text-h2 font-medium max-md:text-body-medium">{title}</span>
          <span className="text-body-medium text-slate-100 max-md:text-body-small">{description}</span>
        </div>
        <div className="max-md:p-12">{children}</div>
      </div>
      {bottom && <div className="border-t-[0.5px] border-slate-600 p-16">{bottom}</div>}
    </div>
  );
}
