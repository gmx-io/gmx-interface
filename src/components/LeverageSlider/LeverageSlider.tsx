import cx from "classnames";
import Slider, { SliderTooltip, Handle } from "rc-slider";
import "rc-slider/assets/index.css";
import "./LeverageSlider.scss";
import { range } from "lodash";
import { useCallback, useEffect, useMemo } from "react";

const defaultMarks = [2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const DEFAULT_LEVERAGE_KEY = 20;

type Props = {
  isPositive?: boolean;
  value?: number;
  onChange: (value: number) => void;
  marks: number[];
};

type HandleProps = {
  value: number;
  dragging: boolean;
  index: number;
  keyValueMap: { [key: number]: number };
};

function getMarksWithLabel(marks: number[]) {
  return marks.reduce((marks, value, index) => {
    marks[index * 10] = `${value}x`;
    return marks;
  }, {} as { [key: number]: string });
}

export function LeverageSlider(p: Props) {
  const { onChange, value, marks } = p;
  const finalMarks = marks ?? defaultMarks;

  const { marksLabel, keyValueMap, valueKeyMap } = useMemo(() => {
    const marksLabel = getMarksWithLabel(finalMarks);
    const { keyValueMap, valueKeyMap } = generateKeyValueMap(finalMarks);
    return { marksLabel, keyValueMap, valueKeyMap };
  }, [finalMarks]);

  const defaultValue = valueKeyMap[value ?? 0] ?? DEFAULT_LEVERAGE_KEY;
  const max = (finalMarks.length - 1) * 10;

  const handleChange = useCallback(
    (value: number) => {
      onChange(keyValueMap[value ?? 0] ?? DEFAULT_LEVERAGE_KEY);
    },
    [onChange, keyValueMap]
  );

  useEffect(() => {
    if (value !== defaultValue) {
      handleChange(defaultValue);
    }
  }, [value, defaultValue, handleChange]);

  const customHandle = (props: any) => <LeverageSliderHandle {...props} keyValueMap={keyValueMap} />;

  return (
    <div
      className={cx("LeverageSlider", {
        positive: p.isPositive,
        negative: !p.isPositive,
      })}
    >
      <Slider
        min={0}
        max={max}
        step={1}
        marks={marksLabel}
        handle={customHandle}
        onChange={handleChange}
        defaultValue={defaultValue}
      />
    </div>
  );
}

function LeverageSliderHandle({ value, dragging, index, keyValueMap, ...restProps }: HandleProps) {
  const displayValue = keyValueMap[value || 0] ?? DEFAULT_LEVERAGE_KEY;
  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${parseFloat(displayValue.toString()).toFixed(2)}x`}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Handle value={value} {...restProps} />
    </SliderTooltip>
  );
}

function generateEquallySpacedArray(min: number, max: number, shouldIncludeMax?: boolean): number[] {
  const step = (max - min) / 10;
  let array = range(min, max, step).map((num) => parseFloat(num.toFixed(1)));

  if (shouldIncludeMax && array[array.length - 1] !== max) {
    array.push(max);
  }

  return array;
}

function generateKeyValueMap(marks: number[]) {
  const values = marks.slice(0, -1).flatMap((mark, index) => {
    const shouldIncludeMax = index === marks.length - 2;
    return generateEquallySpacedArray(mark, marks[index + 1], shouldIncludeMax);
  });

  const keyValueMap = Object.fromEntries(values.map((value, index) => [index, value]));
  const valueKeyMap = Object.fromEntries(values.map((value, index) => [value, index]));

  return { keyValueMap, valueKeyMap };
}
