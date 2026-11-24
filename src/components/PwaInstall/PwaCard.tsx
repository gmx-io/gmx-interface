import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useBreakpoints } from "lib/useBreakpoints";

import CloseIcon from "img/ic_close.svg?react";

/**
 * A floating card at the bottom of the screen for the install, notifications and welcome nudges. It never blocks the
 * page: no backdrop. Where the trade page shows its bottom curtain (up to 1024px), it sits 8px above the 48px
 * Long / Short / Swap bar. GMX's transaction toasts also use the bottom of the screen, so nudges wait while one is open.
 */
export function PwaFloatingCard({ children, qa, isSlim }: { children: ReactNode; qa?: string; isSlim?: boolean }) {
  const { pathname } = useLocation();
  const { isTablet } = useBreakpoints();
  const isAboveTradeCurtain = pathname.startsWith("/trade") && isTablet;

  return (
    <div
      data-qa={qa}
      className={cx(
        "pointer-events-none fixed inset-x-0 z-[800] flex justify-center px-16 md:inset-x-auto md:right-16 md:px-0",
        isAboveTradeCurtain
          ? "bottom-[calc(var(--safe-area-inset-bottom)+56px)]"
          : "bottom-[calc(var(--safe-area-inset-bottom)+16px)]"
      )}
    >
      <div
        className={cx(
          "pointer-events-auto flex w-full max-w-[400px] rounded-12 border-1/2 border-slate-600 bg-slate-800 md:w-[400px]",
          isSlim ? "items-center gap-12 py-10 pl-12 pr-8" : "flex-col gap-12 p-16"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PwaCardHeader({
  icon,
  title,
  description,
  onClose,
  iconClassName,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-start gap-12">
      <div
        className={cx(
          "flex size-40 shrink-0 items-center justify-center rounded-8 bg-slate-700 text-blue-300",
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="flex min-w-0 grow flex-col gap-4">
        <div className="text-body-large font-medium text-typography-primary">{title}</div>
        {description ? <div className="text-body-small text-typography-secondary">{description}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label={t`Close`}
          className="-mr-4 -mt-4 shrink-0 p-4 text-typography-secondary hover:text-typography-primary"
          onClick={onClose}
        >
          <CloseIcon className="size-20" />
        </button>
      ) : null}
    </div>
  );
}
