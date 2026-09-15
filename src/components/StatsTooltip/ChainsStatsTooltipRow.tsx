import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";

import { AmountHumanValue } from "components/NumericValue/AmountHumanValue";

import { ChainsStatsNotices } from "./ChainsStatsNotices";
import type { ChainsStatsStaleEntry, ChainsStatsSummary } from "./summarizeChainsStats";

import "./StatsTooltip.css";

type Props = {
  summary: ChainsStatsSummary;
  showDollar?: boolean;
  decimalsForConversion?: number;
  subtotal?: ReactNode;
  staleEntries: ChainsStatsStaleEntry[];
};

export default function ChainsStatsTooltipRow({
  summary: { knownEntries, missingTitles, total },
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  subtotal,
  staleEntries,
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
          <AmountHumanValue
            amount={value}
            decimals={decimalsForConversion}
            showDollar={showDollar}
            displayDecimals={2}
            className="amount"
          />
        </p>
      ))}
      <div className="my-5 h-1 bg-gray-800" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total</Trans>:{" "}
        </span>
        <AmountHumanValue
          amount={total}
          decimals={decimalsForConversion}
          showDollar={showDollar}
          displayDecimals={2}
          className="amount"
        />
      </p>
      <ChainsStatsNotices
        missingTitles={missingTitles}
        staleEntries={staleEntries}
        className="Tooltip-row !mt-8 max-w-[260px] whitespace-normal text-yellow-300"
      />
      {subtotal}
    </>
  );
}
