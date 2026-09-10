import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";

import "./StatsTooltip.css";

type EntryValue = bigint | number | string | undefined;

function isKnown(value: EntryValue) {
  return value !== undefined && value !== null;
}

function amountOf(value: EntryValue): bigint {
  return BigInt(value || 0);
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="Tooltip-row !mt-8 max-w-[260px] whitespace-normal text-yellow-300">{children}</p>;
}

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
  staleTitles = [],
}: Props) {
  const allEntries = Object.entries(entries);

  // an entry that has not answered yet is named below the total rather than summed as zero
  const knownEntries = allEntries
    .filter(([, value]) => isKnown(value))
    .sort(([, left], [, right]) => {
      const a = amountOf(left);
      const b = amountOf(right);

      return a === b ? 0 : a > b ? -1 : 1;
    });
  const missingTitles = allEntries.filter(([, value]) => !isKnown(value)).map(([title]) => title);
  const total = knownEntries.reduce((acc, [, value]) => acc + amountOf(value), 0n);

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
