import cx from "classnames";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  indicator?: BadgeIndicator;
  className?: string;
};

export type BadgeIndicator = "error" | "warning";

export default function Badge({ children, indicator, className }: Props) {
  return (
    <div
      className={cx(
        "text-body-small relative min-w-20 rounded-full bg-slate-700 px-6 py-2 font-medium text-typography-secondary",
        className
      )}
    >
      {children}
      {indicator ? (
        <div
          className={cx("absolute -right-1 -top-1 h-6 w-6 rounded-full", {
            "bg-red-500": indicator === "error",
            "bg-yellow-300": indicator === "warning",
          })}
        />
      ) : null}
    </div>
  );
}
