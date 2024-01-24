import cx from "classnames";
import Slider, { SliderTooltip, Handle } from "rc-slider";
import "rc-slider/assets/index.css";
import "./LeverageSlider.scss";
import { range } from "lodash";
import { useCallback, useEffect } from "react";

const marks = [2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const DEFAULT_LEVERAGE_KEY = 10;

type Props = {
  isPositive?: boolean;
  value?: number;
  onChange: (value: number) => void;
  marks: number[];
};

export function LeverageSlider(p: Props) {
  const { onChange, value } = p;
  const marksLabel = getMarksWithLabel(p.marks ?? marks);
  const { keyValueMap, valueKeyMap } = createMarksValueMap(p.marks ?? marks);
  const defaultValue = valueKeyMap[value ?? 0] ?? DEFAULT_LEVERAGE_KEY;

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
        max={100}
        step={1}
        marks={marksLabel}
        handle={customHandle}
        onChange={handleChange}
        defaultValue={defaultValue}
      />
    </div>
  );
}

function LeverageSliderHandle({ value, dragging, index, keyValueMap, ...restProps }: any) {
  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${parseFloat(keyValueMap[value || 0] ?? DEFAULT_LEVERAGE_KEY).toFixed(2)}x`}
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

function createOverlappingChunks(array: number[], chunkSize: number): number[][] {
  return array.slice(0, -1).map((_, index) => array.slice(index, index + chunkSize));
}

function createMarksValueMap(marks: number[]) {
  const marksChunks = createOverlappingChunks(marks, 2);
  const values = marksChunks.flatMap((chunk, index) => {
    const shouldIncludeMax = index === marksChunks.length - 1;
    return generateEquallySpacedArray(chunk[0], chunk[1], shouldIncludeMax);
  });

  const keyValueMap = Object.fromEntries(values.map((value, index) => [index, value]));
  const valueKeyMap = Object.fromEntries(values.map((value, index) => [value, index]));

  return { keyValueMap, valueKeyMap };
}

function getMarksWithLabel(marks: number[]) {
  return marks.reduce((marks, value, index) => {
    marks[index * 10] = `${value}x`;
    return marks;
  }, {} as { [key: number]: string });
}
