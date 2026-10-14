import cx from "classnames";
import React, { PropsWithChildren, useCallback } from "react";

export function SyntheticsInfoRow({
  children,
  label,
  qa,
  value,
  className,
  onClick,
  isWarning,
  labelClassName,
  valueClassName,
}: PropsWithChildren<{
  label: React.ReactNode;
  value?: React.ReactNode;
  qa?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  isWarning?: boolean;
  labelClassName?: string;
  valueClassName?: string;
}>) {
  const Component = onClick ? "button" : "div";

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
      if (onClick && e.key === "Enter") {
        e.stopPropagation();
      }
    },
    [onClick]
  );

  return (
    <Component
      type={onClick ? "button" : undefined}
      className={cx(
        "flex w-full justify-between gap-8 text-14",
        {
          "cursor-pointer": onClick,
        },
        className
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      data-qa={qa ? `info-row-${qa}` : undefined}
    >
      <div className={cx("font-medium text-typography-secondary", labelClassName)}>{label}</div>
      <div className={cx("text-right", { "text-red-500": isWarning }, valueClassName)}>{children || value}</div>
    </Component>
  );
}
