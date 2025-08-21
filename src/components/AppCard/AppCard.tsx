import cx from "classnames";
import { forwardRef } from "react";

export const AppCard = forwardRef<HTMLDivElement, { children: React.ReactNode; dataQa?: string }>(
  ({ children, dataQa }, ref) => {
    return (
      <div className="rounded-8 bg-slate-900" data-qa={dataQa} ref={ref}>
        {children}
      </div>
    );
  }
);

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
      className={cx("flex flex-col gap-12 border-b-stroke border-slate-600 px-20 py-13 last:border-b-0", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export const AppCardSplit = ({
  right,
  left,
  className,
  leftClassName,
}: {
  right: React.ReactNode;
  left: React.ReactNode;
  leftClassName?: string;
  className?: string;
}) => {
  return (
    <div className={cx("flex border-b-stroke border-slate-600 last:border-b-0", className)}>
      <div className={cx("flex-1 border-r-stroke border-slate-600", leftClassName)}>{left}</div>
      <div className="flex-1">{right}</div>
    </div>
  );
};
