import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmount, formatAmountHuman } from "lib/numbers";

import "./StatsTooltip.css";

type Props = {
  entries: { [key: string]: bigint | string | undefined };
  showDollar?: boolean;
  decimalsForConversion?: number;
  symbol?: string;
  shouldFormat?: boolean;
  subtotal?: ReactNode;
};

export default function ChainsStatsTooltipRow({
  entries,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  symbol,
  subtotal,
  shouldFormat = true,
}: Props) {
  const validEntries = Object.entries(entries).filter(([, value]) => value);
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
              {!shouldFormat
                ? formatAmount(value, 0, 0, true)
                : formatAmountHuman(value, decimalsForConversion, showDollar, 2)}
              {!showDollar && symbol && " " + symbol}
            </span>
          </p>
        );
      })}
      <div className="my-5 h-1 bg-gray-800" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total:</Trans>
        </span>
        <span className="amount">
          {!shouldFormat
            ? formatAmount(total, 0, 0, true)
            : formatAmountHuman(total, decimalsForConversion, showDollar, 2)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
      {subtotal}
    </>
  );
}
