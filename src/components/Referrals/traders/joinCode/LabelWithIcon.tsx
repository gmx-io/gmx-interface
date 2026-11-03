import { ReactNode } from "react";

export function LabelWithIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: ReactNode;
}) {
  return (
    <div className="text-body-small flex items-center rounded-full bg-blue-backgroundOpacity py-2 pl-4 pr-6 font-medium text-blue-strong">
      <Icon className="mr-4 size-16" />
      {label}
    </div>
  );
}
