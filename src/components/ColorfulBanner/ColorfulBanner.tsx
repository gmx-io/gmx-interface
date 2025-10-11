import cx from "classnames";
import { useCallback } from "react";

import ButtonLink from "components/Button/ButtonLink";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";

const colorSchemas = {
  green: {
    border: "border-l-green-700",
    bg: "bg-green-600",
    icon: "text-green-600",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-900",
    icon: "text-red-500",
  },
  blue: {
    border: "border-l-blue-300",
    icon: "text-blue-300",
    bg: "bg-blue-300 bg-opacity-20",
  },
  yellow: {
    border: "border-l-yellow-300",
    icon: "text-yellow-300",
    bg: "bg-yellow-300 bg-opacity-20",
  },
};

export function ColorfulBanner({
  children,
  icon: Icon,
  onClose,
  onClick,
  withBorder = true,
  className,
  color = "blue",
}: {
  children: React.ReactNode;
  icon?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
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
        "flex justify-between gap-8 rounded-8 border-l-2 p-12 text-13 leading-[1.3] text-typography-primary",
        withBorder && colorSchemas[color].border,
        colorSchemas[color].bg,
        className
      )}
      onClick={onClick}
    >
      <div className="flex gap-8">
        {Icon && (
          <div className={cx("shrink-0 text-20", colorSchemas[color].icon)}>
            <Icon className="size-20 p-[1.25px]" />
          </div>
        )}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          className={cx("h-fit p-2 text-typography-secondary hover:text-typography-primary")}
          onClick={handleClose}
        >
          <CloseIcon className="size-16" />
        </button>
      )}
    </div>
  );
}

export const ColorfulButtonLink = ({
  children,
  to,
  onClick,
  color = "blue",
  newTab,
}: {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  color?: keyof typeof colorSchemas;
  newTab?: boolean;
}) => {
  const className = cx("mt-4 flex items-center gap-4 font-medium", colorSchemas[color].icon);

  if (to) {
    return (
      <ButtonLink className={className} to={to} onClick={onClick} newTab={newTab}>
        {children}

        <ChevronRightIcon className="size-12" />
      </ButtonLink>
    );
  }

  return (
    <button className={className} onClick={onClick}>
      {children}

      <ChevronRightIcon className="size-12" />
    </button>
  );
};
