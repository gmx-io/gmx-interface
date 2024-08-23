import cx from "classnames";
import Slider, { SliderTooltip, Handle } from "rc-slider";
import "rc-slider/assets/index.css";
import "./LeverageSlider.scss";
import range from "lodash/range";
import { forwardRef, useCallback, useEffect, useMemo } from "react";

const defaultMarks = [1.1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 50];
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
  displayValue: number;
};

function getMarksWithLabel(marks: number[]) {
  return marks.reduce(
    (marks, value, index) => {
      marks[index * 10] = `${value}x`;
      return marks;
    },
    {} as { [key: number]: string }
  );
}

export function LeverageSlider(p: Props) {
  const { onChange, value, marks } = p;
  const finalMarks = marks ?? defaultMarks;

  const { marksLabel, keyValueMap, valueKeyMap } = useMemo(() => {
    const marksLabel = getMarksWithLabel(finalMarks);
    const { keyValueMap, valueKeyMap } = generateKeyValueMap(finalMarks);
    return { marksLabel, keyValueMap, valueKeyMap };
  }, [finalMarks]);

  const sliderValue =
    value === undefined ? valueKeyMap[finalMarks[0]] : valueKeyMap[value] ?? sliderValueToSliderKey(keyValueMap, value);

  const max = (finalMarks.length - 1) * 10;

  const handleChange = useCallback(
    (value: number) => {
      const truncatedValue = Math.trunc(value ?? DEFAULT_LEVERAGE_KEY);
      onChange(keyValueMap[truncatedValue] ?? DEFAULT_LEVERAGE_KEY);
    },
    [onChange, keyValueMap]
  );

  const customHandle = useMemo(() => {
    return (props: any) => <LeverageSliderHandle {...props} displayValue={value} />;
  }, [value]);

  return (
    <div
      className={cx("LeverageSlider", {
        positive: p.isPositive,
        negative: !p.isPositive,
      })}
      data-qa="leverage-slider"
    >
      <Slider
        min={0}
        max={max}
        step={0.1}
        marks={marksLabel}
        handle={customHandle}
        onChange={handleChange}
        value={sliderValue}
      />
    </div>
  );
}

const LeverageSliderHandle = forwardRef<Handle, HandleProps>(function LeverageSliderHandle(
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
      overlay={`${parseFloat(displayValue.toString()).toFixed(2)}x`}
      visible={dragging}
      placement="top"
      key={index}
      data-qa={"leverage-slider-tooltip"}
    >
      <Handle data-qa={"leverage-slider-handle"} value={value} {...restProps} ref={ref} />
    </SliderTooltip>
  );
});

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

function sliderValueToSliderKey(keyValueMap: { [key: number]: number }, value: number): number {
  const sortedValues = Array.from({
    length: Object.keys(keyValueMap).length,
  }).map((_, index) => keyValueMap[index]);

  let leftIndex = sortedValues.findIndex((val) => val >= value);
  if (leftIndex !== -1) {
    if (sortedValues[leftIndex] === value) {
      return leftIndex;
    }
    leftIndex -= 1;
  } else {
    leftIndex = 0;
  }

  const leftValue = sortedValues[leftIndex - 1];
  if (leftValue === undefined) {
    return sortedValues[0];
  }

  let rightIndex = sortedValues.findLastIndex((val) => val <= value);
  if (rightIndex !== -1) {
    if (sortedValues[rightIndex] === value) {
      return rightIndex;
    }
    rightIndex += 1;
  } else {
    rightIndex = sortedValues.length - 1;
  }

  const rightValue = sortedValues[rightIndex];

  if (rightValue === undefined) {
    return sortedValues[sortedValues.length - 1];
  }

  return (value - leftValue) / (rightValue - leftValue) + leftIndex;
}
