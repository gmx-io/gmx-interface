import cx from "classnames";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman, formatBalanceAmount, formatUsd } from "lib/numbers";

export function AmountWithUsdHuman({
  amount,
  decimals,
  usd,
  symbol,
  multiline = false,
  usdOnTop = false,
}: {
  amount: bigint | undefined;
  decimals: number | undefined;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
  usdOnTop?: boolean;
}) {
  if (amount === undefined || usd === undefined || decimals === undefined) {
    return "...";
  }

  let formattedAmount = formatAmountHuman(amount, decimals, false, 2);
  if (symbol) {
    formattedAmount = `${formattedAmount} ${symbol}`;
  }

  const formattedUsd = formatAmountHuman(usd, USD_DECIMALS, true, 2);

  const topValue = usdOnTop ? formattedUsd : formattedAmount;
  const bottomValue = usdOnTop ? formattedAmount : formattedUsd;

  return (
    <span>
      <span>{topValue}</span>
      {multiline && <br />}
      <span className={cx("text-12 text-slate-100 group-hover/hoverable:text-[inherit]", { "ml-2": multiline })}>
        ({bottomValue})
      </span>
    </span>
  );
}

export function AmountWithUsdBalance({
  className,
  amount,
  decimals,
  usd,
  symbol,
  multiline = false,
}: {
  className?: string;
  amount: bigint | undefined;
  decimals: number;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
}) {
  if (amount === undefined || usd === undefined) {
    return "...";
  }

  const formattedAmount = formatBalanceAmount(amount, decimals, symbol, true);

  const formattedUsd = formatUsd(usd);

  return (
    <span className={className}>
      {formattedAmount}
      {multiline ? <br /> : " "}
      <span className="text-12 text-slate-100 group-hover/hoverable:text-[inherit]">({formattedUsd})</span>
    </span>
  );
}
