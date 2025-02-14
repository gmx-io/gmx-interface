import cx from "classnames";
import React, { PropsWithChildren } from "react";

export function SyntheticsInfoRow({
  children,
  label,
  qa,
  value,
  className,
  onClick,
  isWarning,
  valueClassName,
}: PropsWithChildren<{
  label: React.ReactNode;
  value?: React.ReactNode;
  qa?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isWarning?: boolean;
  valueClassName?: string;
}>) {
  return (
    <div
      className={cx(
        "flex items-baseline justify-between gap-8 text-14 leading-[16px]",
        {
          "cursor-pointer": onClick,
        },
        className
      )}
      onClick={onClick}
      data-qa={qa ? `info-row-${qa}` : undefined}
    >
      <div className="text-slate-100">{label}</div>
      <div className={cx("text-right", { "text-red-500": isWarning }, valueClassName)}>{children || value}</div>
    </div>
  );
}
