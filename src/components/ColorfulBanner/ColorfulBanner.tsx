import cx from "classnames";
import { useCallback } from "react";

import ButtonLink from "components/Button/ButtonLink";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";

const colorSchemas = {
  red: {
    border: "border-l-red-strong",
    bg: "bg-red-background",
    icon: "text-red-strong",
    accent: "[--colorful-banner-accent-color:var(--color-red-strong)]",
  },
  blue: {
    border: "border-l-blue-strong",
    icon: "text-blue-strong",
    bg: "bg-blue-backgroundOpacity",
    accent: "[--colorful-banner-accent-color:var(--color-blue-strong)]",
  },
  yellow: {
    border: "border-l-yellow-strong",
    icon: "text-yellow-strong",
    bg: "bg-yellow-backgroundOpacity",
    accent: "[--colorful-banner-accent-color:var(--color-yellow-strong)]",
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
        "text-body-small flex justify-between gap-8 rounded-8 border-l-2 p-12 text-textIcon-primary",
        withBorder && colorSchemas[color].border,
        colorSchemas[color].bg,
        colorSchemas[color].accent,
        className
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 grow items-center gap-8">
        {Icon && (
          <div className={cx("shrink-0 text-20", colorSchemas[color].icon)}>
            <Icon className="size-20 p-[1.25px]" />
          </div>
        )}
        <div className="min-w-0 grow">{children}</div>
      </div>
      {onClose && (
        <button
          className={cx("h-fit shrink-0 p-2 text-textIcon-secondary hover:text-textIcon-primary")}
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
  disabled,
}: {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  color?: keyof typeof colorSchemas;
  newTab?: boolean;
  disabled?: boolean;
}) => {
  const className = cx("mt-4 flex items-center gap-4 font-medium", colorSchemas[color].icon, {
    "cursor-not-allowed opacity-50": disabled,
  });

  if (to) {
    return (
      <ButtonLink className={className} to={to} onClick={onClick} newTab={newTab}>
        {children}

        <ChevronRightIcon className="size-12" />
      </ButtonLink>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {children}

      <ChevronRightIcon className="size-12" />
    </button>
  );
};
