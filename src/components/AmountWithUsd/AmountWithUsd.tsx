import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman, formatBalanceAmount, formatUsd } from "lib/numbers";

export function AmountWithUsdHuman({
  amount,
  decimals,
  usd,
  symbol,
  multiline = false,
}: {
  amount: bigint | undefined;
  decimals: number | undefined;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
}) {
  if (amount === undefined || usd === undefined || decimals === undefined) {
    return "...";
  }

  let formattedAmount = formatAmountHuman(amount, decimals, false, 2);
  if (symbol) {
    formattedAmount = `${formattedAmount} ${symbol}`;
  }

  const formattedUsd = formatAmountHuman(usd, USD_DECIMALS, true, 2);

  return (
    <span>
      {formattedAmount}
      {multiline ? <br /> : " "}
      <span className="text-12 text-slate-100">({formattedUsd})</span>
    </span>
  );
}

export function AmountWithUsdBalance({
  amount,
  decimals,
  usd,
  symbol,
  multiline = false,
}: {
  amount: bigint | undefined;
  decimals: number;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
}) {
  if (amount === undefined || usd === undefined) {
    return "...";
  }

  let formattedAmount = formatBalanceAmount(amount, decimals, symbol, true);
  if (symbol) {
    formattedAmount = `${formattedAmount} ${symbol}`;
  }

  const formattedUsd = formatUsd(usd);

  return (
    <span>
      {formattedAmount}
      {multiline ? <br /> : " "}
      <span className="text-12 text-slate-100">({formattedUsd})</span>
    </span>
  );
}
