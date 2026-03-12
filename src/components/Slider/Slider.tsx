import cx from "classnames";
import RcSlider from "rc-slider";
import { ComponentProps, ReactElement } from "react";

import "rc-slider/assets/index.css";
import "./Slider.scss";

type RcSliderProps = ComponentProps<typeof RcSlider>;

type Props = {
  min: number;
  max: number;
  value: number;
  step?: number;
  marks?: RcSliderProps["marks"];
  handle?: RcSliderProps["handle"];
  onChange: (value: number) => void;
  className?: string;
  qa?: string;
};

export function Slider({ min, max, value, step = 1, marks, handle, onChange, className, qa }: Props): ReactElement {
  return (
    <div className={cx("Slider", className)} data-qa={qa}>
      <RcSlider min={min} max={max} step={step} value={value} marks={marks} handle={handle} onChange={onChange} />
    </div>
  );
}
