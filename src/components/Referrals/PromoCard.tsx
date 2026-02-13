import { ReactNode } from "react";

import affiliateCodePromoBg from "img/affiliate_code_promo_bg.png";

type PromoCardProps = {
  title: ReactNode;
  subtitle: ReactNode;
  children?: ReactNode;
};

export function PromoCard({ title, subtitle, children }: PromoCardProps) {
  return (
    <div className="relative overflow-hidden rounded-8 border-1/2 border-blue-300/20 border-stroke-primary bg-slate-950/50 p-12">
      <div className="relative z-10">
        <div className="text-body-medium mb-2 font-medium text-typography-primary">{title}</div>
        <div className="text-body-small text-typography-secondary">{subtitle}</div>
      </div>
      <img
        src={affiliateCodePromoBg}
        className="user-select-none absolute -right-8 -top-8 z-0 h-[calc(100%+16px)] blur-[8px]"
      />
      {children}
    </div>
  );
}
