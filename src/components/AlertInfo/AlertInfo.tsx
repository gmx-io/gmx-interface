import cx from "classnames";
import type { ReactNode } from "react";

import InfoIconComponent from "img/ic_info.svg?react";
import WarnIconComponent from "img/ic_warn.svg?react";

type Props = {
  type: "warning" | "info";
  children: ReactNode;
  className?: string;
  compact?: boolean;
  noMargin?: boolean;
  onClick?: () => void;
  /**
   * @default "text-typography-secondary"
   */
  textColor?: "text-typography-secondary" | "text-yellow-300";
};

export function AlertInfo({
  compact = false,
  noMargin = false,
  children,
  type,
  textColor = "text-typography-secondary",
  className,
  onClick,
}: Props) {
  const Icon = type === "warning" ? WarnIconComponent : InfoIconComponent;

  return (
    <div
      className={cx(
        "flex",
        {
          "mb-16": !compact && !noMargin,
          "mb-8": compact,
          "mb-0": noMargin,
        },
        textColor,
        className
      )}
      onClick={onClick}
    >
      <div className="pr-6 pt-2">
        <Icon aria-label="Alert Icon" className="block" />
      </div>
      <div className="text-body-small">{children}</div>
    </div>
  );
}
