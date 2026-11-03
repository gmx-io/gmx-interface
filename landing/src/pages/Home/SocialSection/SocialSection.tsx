import { Trans } from "@lingui/macro";
import { SOCIAL_MAP } from "landing/pages/Home/constants/SociaLinks";
import { shortFormat } from "landing/pages/Home/utils/formatters";
import { useMemo } from "react";

import TradingViewIcon from "img/ic_trading_view.svg?react";

import { SocialBackground } from "./SocialBackground";
import { SocialSlider } from "./SocialSlider";

export function SocialSection() {
  const links = useMemo(
    () => [
      {
        ...SOCIAL_MAP.Discord,
        value: shortFormat(6_100),
      },
      {
        ...SOCIAL_MAP.Twitter,
        value: shortFormat(230_000),
      },
      {
        ...SOCIAL_MAP.Telegram,
        value: shortFormat(10_000),
      },

      {
        ...SOCIAL_MAP.Substack,
        value: shortFormat(1_500),
      },
      {
        ...SOCIAL_MAP.Github,
        value: <Trans>Join</Trans>,
      },
    ],
    []
  );
  return (
    <section className="border-slate-600 bg-slate-900 text-white flex w-full flex-col border-t-0 pt-0 sm:border-t-1/2 sm:pt-120">
      <div className="mx-auto flex flex-col gap-24 overflow-x-clip sm:gap-40">
        <SocialSlider />
      </div>
      <div className="relative flex w-full overflow-clip px-16 pt-56 sm:px-40 sm:pt-120">
        <SocialBackground />
        <div className="relative mx-auto flex w-full flex-col gap-32 sm:w-[1200px]">
          <h2 className="text-heading-1">
            <Trans>
              Driven by <br /> our community
            </Trans>
          </h2>
          <div className="border-slate-600 flex w-full flex-col-reverse items-center justify-between gap-32 border-t-1/2 md:flex-row">
            <div className="flex flex-row flex-wrap gap-20 sm:gap-32">
              {links.map((link) => (
                <div
                  key={link.name}
                  onClick={link.onClick}
                  className="group flex cursor-pointer flex-col justify-center gap-4 py-0 sm:py-24"
                >
                  <div className="leading-body-sm duration-180 text-14 text-slate-500 group-hover:text-blue-300 flex w-full flex-row gap-4 -tracking-[0.448px] transition-colors">
                    <link.IconComponent className="size-20" />
                    <span className="duration-180 transition-transform group-hover:translate-x-4">{link.name}</span>
                  </div>
                  <div className="leading-heading-md text-[40px] font-medium -tracking-[1.2px]">{link.value}</div>
                </div>
              ))}
            </div>

            <form
              action="https://gmxio.substack.com/subscribe"
              className="flex w-full flex-row items-stretch gap-8 py-24 md:w-auto"
              method="GET"
            >
              <input
                type="email"
                name="email"
                id="email"
                required
                className="filled:border-slate-600 filled:bg-[#252635] border-slate-600/0 bg-slate-800 placeholder:text-slate-500 w-full min-w-0 rounded-8 border-1/2 px-16 py-8 text-16 font-medium -tracking-[0.512px] outline-none hover:bg-[#252635] focus:bg-[#252635] sm:min-w-[350px] lg:w-auto"
                placeholder="Your e-mail"
              />
              <button
                type="submit"
                className="btn-landing text-white rounded-8 px-16 py-8 text-16 font-medium -tracking-[0.512px]"
              >
                <Trans>Subscribe</Trans>
              </button>
            </form>
          </div>
          <div className="text-12 text-slate-500 flex w-full flex-row flex-wrap items-center gap-12 py-20 font-medium tracking-[0.024px]">
            <a
              href="/referral-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="duration-180 hover:text-white active:text-white/80 transition-colors"
            >
              <Trans>Referral terms</Trans>
            </a>
            <a
              href="https://docs.gmx.io/docs/community/#media-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="duration-180 hover:text-white active:text-white/80 transition-colors"
            >
              <Trans>Media kit</Trans>
            </a>
            <a className="inline sm:hidden" href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">
              <Trans>Terms and conditions</Trans>
            </a>
            <div className="text-white mx-0 flex flex-row items-center gap-8 sm:mx-auto">
              <TradingViewIcon className="size-20" />
              <span>
                <Trans>Charts by TradingView</Trans>
              </span>
            </div>
            <a
              className="duration-180 hover:text-white active:text-white/80 hidden transition-colors sm:inline"
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Trans>Terms and conditions</Trans>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
