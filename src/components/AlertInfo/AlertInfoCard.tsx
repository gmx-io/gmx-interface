import cx from "classnames";
import { ReactNode, useCallback, useState } from "react";
import { MdClose } from "react-icons/md";

import InfoIconComponent from "img/ic_info.svg?react";
import WarnIconComponent from "img/ic_warn.svg?react";

type Props = {
  /**
   * @default "info"
   */
  type?: "warning" | "info";
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
    <div
      className={cx(
        "text-body-small flex rounded-4 border-l-2 px-8 py-8",
        {
          "border-blue-300 bg-cold-blue-900 text-white": type === "info",
          "border-yellow-500 bg-[#423727] text-yellow-500": type === "warning",
        },
        className
      )}
    >
      <div className="pr-5 pt-2">
        <Icon aria-label="Alert Icon" className="block size-12 text-blue-300" fontSize={12} />
      </div>
      <div className="grow">{children}</div>

      {onClose && <MdClose fontSize={16} className="ml-4 shrink-0 cursor-pointer text-white" onClick={handleClose} />}
    </div>
  );
}
