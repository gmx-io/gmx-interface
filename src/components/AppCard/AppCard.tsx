import cx from "classnames";
import { forwardRef, useCallback } from "react";

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
  const handleClick = useCallback(() => onClick?.(), [onClick]);

  return (
    <div
      className={cx("flex flex-col gap-12 border-b-1/2 border-slate-600 px-20 py-13 last:border-b-0", className)}
      onClick={handleClick}
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
    <div className={cx("flex border-b-1/2 border-slate-600 last:border-b-0", className)}>
      <div className={cx("flex-1 border-r-1/2 border-slate-600", leftClassName)}>{left}</div>
      <div className="flex-1">{right}</div>
    </div>
  );
};
