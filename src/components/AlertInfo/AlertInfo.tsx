import { ReactNode } from "react";
import cx from "classnames";

import infoIcon from "img/ic_info.svg";
import warnIcon from "img/ic_warn.svg";

import "./AlertInfo.scss";

interface Props {
  children: ReactNode;
  standalone?: boolean;
  warning?: boolean;
}

export function AlertInfo({ standalone = false, children, warning }: Props) {
  return (
    <div className={cx("AlertInfo", { standalone })}>
      <div className="AlertInfo-icon">
        <img src={warning ? warnIcon : infoIcon} alt="Warning" />
      </div>
      <div className="AlertInfo-text text-gray">{children}</div>
    </div>
  );
}
