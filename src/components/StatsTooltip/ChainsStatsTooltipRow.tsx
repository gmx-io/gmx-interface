import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";

import type { ChainsStatsSummary } from "./summarizeChainsStats";

import "./StatsTooltip.css";

function Notice({ children }: { children: ReactNode }) {
  return <p className="Tooltip-row !mt-8 max-w-[260px] whitespace-normal text-yellow-300">{children}</p>;
}

type Props = {
  summary: ChainsStatsSummary;
  showDollar?: boolean;
  decimalsForConversion?: number;
  subtotal?: ReactNode;
  staleTitles?: string[];
};

export default function ChainsStatsTooltipRow({
  summary: { knownEntries, missingTitles, total },
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  subtotal,
  staleTitles = [],
}: Props) {
  if (knownEntries.length === 0) {
    return null;
  }

  return (
    <>
      {knownEntries.map(([title, value]) => (
        <p key={title} className="Tooltip-row">
          <span className="label">
            <Trans>{title}</Trans>:{" "}
          </span>
          <span className="amount">{formatAmountHuman(value, decimalsForConversion, showDollar, 2)}</span>
        </p>
      ))}
      <div className="my-5 h-1 bg-gray-800" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total</Trans>:{" "}
        </span>
        <span className="amount">{formatAmountHuman(total, decimalsForConversion, showDollar, 2)}</span>
      </p>
      {missingTitles.length > 0 && (
        <Notice>
          <Trans>Partial total: no data yet from {missingTitles.join(", ")}.</Trans>
        </Notice>
      )}
      {staleTitles.length > 0 && (
        <Notice>
          <Trans>Included but not up to date: {staleTitles.join(", ")}.</Trans>
        </Notice>
      )}
      {subtotal}
    </>
  );
}
