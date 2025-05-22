import cx from "classnames";
import { IoMdClose } from "react-icons/io";

const colorSchemas = {
  green: {
    border: "border-l-green-700",
    bg: "bg-green-600",
  },
  red: {
    border: "border-l-red-700",
    bg: "bg-red-600",
  },
  blue: {
    border: "border-l-blue-600",
    bg: "bg-cold-blue-700",
  },
  slate: {
    border: "border-l-slate-100",
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
  return (
    <div
      className={cx(
        "relative flex items-center rounded-4 border-l-2 px-6 py-8",
        withBorder && colorSchemas[color].border,
        colorSchemas[color].bg,
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="mr-6 w-16">
          <div className="absolute top-13">{icon}</div>
        </div>
      )}
      <div className="pr-14">{children}</div>
      {onClose && (
        <div className="absolute right-8 top-1/2 -translate-y-7">
          <button className=" text-gray-400 hover:text-white" onClick={onClose}>
            <IoMdClose size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
