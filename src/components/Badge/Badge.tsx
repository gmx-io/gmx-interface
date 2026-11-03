import cx from "classnames";
import { ReactNode } from "react";

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
        "text-body-small relative min-w-20 rounded-full bg-button-background px-4 py-4 font-medium text-textIcon-secondary",
        className
      )}
    >
      {children}
      {indicator ? (
        <div
          className={cx("absolute right-0 top-0 h-6 w-6 rounded-full", {
            "bg-red-strong": indicator === "error",
            "bg-yellow-strong": indicator === "warning",
          })}
        />
      ) : null}
    </div>
  );
}
