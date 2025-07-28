import { Trans } from "@lingui/macro";

import { Quareters } from "./Quareters";

export function RoadmapSection() {
  return (
    <section className="flex w-full bg-fiord-700 px-16 pb-[120px] text-white sm:px-80">
      <div className="mx-auto flex w-[1200px] flex-col gap-28 overflow-hidden sm:gap-44">
        <div className="flex w-full flex-row items-end justify-between gap-16">
          <h2 className="text-heading-2">Roadmap</h2>
          <a
            href="https://gmxio.substack.com/p/gmx-development-plan-for-2025"
            className="btn-landing-bg rounded-8 px-16 py-10 text-16"
          >
            <Trans>Read more</Trans>
          </a>
        </div>
        <Quareters />
      </div>
    </section>
  );
}
