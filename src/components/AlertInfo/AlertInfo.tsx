import { ReactNode } from "react";
import cx from "classnames";

import { ReactComponent as InfoIconComponent } from "img/ic_info.svg";
import { ReactComponent as WarnIconComponent } from "img/ic_warn.svg";

import "./AlertInfo.scss";

interface Props {
  type: "warning" | "info";
  children: ReactNode;
  className?: string;
  compact?: boolean;
  /**
   * @default "text-gray-300"
   */
  textColor?: "text-gray-300" | "text-yellow-500";
}

export function AlertInfo({ compact = false, children, type, textColor = "text-gray-300", className }: Props) {
  const Icon = type === "warning" ? WarnIconComponent : InfoIconComponent;
  return (
    <div className={cx("AlertInfo", { compact }, textColor, className)}>
      <div className="AlertInfo-icon">
        <Icon aria-label="Alert Icon" />
      </div>
      <div className={cx("AlertInfo-text")}>{children}</div>
    </div>
  );
}
