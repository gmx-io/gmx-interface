import { ReactNode } from "react";

export function BaseAssetCard({
  icon,
  title,
  subtitle,
  headerButton,
  children,
  footer,
}: {
  icon: ReactNode | string;
  title: ReactNode;
  subtitle?: ReactNode;
  headerButton: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
      <div className="flex items-start justify-between gap-12">
        <div className="flex items-center gap-12">
          {icon}
          <div className="flex flex-col">
            <span className="text-body-large font-medium text-typography-primary">{title}</span>
            {subtitle ? <span className="text-body-small text-typography-secondary">{subtitle}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-start">{headerButton}</div>
      </div>

      <div className="mt-auto flex flex-col gap-12">
        {children}
        {footer}
      </div>
    </div>
  );
}
