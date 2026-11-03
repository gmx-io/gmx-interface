import cx from "classnames";
import { ReactNode, useCallback } from "react";

import affiliateCodePromoBg from "img/affiliate_code_promo_bg.png";
import CloseIcon from "img/ic_close.svg?react";

type PromoCardProps = {
  title: ReactNode;
  subtitle: ReactNode;
  imgSrc: string;
  imgClassName: string;
  onClose?: () => void;
};

export function PromoCard({ title, subtitle, imgSrc, imgClassName, onClose }: PromoCardProps) {
  const handleClose = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClose?.();
    },
    [onClose]
  );

  return (
    <div className="relative overflow-hidden rounded-8 border-1/2 border-blue-strong/20 border-stroke-primary bg-fill-background/50 p-12">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <div className="text-body-medium mb-4 font-medium text-textIcon-primary">{title}</div>
            <div className="text-body-small text-textIcon-secondary">{subtitle}</div>
          </div>
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          className="absolute right-8 top-8 z-10 text-blue-strong transition-colors hover:text-textIcon-onButton"
          onClick={handleClose}
        >
          <CloseIcon className="size-16" />
        </button>
      )}
      <img
        src={affiliateCodePromoBg}
        className="user-select-none absolute -right-8 -top-8 z-0 h-[calc(100%+16px)] blur-[8px] hue-rotate-180 invert dark:hue-rotate-0 dark:invert-0"
      />
      <img src={imgSrc} className={cx("user-select-none absolute z-10 w-[104px]", imgClassName)} />
    </div>
  );
}
