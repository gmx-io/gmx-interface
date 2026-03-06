import { ReactNode } from "react";

export function LabelWithIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: ReactNode;
}) {
  return (
    <div className="text-body-small flex items-center rounded-full bg-blue-300/20 py-2 pl-4 pr-6 font-medium text-blue-300">
      <Icon className="mr-4 size-16" />
      {label}
    </div>
  );
}
