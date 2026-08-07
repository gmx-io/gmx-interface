import { t, Trans } from "@lingui/macro";

import { BuildersFaqItem } from "./BuildersFaqItem";

export function BuildersFaqSection() {
  return (
    <section className="flex w-full border-b-1/2 border-slate-600 bg-slate-900 px-16 py-60 text-white sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-36 lg:flex-row lg:gap-0">
        <div className="flex flex-col lg:w-[404px] lg:flex-shrink-0">
          <h2 className="text-heading-2">
            <Trans>FAQ</Trans>
          </h2>
        </div>
        <div className="flex w-full flex-col">
          <div className="flex flex-col gap-12">
            <BuildersFaqItem title={t`How do I actually make money?`} defaultOpen>
              <p>
                <Trans>
                  Two ways, and you can run both. Builder Code is your own fee: you set the rate (5 to 10 bps is
                  typical), it stacks on top of GMX's fees, and 100% comes to you. Referral Fees are a cut of GMX's own
                  fees: up to 25% of open/close fees, paid automatically.
                </Trans>
              </p>
            </BuildersFaqItem>
            <BuildersFaqItem title={t`How much could I earn?`}>
              <p>
                <Trans>
                  It depends on the volume you route and which revenue streams you turn on — use the calculator above
                  for a rough estimate, or apply to talk specifics with the team.
                </Trans>
              </p>
            </BuildersFaqItem>
            <BuildersFaqItem title={t`Is this a grants program? Do I get tokens?`}>
              <p>
                <Trans>Terms are still being finalized — apply or reach out to the team for the current details.</Trans>
              </p>
            </BuildersFaqItem>
            <BuildersFaqItem title={t`Do I need to join the program to integrate?`}>
              <p>
                <Trans>
                  No — the API, SDK, and docs are open to everyone. Joining the program adds direct support and
                  distribution on top.
                </Trans>
              </p>
            </BuildersFaqItem>
            <BuildersFaqItem title={t`What if I'm building a competing perp DEX?`}>
              <p>
                <Trans>Reach out and let's talk — apply below and the team will follow up.</Trans>
              </p>
            </BuildersFaqItem>
          </div>

          <div className="mt-14 flex flex-col rounded-20 border-1/2 border-slate-600/50 bg-[#171827]/30 px-25 py-24">
            <span className="text-12 font-medium uppercase tracking-[0.864px] text-blue-300">
              <Trans>Quick hits</Trans>
            </span>
            <h4 className="text-18 mt-20 -tracking-[0.576px] text-white">
              <Trans>Chains</Trans>
            </h4>
            <p className="mt-8 text-14 -tracking-[0.448px] text-slate-400">
              <Trans>
                Arbitrum, Avalanche, MegaETH. (GMX Account also accepts entry from Ethereum, Base, and BNB.)
              </Trans>
            </p>
            <div className="mt-16 border-t-1/2 border-slate-600/50" />
            <h4 className="text-18 mt-20 -tracking-[0.576px] text-white">
              <Trans>Timeline</Trans>
            </h4>
            <p className="mt-8 text-14 -tracking-[0.448px] text-slate-400">
              <Trans>A day for a lightweight integration, 1 to 3 weeks for something deeper.</Trans>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
