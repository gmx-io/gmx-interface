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
};

// a network row carries every version of that network, so the tooltip never splits one chain across rows
export function sumNetworkParts(...parts: (bigint | number | undefined)[]): bigint | undefined {
  const known = parts.filter((part): part is bigint | number => part !== undefined);

  return known.length > 0 ? known.reduce<bigint>((acc, part) => acc + BigInt(part), 0n) : undefined;
}

export default function ChainsStatsTooltipRow({
  entries,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  symbol,
  subtotal,
}: Props) {
  const validEntries = Object.entries(entries)
    .filter(([, value]) => value)
    .sort(([, left], [, right]) => {
      const a = BigInt(left || 0);
      const b = BigInt(right || 0);

      return a === b ? 0 : a > b ? -1 : 1;
    });
  const total = validEntries.reduce((acc, [, value]) => acc + (BigInt(value || 0) ?? 0n), 0n);

  if (validEntries.length === 0) {
    return null;
  }

  return (
    <>
      {validEntries.map(([title, value]) => {
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
      {subtotal}
    </>
  );
}
