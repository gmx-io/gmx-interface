import { Trans } from "@lingui/macro";
import cx from "classnames";
import Slider from "rc-slider";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import "rc-slider/assets/index.css";
import "./MarginPercentageSlider.scss";

const PERCENTAGE_MARKS = [0, 25, 50, 75, 100];
const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

type Props = {
  value: number;
  onChange: (value: number) => void;
  onMaxClick?: () => void;
  className?: string;
};

export function MarginPercentageSlider({ value, onChange, onMaxClick, className }: Props) {
  const sliderValue = useMemo(() => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, value));
  }, [value]);
  const roundedSliderValue = useMemo(() => clampPercentage(sliderValue), [sliderValue]);
  const [inputValue, setInputValue] = useState(() => roundedSliderValue.toString());

  const handleChange = useCallback(
    (newValue: number) => {
      onChange(clampPercentage(newValue));
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value.replace(/[^\d]/g, "").slice(0, 3);

      if (rawValue === "") {
        setInputValue("");
        return;
      }

      const nextValue = clampPercentage(Number(rawValue));

      setInputValue(nextValue.toString());
      onChange(nextValue);
    },
    [onChange]
  );

  const handleInputBlur = useCallback(() => {
    if (inputValue === "") {
      setInputValue(roundedSliderValue.toString());
      return;
    }

    const nextValue = clampPercentage(Number(inputValue));

    setInputValue(nextValue.toString());

    if (nextValue !== roundedSliderValue) {
      onChange(nextValue);
    }
  }, [inputValue, onChange, roundedSliderValue]);

  const marks = useMemo(() => {
    return PERCENTAGE_MARKS.reduce(
      (acc, mark) => {
        acc[mark] = {
          label: `${mark}%`,
        };
        return acc;
      },
      {} as { [key: number]: { label: string } }
    );
  }, []);

  useEffect(() => {
    setInputValue(roundedSliderValue.toString());
  }, [roundedSliderValue]);

  return (
    <div className={cx("MarginPercentageSlider flex items-center gap-16", className)}>
      <div className="h-28 flex-1 px-4">
        <Slider min={0} max={100} step={1} onChange={handleChange} value={sliderValue} marks={marks} />
      </div>
      <div className="flex shrink-0 items-center gap-8 rounded-8 bg-slate-800 px-8 py-6">
        <div className="flex items-center">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            className="bg-transparent w-36 appearance-none border-none p-0 text-right text-13 text-typography-primary outline-none numbers focus:outline-none"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
          />
          <span className="ml-1 text-typography-secondary">%</span>
        </div>

        <button
          type="button"
          className={cx(
            "cursor-pointer rounded-full border-none bg-slate-600 px-8 py-2 text-12",
            "font-medium text-typography-primary",
            {
              "cursor-pointer hover:bg-slate-500": onMaxClick,
              "cursor-not-allowed text-typography-secondary": !onMaxClick,
            }
          )}
          onClick={onMaxClick}
          disabled={!onMaxClick}
        >
          <Trans>Max</Trans>
        </button>
      </div>
    </div>
  );
}
