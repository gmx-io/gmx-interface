import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { AnnouncementVariant } from "config/events";

import AlertIcon from "img/ic_alert.svg?react";
import CheckCircleIcon from "img/ic_check_circle.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import MessageIcon from "img/ic_message.svg?react";

type AnnouncementBannerProps = {
  variant?: AnnouncementVariant;
  headerLabel: ReactNode;
  headerIcon?: "info" | "alert" | "success" | ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footerLink?: {
    text: ReactNode;
    to?: string;
    href?: string;
    onClick?: () => void;
  };
  dots?: {
    count: number;
    activeIndex: number;
    onDotClick?: (index: number) => void;
  };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
};

const variantContainerClass: Record<AnnouncementVariant, string> = {
  info: "bg-cold-blue-900/90",
  warning: "bg-yellow-900/90",
  error: "bg-red-900/90",
  success: "bg-green-900/90",
};

const variantHeaderBorderClass: Record<AnnouncementVariant, string> = {
  info: "border-blue-300/15",
  warning: "border-yellow-500/25",
  error: "border-red-500/25",
  success: "border-green-500/25",
};

const variantAccentTextClass: Record<AnnouncementVariant, string> = {
  info: "text-blue-300",
  warning: "text-yellow-300",
  error: "text-red-100",
  success: "text-green-300",
};

const variantDotActiveClass: Record<AnnouncementVariant, string> = {
  info: "bg-blue-300",
  warning: "bg-yellow-300",
  error: "bg-red-100",
  success: "bg-green-300",
};

const variantDotInactiveClass: Record<AnnouncementVariant, string> = {
  info: "bg-blue-300/30 group-hover:bg-blue-300/60",
  warning: "bg-yellow-300/30 group-hover:bg-yellow-300/60",
  error: "bg-red-100/30 group-hover:bg-red-100/60",
  success: "bg-green-300/30 group-hover:bg-green-300/60",
};

function HeaderIcon({ kind, className }: { kind: "info" | "alert" | "success" | ReactNode; className: string }) {
  if (kind === "info") return <MessageIcon className={className} />;
  if (kind === "alert") return <AlertIcon className={className} />;
  if (kind === "success") return <CheckCircleIcon className={className} />;
  return <span className={className}>{kind}</span>;
}

export function AnnouncementBanner({
  variant = "info",
  headerLabel,
  headerIcon,
  onClose,
  children,
  footerLink,
  dots,
  onMouseEnter,
  onMouseLeave,
  className,
}: AnnouncementBannerProps) {
  const accentText = variantAccentTextClass[variant];

  return (
    <div
      className={cx(
        "w-[400px] max-w-full transform-gpu overflow-hidden rounded-12 border-1/2 border-stroke-primary backdrop-blur-[8px]",
        "shadow-[0px_8px_40px_-8px_rgba(9,10,20,0.4)]",
        variantContainerClass[variant],
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-qa="announcement-banner"
    >
      <div
        className={cx("flex items-center justify-between gap-8 border-b-1/2 p-12", variantHeaderBorderClass[variant])}
      >
        <div className="flex min-w-0 items-center gap-8">
          {headerIcon !== undefined && <HeaderIcon kind={headerIcon} className={cx("size-20 shrink-0", accentText)} />}
          <p className="text-body-medium truncate font-medium text-typography-primary">{headerLabel}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer text-typography-secondary hover:text-typography-primary"
            data-qa="announcement-banner-close"
            aria-label={t`Close`}
          >
            <CloseIcon className="size-20" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-12">
        <div className="text-body-medium leading-[1.3] text-typography-primary [&_a:hover]:!underline [&_a]:!text-blue-300 [&_a]:!no-underline">
          {children}
        </div>

        {(footerLink || dots) && (
          <div className="flex items-center justify-between gap-12 pr-4">
            {footerLink ? <FooterLink variant={variant} link={footerLink} /> : <span />}
            {dots && dots.count > 1 && (
              <Dots
                count={dots.count}
                activeIndex={dots.activeIndex}
                onDotClick={dots.onDotClick}
                activeClass={variantDotActiveClass[variant]}
                inactiveClass={variantDotInactiveClass[variant]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FooterLink({
  variant,
  link,
}: {
  variant: AnnouncementVariant;
  link: NonNullable<AnnouncementBannerProps["footerLink"]>;
}) {
  const className = cx(
    "group text-body-medium -my-4 inline-flex items-center gap-4 py-4 font-medium",
    variantAccentTextClass[variant]
  );
  const content = (
    <>
      <span className="group-hover:underline">{link.text}</span>
      <span aria-hidden className="transition-transform group-hover:translate-x-2">
        →
      </span>
    </>
  );

  if (link.to) {
    return (
      <Link to={link.to} className={className} onClick={link.onClick}>
        {content}
      </Link>
    );
  }
  if (link.href) {
    return (
      <a href={link.href} className={className} onClick={link.onClick} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={link.onClick}>
      {content}
    </button>
  );
}

function Dots({
  count,
  activeIndex,
  onDotClick,
  activeClass,
  inactiveClass,
}: {
  count: number;
  activeIndex: number;
  onDotClick?: (index: number) => void;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <div className="-mr-3 flex items-center">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        const dotClass = cx("block size-8 rounded-full transition-colors", isActive ? activeClass : inactiveClass);
        if (onDotClick) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDotClick(i)}
              className={cx("group flex p-3", isActive ? "cursor-default" : "cursor-pointer")}
              aria-label={t`Go to slide ${i + 1}`}
              aria-current={isActive}
            >
              <span className={dotClass} />
            </button>
          );
        }
        return <span key={i} className={cx(dotClass, "mx-3")} aria-hidden />;
      })}
    </div>
  );
}
