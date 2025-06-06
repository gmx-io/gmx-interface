import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLatest } from "react-use";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { roundToTwoDecimals } from "lib/numbers";

import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import type { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export const NUMBER_WITH_TWO_DECIMALS = /^\d+(\.\d{0,2})?$/; // 0.00 ~ 99.99

function getValueText(value: number) {
  return roundToTwoDecimals((value / BASIS_POINTS_DIVISOR) * 100).toString();
}

type Props = {
  onChange: (value: number) => void;
  defaultValue: number;
  maxValue?: number;
  highValue?: number;
  lowValue?: number;
  suggestions?: number[];
  lowValueWarningText?: ReactNode;
  highValueWarningText?: ReactNode;
  negativeSign?: boolean;
  highValueCheckStrategy?: "gte" | "gt";
  value?: number;
  tooltipPosition?: TooltipPosition;
  inputId?: string;
};

const DEFAULT_SUGGESTIONS = [0.3, 0.5, 1, 1.5];

export default function PercentageInput({
  onChange,
  defaultValue,
  value,
  maxValue = 99 * 100,
  highValue,
  lowValue,
  suggestions = DEFAULT_SUGGESTIONS,
  highValueWarningText,
  lowValueWarningText,
  negativeSign,
  highValueCheckStrategy: checkStrategy = "gte",
  tooltipPosition,
  inputId,
}: Props) {
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState(() => (value === undefined ? "" : getValueText(value)));

  function handleChange(value: string) {
    if (value === "") {
      setInputValue("");
      onChange(defaultValue);
      return;
    }

    const parsedValue = Math.round(Number.parseFloat(value) * 100);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    if (parsedValue >= maxValue) {
      onChange(maxValue);
      setInputValue(getValueText(maxValue));
      return;
    }

    if (NUMBER_WITH_TWO_DECIMALS.test(value)) {
      onChange(parsedValue);
      setInputValue(value);
    }
  }

  const latestInputValue = useLatest(inputValue);

  useEffect(() => {
    if (value === undefined) {
      if (latestInputValue.current !== "") {
        setInputValue("");
      }

      return;
    }

    const valueText = getValueText(value);
    const defaultValueText = getValueText(defaultValue);

    if (
      // When the value is changed from outside we want to keep input empty
      // if the value is the same as the default value as it means the user
      // just cleared the input
      Number.parseFloat(latestInputValue.current) !== Number.parseFloat(valueText) &&
      !(valueText === defaultValueText && latestInputValue.current === "")
    ) {
      setInputValue(valueText);
    }
  }, [defaultValue, value, latestInputValue]);

  const error = useMemo(() => {
    const parsedValue = Math.round(Number.parseFloat(inputValue) * 100);

    if (
      highValue &&
      ((checkStrategy === "gte" && parsedValue >= highValue) || (checkStrategy === "gt" && parsedValue > highValue))
    ) {
      return highValueWarningText;
    }

    if (lowValueWarningText && lowValue && parsedValue < lowValue) {
      return lowValueWarningText;
    }
  }, [inputValue, highValue, checkStrategy, lowValueWarningText, lowValue, highValueWarningText]);

  return (
    <TooltipWithPortal
      disableHandleStyle
      disabled={!error || isPanelVisible}
      renderContent={() => <div>{error}</div>}
      position={tooltipPosition}
    >
      <SuggestionInput
        className="w-80"
        label={negativeSign ? "-" : undefined}
        value={inputValue}
        setValue={handleChange}
        placeholder={getValueText(defaultValue)}
        suggestionList={suggestions}
        symbol="%"
        onPanelVisibleChange={setIsPanelVisible}
        inputId={inputId}
      />
    </TooltipWithPortal>
  );
}
