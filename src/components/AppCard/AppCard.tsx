import cx from "classnames";

export default function AppCard({ children, dataQa }: { children: React.ReactNode; dataQa?: string }) {
  return (
    <div className="rounded-8 bg-slate-900" data-qa={dataQa}>
      {children}
    </div>
  );
}

export function AppCardSection({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cx("flex flex-col gap-12 border-b border-slate-600 px-20 py-13 last:border-b-0", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
