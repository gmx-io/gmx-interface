import { ReactNode } from "react";
import cx from "classnames";

import { ReactComponent as InfoIconComponent } from "img/ic_info.svg";
import { ReactComponent as WarnIconComponent } from "img/ic_warn.svg";

import "./AlertInfo.scss";

interface Props {
  type: "warning" | "info";
  children: ReactNode;
  compact?: boolean;
  /**
   * @default "text-gray"
   */
  textColor?: "text-gray" | "text-warning";
}

export function AlertInfo({ compact = false, children, type, textColor = "text-gray" }: Props) {
  const Icon = type === "warning" ? WarnIconComponent : InfoIconComponent;
  return (
    <div className={cx("AlertInfo", { compact }, textColor)}>
      <div className="AlertInfo-icon">
        <Icon aria-label="Alert Icon" />
      </div>
      <div className={cx("AlertInfo-text")}>{children}</div>
    </div>
  );
}
