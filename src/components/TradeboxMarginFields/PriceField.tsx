import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, parseValue, USD_DECIMALS } from "lib/numbers";

import { TradeInputField } from "./TradeInputField";

const ZERO_ALTERNATE_VALUE = "0";
const DEFAULT_TOKEN_DISPLAY_DECIMALS = 4;
const DEFAULT_TOKEN_DECIMALS = 18;

type Props = {
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  qa?: string;
};

export function PriceField({ indexToken, markPrice, inputValue, onInputValueChange, onFocus, qa }: Props) {
  const alternateValue = useMemo(
    () =>
      getAlternatePriceDisplay({
        indexToken,
        inputValue,
        markPrice,
      }),
    [indexToken, inputValue, markPrice]
  );

  return (
    <TradeInputField
      label={<Trans>Price</Trans>}
      alternateValue={alternateValue}
      displayMode="usd"
      showDisplayModeToggle={false}
      unitLabel="USD"
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      onFocus={onFocus}
      qa={qa}
    />
  );
}

function getAlternatePriceDisplay({
  indexToken,
  inputValue,
  markPrice,
}: {
  indexToken: TokenData | undefined;
  inputValue: string;
  markPrice: bigint | undefined;
}) {
  if (!inputValue) {
    return ZERO_ALTERNATE_VALUE;
  }

  const parsedUsd = parseValue(inputValue, USD_DECIMALS);
  if (parsedUsd === undefined || parsedUsd === 0n) {
    return ZERO_ALTERNATE_VALUE;
  }

  if (markPrice === undefined || markPrice === 0n) {
    return ZERO_ALTERNATE_VALUE;
  }

  const visualMultiplier = BigInt(indexToken?.visualMultiplier ?? 1);
  const tokenDecimals = indexToken?.decimals ?? DEFAULT_TOKEN_DECIMALS;

  return formatTokenFromUsdValue({
    parsedInput: parsedUsd,
    markPrice,
    visualMultiplier,
    tokenDecimals,
    tokenSymbol: indexToken?.symbol,
    tokenPriceDecimals: indexToken?.priceDecimals ?? DEFAULT_TOKEN_DISPLAY_DECIMALS,
  });
}

function formatTokenFromUsdValue(p: {
  parsedInput: bigint;
  markPrice: bigint;
  visualMultiplier: bigint;
  tokenDecimals: number;
  tokenSymbol?: string;
  tokenPriceDecimals: number;
}) {
  const tokenValue = (p.parsedInput * p.visualMultiplier * 10n ** BigInt(p.tokenDecimals)) / p.markPrice;
  const formattedValue = formatAmount(tokenValue, p.tokenDecimals, p.tokenPriceDecimals);

  return p.tokenSymbol ? `${formattedValue} ${p.tokenSymbol}` : formattedValue;
}
