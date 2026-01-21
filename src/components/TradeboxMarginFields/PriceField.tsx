import { Trans } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatUsdPrice } from "lib/numbers";

import { TradeInputField } from "./TradeInputField";

type Props = {
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  qa?: string;
};

export function PriceField({ indexToken, markPrice, inputValue, onInputValueChange, onFocus, qa }: Props) {
  const alternateValue = useMemo(() => {
    const formattedMarkPrice = formatUsdPrice(markPrice, {
      visualMultiplier: indexToken?.visualMultiplier,
    });

    return (
      <>
        <Trans>Mark:</Trans> <span className="text-typography-primary">{formattedMarkPrice}</span>
      </>
    );
  }, [indexToken?.visualMultiplier, markPrice]);

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
