import { ReactNode } from "react";
import cx from "classnames";

import infoIcon from "img/ic_info.svg";
import warningIcon from "img/ic_warn.svg";

import "./AlertInfo.scss";

interface Props {
  type: "warning" | "info";
  children: ReactNode;
  compact?: boolean;
}

export function AlertInfo({ compact = false, children, type }: Props) {
  const icon = type === "warning" ? warningIcon : infoIcon;
  return (
    <div className={cx("AlertInfo", { compact })}>
      <div className="AlertInfo-icon">
        <img src={icon} alt="Alert Icon" />
      </div>
      <div className="AlertInfo-text text-gray">{children}</div>
    </div>
  );
}
