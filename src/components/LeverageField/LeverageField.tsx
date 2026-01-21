import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  useDismiss,
  useInteractions,
} from "@floating-ui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";

import AlertIcon from "img/ic_alert.svg?react";
import CloseIcon from "img/ic_close.svg?react";

const defaultMarks = [0.1, 25, 50];
const DEFAULT_LEVERAGE = 20;

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  marks: number[];
  disabled?: boolean;
};

function clampLeverage(value: number, min: number, max: number) {
  const safeMin = min > 0 ? min : DEFAULT_LEVERAGE;
  return Math.min(Math.max(value, safeMin), max);
}

function formatLeverage(value: number) {
  return parseFloat(value.toFixed(2)).toString();
}

export function LeverageField({ value, onChange, marks, disabled }: Props) {
  const finalMarks = useMemo(() => (marks?.length ? marks : defaultMarks), [marks]);
  const minMark = finalMarks[0] ?? DEFAULT_LEVERAGE;
  const maxMark = finalMarks.at(-1) ?? DEFAULT_LEVERAGE;

  const [isOpen, setIsOpen] = useState(false);

  const [inputValue, setInputValue] = useState<string>(() => {
    if (value !== null) {
      return formatLeverage(clampLeverage(value, minMark, maxMark));
    }

    return formatLeverage(minMark);
  });

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift()],
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

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

  const handleSliderChange = useCallback(
    (newValue: number) => {
      const clamped = clampLeverage(newValue, minMark, maxMark);
      setInputValue(formatLeverage(clamped));
      onChange(clamped);
    },
    [minMark, maxMark, onChange]
  );

  const handleFieldClick = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const displayValue =
    value !== null ? formatLeverage(clampLeverage(value, minMark, maxMark)) : formatLeverage(minMark);

  return (
    <>
      <div
        ref={refs.setReference}
        data-qa="leverage-slider"
        className={cx(
          "user-select-none flex w-48 items-center justify-between gap-10 rounded-4 bg-slate-800 px-8",
          disabled ? "pointer-events-none cursor-default opacity-50" : "group cursor-pointer"
        )}
        onClick={handleFieldClick}
        {...getReferenceProps()}
      >
        <span className={cx("text-13 text-typography-primary", { "group-hover:text-blue-300": !disabled })}>
          {displayValue}
          <span className={cx("ml-4 text-typography-secondary", { "group-hover:text-blue-300": !disabled })}>x</span>
        </span>
      </div>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[1000] w-[376px] max-w-[90vw] rounded-4 border border-slate-600 bg-slate-900 p-16"
            {...getFloatingProps()}
          >
            <div className="mb-16 flex items-center justify-between">
              <span className="text-16 font-medium text-typography-primary">{t`Adjust Leverage`}</span>
              <button onClick={handleClose} className="text-typography-secondary hover:text-typography-primary">
                <CloseIcon className="size-20" />
              </button>
            </div>
            <div className="flex flex-col gap-12">
              <div className="flex items-center gap-12">
                <div className="min-w-0 flex-1">
                  <LeverageSlider value={value ?? minMark} onChange={handleSliderChange} marks={finalMarks} />
                </div>
                <SuggestionInput
                  value={inputValue}
                  setValue={handleInputChange}
                  onBlur={() => commitValue()}
                  suffix="x"
                  inputClassName="w-32 text-13"
                  className="!rounded-4 border border-slate-600 bg-slate-800 !py-6"
                />
              </div>
              <ColorfulBanner icon={AlertIcon}>
                <Trans>High leverage increases liquidation risk.</Trans>
              </ColorfulBanner>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
