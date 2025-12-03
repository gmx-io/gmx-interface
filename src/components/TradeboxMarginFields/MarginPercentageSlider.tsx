import { Trans } from "@lingui/macro";
import cx from "classnames";
import Slider, { Handle, SliderTooltip } from "rc-slider";
import { forwardRef, useCallback, useEffect, useMemo } from "react";

import "rc-slider/assets/index.css";
import "./MarginPercentageSlider.scss";

const PERCENTAGE_MARKS = [0, 25, 50, 75, 100];

type Props = {
  value: number;
  onChange: (value: number) => void;
  onMaxClick?: () => void;
  className?: string;
};

type HandleProps = {
  value: number;
  dragging: boolean;
  index: number;
  displayValue: number;
};

export function MarginPercentageSlider({ value, onChange, onMaxClick, className }: Props) {
  const sliderValue = useMemo(() => {
    return Math.min(100, Math.max(0, value));
  }, [value]);

  const handleChange = useCallback(
    (newValue: number) => {
      onChange(Math.round(newValue));
    },
    [onChange]
  );

  const customHandle = useMemo(() => {
    return (props: any) => <PercentageSliderHandle {...props} displayValue={sliderValue} />;
  }, [sliderValue]);

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
    <div className={cx("MarginPercentageSlider flex items-center gap-16 px-12", className)}>
      <div className="flex-1 px-4">
        <Slider
          min={0}
          max={100}
          step={1}
          handle={customHandle}
          onChange={handleChange}
          value={sliderValue}
          marks={marks}
        />
      </div>
      <div className="flex shrink-0 items-center gap-8">
        <span className="min-w-36 text-right text-13 text-typography-secondary">{Math.round(sliderValue)}%</span>
        {onMaxClick && (
          <button
            type="button"
            className="cursor-pointer rounded-4 border-none bg-slate-600 px-12 py-4 text-13 font-medium text-typography-primary transition-colors hover:bg-slate-500"
            onClick={onMaxClick}
          >
            <Trans>Max</Trans>
          </button>
        )}
      </div>
    </div>
  );
}

const PercentageSliderHandle = forwardRef<Handle, HandleProps>(function PercentageSliderHandle(
  { value, dragging, index, displayValue, ...restProps },
  ref
) {
  useEffect(() => {
    if (dragging) {
      document.body.classList.add("dragging");
    } else {
      document.body.classList.remove("dragging");
    }
  }, [dragging]);

  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${Math.round(displayValue)}%`}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Handle value={value} {...restProps} ref={ref} />
    </SliderTooltip>
  );
});
