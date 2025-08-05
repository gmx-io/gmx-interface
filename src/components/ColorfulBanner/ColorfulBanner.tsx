import cx from "classnames";
import { useCallback } from "react";
import { IoMdClose } from "react-icons/io";

const colorSchemas = {
  green: {
    border: "border-l-green-700",
    bg: "bg-green-600",
    icon: "text-green-600",
  },
  red: {
    border: "border-l-red-700",
    bg: "bg-red-600",
    icon: "text-red-600",
  },
  blue: {
    border: "border-l-blue-300",
    icon: "text-blue-300",
    bg: "bg-blue-300 bg-opacity-20",
  },
  slate: {
    border: "border-l-slate-100",
    icon: "text-slate-100",
    bg: "bg-slate-600",
  },
};

export function ColorfulBanner({
  children,
  icon,
  onClose,
  onClick,
  withBorder = true,
  className,
  color = "slate",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  withBorder?: boolean;
  color?: keyof typeof colorSchemas;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}) {
  const handleClose = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClose?.();
    },
    [onClose]
  );

  return (
    <div
      className={cx(
        "flex items-center justify-between gap-8 rounded-8 border-l-2 p-12 text-13 leading-[1.3]",
        withBorder && colorSchemas[color].border,
        colorSchemas[color].bg,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-8">
        {icon && (
          <div className={cx("mr-6 w-16", colorSchemas[color].icon)}>
            <div className="">{icon}</div>
          </div>
        )}
        <div>{children}</div>
      </div>
      {onClose && (
        <button className={cx(" text-slate-100 hover:text-white")} onClick={handleClose}>
          <IoMdClose size={20} />
        </button>
      )}
    </div>
  );
}
