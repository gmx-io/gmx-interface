import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";

import calcGlow from "img/builders_calc_glow.svg";

const BUILDER_CODE_BPS = 7.5;
const REFERRAL_FEE_BPS = 1.25;
const TOTAL_RATE = (BUILDER_CODE_BPS + REFERRAL_FEE_BPS) / 10000;

const VOLUME_TIERS = [
  { value: 50_000_000, label: "$50m" },
  { value: 100_000_000, label: "$100m" },
  { value: 250_000_000, label: "$250m" },
  { value: 500_000_000, label: "$500m" },
  { value: 1_000_000_000, label: "$1b" },
];

const monthlyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const yearlyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function RevenueCalculator() {
  const [selectedVolume, setSelectedVolume] = useState(250_000_000);
  const monthlyRevenue = selectedVolume * TOTAL_RATE;
  const yearlyRevenue = monthlyRevenue * 12;

  return (
    <div className="relative mt-20 grid grid-cols-1 overflow-hidden rounded-20 border-1/2 border-slate-600/50 bg-slate-900 shadow-[0_6px_8px_-6px_#BEC0DA] lg:grid-cols-[612fr_588fr]">
      <img
        src={calcGlow}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <div className="relative flex flex-col px-28 pb-28 pt-[35px]">
        <span className="text-12 font-medium uppercase tracking-[0.864px] text-blue-300">
          <Trans>Revenue calculator</Trans>
        </span>
        <h3 className="mt-28 text-[40px] font-medium leading-base -tracking-[1.2px] text-white">
          <Trans>Monthly volume routed</Trans>
        </h3>
        <div className="mt-16 flex flex-wrap gap-12">
          {VOLUME_TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              onClick={() => setSelectedVolume(tier.value)}
              className={cx(
                "duration-180 h-36 rounded-8 px-16 text-16 -tracking-[0.512px] text-white transition-colors",
                selectedVolume === tier.value
                  ? "bg-blue-400 shadow-[0_0_12px_rgba(45,66,252,0.55)]"
                  : "bg-slate-600/50 hover:bg-slate-600/70"
              )}
            >
              {tier.label}
            </button>
          ))}
        </div>
        <p className="mt-20 text-12 tracking-normal text-slate-500">
          <Trans>
            Assumes Builder Code at 7.5 bps plus Referral Fee at 1.25 bps.
            <br />
            You set your own Builder Code rate (5 to 10 bps is typical).
          </Trans>
        </p>
      </div>
      <div className="relative flex flex-col border-t-1/2 border-slate-600 px-28 pb-28 pt-[35px] lg:border-l-1/2 lg:border-t-0">
        <span className="text-12 font-medium uppercase tracking-[0.864px] text-blue-300">
          <Trans>Combined monthly revenue</Trans>
        </span>
        <div className="mt-auto flex flex-col">
          <div className="flex flex-wrap items-baseline gap-8">
            <span className="leading-heading-lg text-transparent sm:text-80 bg-gradient-to-b from-[#98B6F9] to-[#7F9BFA] bg-clip-text text-[min(64px,16vw)] font-medium -tracking-[0.05em] sm:-tracking-[4px]">
              ≈ {monthlyFormatter.format(monthlyRevenue)}
            </span>
            <span className="text-18 -tracking-[0.576px] text-slate-500">
              <Trans>/ month</Trans>
            </span>
          </div>
          <span className="text-18 mt-4 -tracking-[0.576px] text-slate-500">
            {yearlyFormatter.format(yearlyRevenue)} <Trans>/ year</Trans>
          </span>
        </div>
      </div>
    </div>
  );
}
