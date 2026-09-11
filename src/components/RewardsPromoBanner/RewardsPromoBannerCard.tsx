import { t } from "@lingui/macro";
import cx from "classnames";
import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from "react";

import CloseIcon from "img/ic_close.svg?react";

import { type RewardsBannerArtKey, rewardsBannerArt } from "./rewardsBannerArt";
import { type RewardsBannerAccent, rewardsBannerAccentStyles } from "./rewardsBannerStyles";

type RewardsPromoBannerCardProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "style"> & {
  accent: RewardsBannerAccent;
  art: RewardsBannerArtKey;
  children: ReactNode;
  onClose: MouseEventHandler<HTMLButtonElement>;
};

export function RewardsPromoBannerCard({
  accent,
  art,
  children,
  className,
  onClose,
  ...props
}: RewardsPromoBannerCardProps) {
  return (
    <div
      {...props}
      className={cx(
        "relative grid min-h-[110px] w-full grid-cols-[minmax(0,1fr)_80px] overflow-hidden rounded-8 border-1/2 border-stroke-primary bg-slate-950 p-16",
        className
      )}
      style={rewardsBannerAccentStyles[accent]}
    >
      {children}

      <img
        src={rewardsBannerArt[art].src}
        alt=""
        aria-hidden="true"
        className={cx("pointer-events-none absolute select-none", rewardsBannerArt[art].className)}
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
