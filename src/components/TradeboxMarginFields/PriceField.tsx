import { t } from "@lingui/macro";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatUsdPrice } from "lib/numbers";
import { TradeMode } from "sdk/utils/trade/types";

import { TradeInputField } from "./TradeInputField";

type Props = {
  indexToken: TokenData | undefined;
  markPrice: bigint | undefined;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMarkPriceClick?: () => void;
  onFocus?: () => void;
  tradeMode: TradeMode;
  qa?: string;
};

export function PriceField({
  indexToken,
  markPrice,
  inputValue,
  onInputValueChange,
  onMarkPriceClick,
  onFocus,
  tradeMode,
  qa,
}: Props) {
  const priceLabel = tradeMode === TradeMode.Limit ? t`Limit price` : t`Stop price`;

  const alternateValue = useMemo(() => {
    const formattedMarkPrice = formatUsdPrice(markPrice, {
      visualMultiplier: indexToken?.visualMultiplier,
    });

    return (
      <span className={onMarkPriceClick ? "cursor-pointer" : undefined} onClick={onMarkPriceClick}>
        {t`Mark:`} <span className="text-typography-primary">{formattedMarkPrice}</span>
      </span>
    );
  }, [indexToken?.visualMultiplier, markPrice, onMarkPriceClick]);

  return (
    <TradeInputField
      label={priceLabel}
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
