import { t, Trans } from "@lingui/macro";

import icBuilderCode from "img/builders_ic_builder_code.svg";
import icReferral from "img/builders_ic_referral.svg";
import revenueCardGlow from "img/builders_revenue_card_glow.svg";

import { Eyebrow } from "../Eyebrow";
import { RevenueCalculator } from "./RevenueCalculator";

function RevenueCard({
  icon,
  label,
  title,
  description,
}: {
  icon: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex min-h-[320px] flex-col overflow-hidden rounded-20 bg-slate-900 p-28 shadow-[0_6px_8px_-6px_#BEC0DA]">
      <img
        src={revenueCardGlow}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <img src={icon} alt="" className="relative size-60 select-none" />
      <div className="relative mt-auto flex flex-col">
        <span className="text-12 font-medium uppercase tracking-[0.864px] text-blue-300">{label}</span>
        <h3 className="mt-8 text-[40px] font-medium leading-base -tracking-[1.2px] text-white">{title}</h3>
        <p className="mt-8 text-16 -tracking-[0.512px] text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function RevenueSection() {
  return (
    <section className="w-full bg-white px-16 py-60 text-slate-900 sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <Eyebrow>
          <Trans>How you earn</Trans>
        </Eyebrow>
        <h2 className="text-heading-2 mt-20">
          <Trans>Two revenue streams.</Trans>
          <br />
          <span className="text-blue-400">
            <Trans>Stack them.</Trans>
          </span>
        </h2>
        <div className="mt-28 grid grid-cols-1 gap-20 sm:mt-[35px] md:grid-cols-2">
          <RevenueCard
            icon={icBuilderCode}
            label={t`Builder code`}
            title={t`Charge your own fee`}
            description={t`Add your own fee and keep 100% of it.`}
          />
          <RevenueCard
            icon={icReferral}
            label={t`Referral revenue, built in`}
            title={t`Earn from every referral.`}
            description={t`Up to 25% of GMX trading fees, paid directly to you.`}
          />
        </div>
        <RevenueCalculator />
      </div>
    </section>
  );
}
