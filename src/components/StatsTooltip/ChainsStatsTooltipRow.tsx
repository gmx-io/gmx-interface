import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";

import "./StatsTooltip.css";

type EntryValue = bigint | number | string | undefined;

type Props = {
  entries: { [key: string]: EntryValue };
  showDollar?: boolean;
  decimalsForConversion?: number;
  symbol?: string;
  subtotal?: ReactNode;
  staleTitles?: string[];
};

export default function ChainsStatsTooltipRow({
  entries,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  symbol,
  subtotal,
  staleTitles,
}: Props) {
  // an entry that has not answered yet is named instead of being summed as zero, so the total stays honest
  const knownEntries = Object.entries(entries)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([, left], [, right]) => {
      const a = BigInt(left || 0);
      const b = BigInt(right || 0);

      return a === b ? 0 : a > b ? -1 : 1;
    });
  const missingTitles = Object.entries(entries)
    .filter(([, value]) => value === undefined || value === null)
    .map(([title]) => title);
  const total = knownEntries.reduce((acc, [, value]) => acc + BigInt(value || 0), 0n);

  if (knownEntries.length === 0) {
    return null;
  }

  return (
    <>
      {knownEntries.map(([title, value]) => {
        return (
          <p key={title} className="Tooltip-row">
            <span className="label">
              <Trans>{title}</Trans>:{" "}
            </span>
            <span className="amount">
              {formatAmountHuman(value, decimalsForConversion, showDollar, 2)}
              {!showDollar && symbol && " " + symbol}
            </span>
          </p>
        );
      })}
      <div className="my-5 h-1 bg-gray-800" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total</Trans>:{" "}
        </span>
        <span className="amount">
          {formatAmountHuman(total, decimalsForConversion, showDollar, 2)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
      {missingTitles.length > 0 && (
        <p className="Tooltip-row !mt-8 max-w-[260px] whitespace-normal text-yellow-300">
          <Trans>Partial total: no data yet from {missingTitles.join(", ")}.</Trans>
        </p>
      )}
      {staleTitles !== undefined && staleTitles.length > 0 && (
        <p className="Tooltip-row !mt-8 max-w-[260px] whitespace-normal text-yellow-300">
          <Trans>Included but not up to date: {staleTitles.join(", ")}.</Trans>
        </p>
      )}
      {subtotal}
    </>
  );
}
