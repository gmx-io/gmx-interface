import { ReactNode } from "react";

export function LabelWithIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: ReactNode;
}) {
  return (
    <div className="text-body-small flex items-center rounded-full bg-blue-backgroundOpacity px-4 py-4 font-medium text-blue-strong">
      <Icon className="mr-4 size-16" />
      {label}
    </div>
  );
}
