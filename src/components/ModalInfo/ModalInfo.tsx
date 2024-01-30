import { ReactNode } from "react";
import cx from "classnames";

import infoIcon from "img/ic_info.svg";
import warnIcon from "img/ic_warn.svg";

import "./ModalInfo.scss";

interface Props {
  children: ReactNode;
  standalone?: boolean;
  warning?: boolean;
}

export function ModalInfo({ standalone = false, children, warning }: Props) {
  return (
    <div className={cx("ModalInfo", { standalone })}>
      <div className="ModalInfo-icon">
        <img src={warning ? warnIcon : infoIcon} alt="Warning" />
      </div>
      <div className="ModalInfo-text text-gray">{children}</div>
    </div>
  );
}
