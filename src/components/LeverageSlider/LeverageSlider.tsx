import cx from "classnames";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";
import Slider, { SliderTooltip, Handle } from "rc-slider";
import "rc-slider/assets/index.css";
import "./LeverageSlider.scss";

const leverageMarks = {
  2: "2x",
  5: "5x",
  10: "10x",
  15: "15x",
  20: "20x",
  25: "25x",
  30: "30x",
  35: "35x",
  40: "40x",
  45: "45x",
  50: "50x",
};

type Props = {
  isPositive?: boolean;
  value?: number;
  onChange: (value: number) => void;
};

export function LeverageSlider(p: Props) {
  return (
    <div
      className={cx("LeverageSlider", {
        positive: p.isPositive,
        negative: !p.isPositive,
      })}
    >
      <Slider
        min={1.1}
        max={MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR}
        step={0.1}
        marks={leverageMarks}
        handle={LeverageSliderHandle}
        onChange={p.onChange}
        defaultValue={p.value}
      />
    </div>
  );
}

function LeverageSliderHandle({ value, dragging, index, ...restProps }: any) {
  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${parseFloat(value).toFixed(2)}x`}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Handle value={value} {...restProps} />
    </SliderTooltip>
  );
}
