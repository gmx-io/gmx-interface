import { ReactNode } from "react";

type Props = {
  title: ReactNode;
  children: ReactNode;
};

export function PoolsDetailsCard({ title, children }: Props) {
  return (
    <div className="flex flex-col rounded-4 bg-slate-800">
      <div className="text-body-large border-b border-b-stroke-primary p-16">{title}</div>
      <div className="p-16">{children}</div>
    </div>
  );
}
