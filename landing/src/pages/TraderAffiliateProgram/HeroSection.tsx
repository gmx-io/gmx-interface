import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ArrowButton } from "landing/components/TraderAffiliateWidget/ArrowButton";
import { GRADIENT_TEXT_CLASS } from "landing/components/TraderAffiliateWidget/constants";
import { useTotalVolume } from "landing/pages/Home/hooks/useTotalVolume";
import { shortFormatUsd } from "landing/pages/Home/utils/formatters";
import { scrollToLandingSection } from "landing/utils/scrollToLandingSection";

import heroBg from "img/trader_affiliate_hero_bg.svg";
import heroScreens from "img/trader_affiliate_hero_screens.png";

function HeroStat({
  label,
  value,
  gradient,
  className,
}: {
  label: React.ReactNode;
  value: string;
  gradient?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <span className="text-14 -tracking-[0.448px] text-slate-500">{label}</span>
      <span
        className={cx("text-[40px] font-medium leading-[1] -tracking-[1.2px]", gradient ? GRADIENT_TEXT_CLASS : "")}
      >
        {value}
      </span>
    </div>
  );
}

export function HeroSection() {
  const { data: totalVolume } = useTotalVolume();
  const totalVolumeText = totalVolume ? shortFormatUsd(totalVolume) : "-";

  return (
    <section className="relative w-full overflow-hidden bg-slate-900 px-16 text-white sm:px-40">
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[860px] w-full min-w-[1728px] max-w-none -translate-x-1/2 select-none"
      />
      <img
        src={heroScreens}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-[calc(50%+51px)] top-0 hidden h-[688px] w-[813px] max-w-none select-none sm:block"
      />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col pt-[140px] sm:pt-[200px] lg:pt-[362px]">
        <span className="inline-flex h-24 w-fit items-center rounded-full bg-blue-300/20 px-6 backdrop-blur-[10px]">
          <span className={cx("text-16 -tracking-[0.512px]", GRADIENT_TEXT_CLASS)}>
            <Trans>Trader & Affiliate Program</Trans>
          </span>
        </span>
        <h1 className="text-50 leading-heading-lg lg:text-100 mt-24 font-medium -tracking-[2.6px] lg:-tracking-[5.2px]">
          <Trans>
            Trade more, pay less.
            <br />
            Refer, and earn.
          </Trans>
        </h1>
        <p className="leading-body-sm mt-12 text-14 -tracking-[0.448px] text-slate-400">
          <Trans>
            Up to 25% off fees for high-volume traders. Up to 25% earnings
            <br className="hidden sm:block" />
            for affiliates. Personal support for both.
          </Trans>
        </p>
        <div className="mt-32 flex flex-col justify-between gap-32 border-t-1/2 border-slate-600 pb-[77px] pt-32 lg:flex-row">
          <div className="flex flex-col gap-20 sm:flex-row">
            <ArrowButton
              label={<Trans>Contact us</Trans>}
              onClick={() => scrollToLandingSection("contact", 24)}
              variant="primary"
              className="w-full sm:w-[200px]"
            />
            <ArrowButton
              label={<Trans>See the perks</Trans>}
              onClick={() => scrollToLandingSection("program", 60)}
              variant="secondary"
              className="w-full sm:w-[200px]"
            />
          </div>
          <div className="flex flex-col gap-24 sm:flex-row sm:gap-0">
            <HeroStat label={<Trans>GMX cumulative volume</Trans>} value={totalVolumeText} className="sm:w-[207px]" />
            <HeroStat
              label={<Trans>Paid to traders & affiliates</Trans>}
              value="$9M+"
              gradient
              className="sm:w-[210px]"
            />
            <HeroStat label={<Trans>Active affiliates</Trans>} value="400+" />
          </div>
        </div>
      </div>
    </section>
  );
}
