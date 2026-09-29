import { t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useMemo } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { TradeMode } from "sdk/utils/trade/types";

import { UsdPriceValue } from "components/NumericValue/UsdPriceValue";

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
    return (
      <span
        className={cx("whitespace-nowrap", onMarkPriceClick ? "cursor-pointer" : undefined)}
        onClick={onMarkPriceClick}
      >
        {t`Mark:`}{" "}
        <UsdPriceValue
          price={markPrice}
          visualMultiplier={indexToken?.visualMultiplier}
          className="text-typography-primary"
        />
      </span>
    );
  }, [indexToken?.visualMultiplier, markPrice, onMarkPriceClick]);

  return (
    <TradeInputField
      label={priceLabel}
      alternateValue={null}
      displayMode="usd"
      showDisplayModeToggle={false}
      unitLabel="USD"
      rightHeadline={alternateValue}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      onFocus={onFocus}
      qa={qa}
    />
  );
}
