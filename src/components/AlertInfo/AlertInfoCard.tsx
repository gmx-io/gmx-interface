import { ReactNode, useCallback, useState } from "react";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import InfoIconComponent from "img/ic_info.svg?react";
import WarnIconComponent from "img/ic_warn.svg?react";

type Props = {
  /**
   * @default "info"
   */
  type?: "warning" | "info" | "error";
  children: ReactNode;
  className?: string;
  onClose?: () => void;
};

export function AlertInfoCard({ children, type = "info", onClose, className }: Props) {
  const [closed, setClosed] = useState(false);
  const Icon = type === "warning" ? WarnIconComponent : InfoIconComponent;

  const handleClose = useCallback(() => {
    setClosed(true);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  if (closed) {
    return null;
  }

  return (
    <ColorfulBanner
      className={className}
      color={type === "info" ? "blue" : type === "warning" ? "yellow" : "red"}
      icon={Icon}
      onClose={handleClose}
    >
      {children}
    </ColorfulBanner>
  );
}
