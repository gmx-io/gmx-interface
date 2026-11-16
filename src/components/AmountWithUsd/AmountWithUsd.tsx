import cx from "classnames";
import { ReactNode } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatBalanceAmount } from "lib/numbers";

import { AmountHumanValue } from "components/NumericValue/AmountHumanValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import { TooltipUnderline } from "components/Tooltip/Tooltip";

export function AmountWithUsdHuman({
  amount,
  decimals,
  usd,
  symbol,
  multiline = false,
  usdOnTop = false,
  className,
}: {
  amount: bigint | undefined;
  decimals: number | undefined;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
  usdOnTop?: boolean;
  className?: string;
}) {
  if (amount === undefined || usd === undefined || decimals === undefined) {
    return "...";
  }

  const formattedAmount = (
    <>
      <AmountHumanValue amount={amount} decimals={decimals} displayDecimals={2} />
      {symbol ? ` ${symbol}` : ""}
    </>
  );

  const formattedUsd = <AmountHumanValue amount={usd} decimals={USD_DECIMALS} showDollar displayDecimals={2} />;

  const topValue = usdOnTop ? formattedUsd : formattedAmount;
  const bottomValue = usdOnTop ? formattedAmount : formattedUsd;

  return (
    <span>
      <span className={cx("numbers", className)}>{topValue} </span>
      {multiline && <br />}
      <span
        className={cx("text-12 text-typography-secondary numbers group-hover/hoverable:text-[inherit]", {
          "ml-2": multiline,
        })}
      >
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
  usdAsPrimary = false,
  isStable = false,
  signed = false,
  allowWrap = false,
  underline = false,
  suffix,
  secondaryValueClassName,
}: {
  className?: string;
  amount: bigint | undefined;
  decimals: number;
  usd: bigint | undefined;
  symbol?: string;
  multiline?: boolean;
  usdAsPrimary?: boolean;
  isStable?: boolean;
  signed?: boolean;
  allowWrap?: boolean;
  underline?: boolean;
  suffix?: ReactNode;
  secondaryValueClassName?: string;
}) {
  if (amount === undefined || usd === undefined) {
    return suffix ? (
      <span className="inline-flex items-center gap-6">
        ...
        {suffix}
      </span>
    ) : (
      "..."
    );
  }

  const formattedAmount = formatBalanceAmount(amount, decimals, symbol, { showZero: true, isStable, signed });

  const formattedUsd = <UsdValue usd={usd} displayPlus={signed && usd !== 0n} />;

  const { primaryValue, secondaryValue } = usdAsPrimary
    ? { primaryValue: formattedUsd, secondaryValue: formattedAmount }
    : { primaryValue: formattedAmount, secondaryValue: formattedUsd };

  const secondaryPart = (
    <span
      className={cx(
        "text-12 text-typography-secondary numbers group-hover/hoverable:text-[inherit]",
        secondaryValueClassName,
        {
          "ml-2": multiline,
          "pl-4": allowWrap,
          relative: underline,
        }
      )}
    >
      ({secondaryValue}){underline && <TooltipUnderline />}
    </span>
  );

  return (
    <span className={cx({ "inline-flex flex-wrap items-baseline justify-end": allowWrap }, className)}>
      <span className={cx("numbers", { relative: underline })}>
        {primaryValue} {underline && <TooltipUnderline />}
      </span>
      {multiline && <br />}
      {suffix ? (
        <span className="inline-flex items-center gap-6">
          {secondaryPart}
          {suffix}
        </span>
      ) : (
        secondaryPart
      )}
    </span>
  );
}
