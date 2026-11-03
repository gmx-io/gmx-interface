import { Trans } from "@lingui/macro";

import { ArrowButton } from "../ArrowButton";
import { BUILDER_PROGRAM_APPLY_URL, GMX_DOCS_URL } from "../constants";

export function CtaSection() {
  return (
    <section className="text-white relative w-full px-16 pb-56 pt-56 text-center sm:px-40 sm:pb-48 sm:pt-120">
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center">
        <h2 className="leading-heading-lg sm:text-100 text-[min(50px,14vw)] font-medium -tracking-[0.052em] sm:-tracking-[5.2px]">
          <span className="text-transparent from-blue-100 bg-gradient-to-b to-[#809CFA] bg-clip-text">
            <Trans>Start earning</Trans>
          </span>
          <br />
          <Trans>on GMX.</Trans>
        </h2>
        <p className="mt-16 text-16 -tracking-[0.512px] text-slate-400">
          <Trans>
            The API's open and the economics are real.
            <br />
            Ship an integration, or apply to get support and distribution behind it.
          </Trans>
        </p>
        <div className="mt-56 flex w-full flex-col justify-center gap-12 sm:flex-row sm:gap-20">
          <ArrowButton href={BUILDER_PROGRAM_APPLY_URL} variant="primary" className="sm:w-[240px]">
            <Trans>Apply to Builder Program</Trans>
          </ArrowButton>
          <ArrowButton href={GMX_DOCS_URL} variant="secondary" className="sm:w-[240px]">
            <Trans>Read the docs</Trans>
          </ArrowButton>
        </div>
      </div>
    </section>
  );
}
