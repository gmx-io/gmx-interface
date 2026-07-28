import { Trans } from "@lingui/macro";

import heroGlow from "img/builders_hero_glow.svg";

import { ArrowButton } from "../ArrowButton";
import { BUILDER_PROGRAM_APPLY_URL, SDK_QUICKSTART_URL } from "../constants";
import { Eyebrow } from "../Eyebrow";
import { CodeSnippet } from "./CodeSnippet";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-slate-900 px-16 pb-60 pt-80 text-white sm:px-40 sm:pb-80 sm:pt-[304px]">
      <img
        src={heroGlow}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-40 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col items-start">
          <Eyebrow gradient>
            <Trans>Builder Program</Trans>
          </Eyebrow>
          <h1 className="leading-heading-lg sm:text-80 xl:text-80 2xl:text-100 mt-20 text-[min(50px,14vw)] font-medium -tracking-[0.052em] sm:-tracking-[4.16px] lg:max-w-[425px] lg:text-[72px] lg:-tracking-[3.744px] xl:max-w-[590px] xl:-tracking-[4.16px] 2xl:max-w-[730px] 2xl:-tracking-[5.2px]">
            <Trans>
              Build on GMX.
              <br />
              Get paid on every trade.
            </Trans>
          </h1>
          <p className="mt-8 max-w-[340px] text-14 -tracking-[0.448px] text-slate-400">
            <Trans>Real onchain revenue, paid in stablecoins, every time someone trades through you.</Trans>
          </p>
          <div className="mt-[34px] flex w-full flex-col gap-12 sm:flex-row sm:gap-20">
            <ArrowButton href={SDK_QUICKSTART_URL} variant="primary" className="sm:w-[200px]">
              <Trans>Start building</Trans>
            </ArrowButton>
            <ArrowButton href={BUILDER_PROGRAM_APPLY_URL} variant="secondary" className="sm:w-[200px]">
              <Trans>Apply to program</Trans>
            </ArrowButton>
          </div>
        </div>
        <CodeSnippet className="relative lg:w-[500px] lg:flex-shrink-0 2xl:-mr-[99px]" />
      </div>
    </section>
  );
}
