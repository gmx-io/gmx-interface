import "./Alert.scss";
import warningIcon from "img/ic_warning.svg";
import infoIcon from "img/ic_info_circle.svg";
import { ReactNode } from "react";

function AlertWithIcon({ type, children }: { type: "warning" | "info"; children?: ReactNode }) {
  const icon = type === "warning" ? warningIcon : infoIcon;
  return (
    <div className="Alert-container">
      <img className="Alert__icon" src={icon} alt="Alert Icon" />
      <span className="Alert__message">{children}</span>
    </div>
  );
}

export default AlertWithIcon;
