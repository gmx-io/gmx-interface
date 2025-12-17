import { useCallback, useEffect, useMemo, useState } from "react";

import SuggestionInput from "components/SuggestionInput/SuggestionInput";

const defaultMarks = [0.1, 25, 50];
const DEFAULT_LEVERAGE = 20;

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  marks: number[];
};

function clampLeverage(value: number, min: number, max: number) {
  const safeMin = min > 0 ? min : DEFAULT_LEVERAGE;
  return Math.min(Math.max(value, safeMin), max);
}

function formatLeverage(value: number) {
  return parseFloat(value.toFixed(2)).toString();
}

export function LeverageField({ value, onChange, marks }: Props) {
  const finalMarks = useMemo(() => (marks?.length ? marks : defaultMarks), [marks]);
  const minMark = finalMarks[0] ?? DEFAULT_LEVERAGE;
  const maxMark = finalMarks.at(-1) ?? DEFAULT_LEVERAGE;

  const [inputValue, setInputValue] = useState<string>(() => {
    if (value !== null) {
      return formatLeverage(clampLeverage(value, minMark, maxMark));
    }

    return formatLeverage(minMark);
  });

  useEffect(() => {
    if (value !== null) {
      setInputValue(formatLeverage(clampLeverage(value, minMark, maxMark)));
    }
  }, [value, minMark, maxMark]);

  const parseAndClampValue = useCallback(
    (rawValue: string) => {
      const numericValue = parseFloat(rawValue);

      if (Number.isNaN(numericValue) || numericValue <= 0) {
        return undefined;
      }

      return clampLeverage(numericValue, minMark, maxMark);
    },
    [maxMark, minMark]
  );

  const commitValue = useCallback(
    (rawValue?: string) => {
      const nextValue = rawValue ?? inputValue;
      const parsed = parseAndClampValue(nextValue);
      const fallback = clampLeverage(value ?? minMark, minMark, maxMark);
      const finalValue = parsed ?? fallback;
      const formatted = formatLeverage(finalValue);

      setInputValue(formatted);
      onChange(finalValue);
    },
    [inputValue, maxMark, minMark, onChange, value, parseAndClampValue]
  );

  const handleInputChange = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);

      const parsed = parseAndClampValue(nextValue);
      if (parsed !== undefined) {
        onChange(parsed);
      }
    },
    [parseAndClampValue, onChange]
  );

  return (
    <div data-qa="leverage-slider">
      <SuggestionInput
        suggestionsPlacement="bottom-start"
        value={inputValue ?? "N/A"}
        setValue={handleInputChange}
        onBlur={commitValue}
        suggestionList={finalMarks}
        suggestionWithSuffix
        suffix="x"
        inputClassName="w-full text-right"
        className="leading-none !rounded-4 px-0 py-[1.5px]"
      />
    </div>
  );
}
