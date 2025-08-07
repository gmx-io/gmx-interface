import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { SOCIAL_MAP } from "landing/constants/SociaLinks";
import { shortFormat } from "landing/utils/shortFormat";

import { SocialSlider } from "./SocialSlider";

export function SocialSection() {
  const links = useMemo(
    () => [
      {
        ...SOCIAL_MAP.Discord,
        value: shortFormat(777_122_122),
      },
      {
        ...SOCIAL_MAP.Twitter,
        value: shortFormat(777_00),
      },
      {
        ...SOCIAL_MAP.Telegram,
        value: shortFormat(100_000_000),
      },

      {
        ...SOCIAL_MAP.Substack,
        value: shortFormat(60_000),
      },
      {
        ...SOCIAL_MAP.Github,
        value: (
          <a href={SOCIAL_MAP.Github.link}>
            <Trans>Join</Trans>
          </a>
        ),
      },
    ],
    []
  );
  return (
    <section className="bg-fiord-700 border-fiord-500 flex w-full flex-col gap-[120px] border-t-0 pt-0 text-white sm:border-t-[0.5px] sm:pt-[120px]">
      <div className="mx-auto flex flex-col gap-28 overflow-x-clip sm:gap-44">
        <SocialSlider />
      </div>
      <div className="flex w-full">
        <div className="mx-auto flex w-full flex-col gap-36 px-16 sm:w-[1200px] sm:px-80">
          <h2 className="text-heading-1">
            <Trans>
              Driven by <br /> our community
            </Trans>
          </h2>
          <div className="border-fiord-500 flex w-full flex-col-reverse items-center justify-between gap-36 border-t-[0.5px] sm:flex-row">
            <div className="flex flex-row flex-wrap gap-20 sm:gap-36">
              {links.map((link) => (
                <div
                  key={link.name}
                  onClick={link.onClick}
                  className="group flex cursor-pointer flex-col justify-center gap-4 py-0 sm:py-28"
                >
                  <div className="leading-body-sm duration-180 flex w-full flex-row gap-4 text-14 -tracking-[0.448px] text-slate-100 transition-colors group-hover:text-blue-300">
                    <link.IconComponent className="size-20" />
                    <span className="duration-180 transition-transform group-hover:translate-x-4">{link.name}</span>
                  </div>
                  <div className="leading-heading-md text-[40px] font-medium -tracking-[1.2px]">{link.value}</div>
                </div>
              ))}
            </div>

            <form
              action="https://gmxio.substack.com/subscribe"
              className="flex w-full flex-row items-stretch gap-8 py-28 sm:w-auto"
              method="GET"
            >
              <input
                type="email"
                name="email"
                id="email"
                required
                className="bg-fiord-600 filled:border-fiord-500 filled:bg-[#252635] border-fiord-500/0 min-w-0 rounded-8 border-[0.5px] px-16 py-10 text-16 font-medium -tracking-[0.512px] outline-none placeholder:text-slate-100 focus:bg-[#252635]"
                placeholder="Your e-mail"
              />
              <button
                type="submit"
                className="btn-landing rounded-8 px-16 py-10 text-16 font-medium -tracking-[0.512px] text-white"
              >
                <Trans>Subscribe</Trans>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
