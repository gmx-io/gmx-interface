import cx from "classnames";
import { useCallback, useMemo } from "react";

import { Slider } from "components/Slider";

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
  className?: string;
};

export function MarginPercentageSlider({ value, onChange, className }: Props) {
  const sliderValue = useMemo(() => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, value));
  }, [value]);

  const handleChange = useCallback(
    (newValue: number) => {
      onChange(clampPercentage(newValue));
    },
    [onChange]
  );

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

  return (
    <div className={cx("flex items-center gap-16", className)}>
      <div className="h-32 flex-1 px-4">
        <Slider min={0} max={100} step={1} onChange={handleChange} value={sliderValue} marks={marks} />
      </div>
    </div>
  );
}
