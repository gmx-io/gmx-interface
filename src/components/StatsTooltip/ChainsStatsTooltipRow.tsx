import { Trans } from "@lingui/macro";
import { BigNumber } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import "./StatsTooltip.css";
import { formatAmount } from "lib/numbers";

type Props = {
  entries: { [key: string]: BigNumber };
  showDollar?: boolean;
  decimalsForConversion?: number;
  symbol?: string;
  shouldFormat?: boolean;
};

export default function ChainsStatsTooltipRow({
  entries,
  showDollar = true,
  decimalsForConversion = USD_DECIMALS,
  symbol,
  shouldFormat = true,
}: Props) {
  const total = entries
    ? Object.values(entries).reduce((acc, curr) => acc.add(curr), BigNumber.from(0))
    : BigNumber.from(0);
  return (
    <>
      {Object.entries(entries).map(([title, value]) => {
        if (!value) return null;
        return (
          <p key={title} className="Tooltip-row">
            <span className="label">
              <Trans>{title}</Trans>:{" "}
            </span>
            <span className="amount">
              {showDollar && "$"}
              {formatAmount(value, shouldFormat ? decimalsForConversion : 0, 0, true)}
              {!showDollar && symbol && " " + symbol}
            </span>
          </p>
        );
      })}
      <div className="Tooltip-divider" />
      <p className="Tooltip-row">
        <span className="label">
          <Trans>Total:</Trans>
        </span>
        <span className="amount">
          {showDollar && "$"}
          {formatAmount(total, shouldFormat ? decimalsForConversion : 0, 0, true)}
          {!showDollar && symbol && " " + symbol}
        </span>
      </p>
    </>
  );
}
