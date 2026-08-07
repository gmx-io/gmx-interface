import { t } from "@lingui/macro";
import cx from "classnames";
import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from "react";

import CloseIcon from "img/ic_close.svg?react";

import { rewardsBannerStyles } from "./rewardsBannerStyles";

type RewardsPromoBannerCardProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "style"> & {
  children: ReactNode;
  coin: string;
  onClose: MouseEventHandler<HTMLButtonElement>;
};

export function RewardsPromoBannerCard({ children, className, coin, onClose, ...props }: RewardsPromoBannerCardProps) {
  return (
    <div
      {...props}
      className={cx(
        "relative grid min-h-[110px] w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-950 p-16",
        className
      )}
      style={rewardsBannerStyles}
    >
      {children}

      <img
        src={coin}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-30px] right-[-12px] size-[126px] select-none max-sm:bottom-[-22px] max-sm:right-[-36px] max-sm:size-[124px]"
      />

      <button
        type="button"
        aria-label={t`Close`}
        className="absolute right-8 top-8 z-20 flex size-24 items-center justify-center text-typography-secondary opacity-50 hover:opacity-80"
        onClick={onClose}
      >
        <CloseIcon className="size-16" />
      </button>
    </div>
  );
}
