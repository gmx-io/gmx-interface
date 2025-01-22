import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent, useState, useCallback } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import { PERCENTAGE_SUGGESTIONS } from "config/ui";
import NumberInput from "components/NumberInput/NumberInput";

type Props = {
  topLeftLabel: string;
  bottomLeftValue?: string;
  isBottomLeftValueMuted?: boolean;
  bottomRightLabel?: string;
  bottomRightValue?: string;
  onClickBottomRightLabel?: () => void;
  topRightLabel?: string;
  topRightValue?: string;
  onClickTopRightLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  maxPosition?: "bottom-right" | "top-right";
  onClickMax?: () => void;
  onFocus?: () => void;
  shouldClosestLabelTriggerMax?: boolean;
  children?: ReactNode;
  showPercentSelector?: boolean;
  onPercentChange?: (percentage: number) => void;
  qa?: string;
};

export default function BuyInputSection(props: Props) {
  const {
    topLeftLabel,
    bottomLeftValue,
    isBottomLeftValueMuted = false,
    bottomRightLabel,
    bottomRightValue,
    onClickBottomRightLabel,
    topRightLabel,
    topRightValue,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onClickMax,
    maxPosition = "bottom-right",
    onFocus,
    shouldClosestLabelTriggerMax = true,
    children,
    showPercentSelector,
    onPercentChange,
    qa,
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleOnFocus = useCallback(() => {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(true);
    }
    if (onFocus) onFocus();
  }, [showPercentSelector, onPercentChange, setIsPercentSelectorVisible, onFocus]);

  const handleOnBlur = useCallback(() => {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(false);
    }
  }, [showPercentSelector, onPercentChange, setIsPercentSelectorVisible]);

  const handleBoxClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const onUserInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onInputValueChange) {
        onInputValueChange(e);
      }
    },
    [onInputValueChange]
  );

  const handleMaxClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
      if (onClickMax) {
        e.stopPropagation();
        onClickMax();
      }
    },
    [onClickMax]
  );

  const handleTopRightClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClickTopRightLabel) {
        e.stopPropagation();
        onClickTopRightLabel();
      } else if (onClickMax && maxPosition === "top-right" && shouldClosestLabelTriggerMax) {
        e.stopPropagation();
        onClickMax();
      }
    },
    [onClickTopRightLabel, onClickMax, maxPosition, shouldClosestLabelTriggerMax]
  );

  const handleBottomRightClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClickBottomRightLabel) {
        e.stopPropagation();
        onClickBottomRightLabel();
      } else if (onClickMax && maxPosition === "bottom-right" && shouldClosestLabelTriggerMax) {
        e.stopPropagation();
        onClickMax();
      }
    },
    [onClickBottomRightLabel, onClickMax, maxPosition, shouldClosestLabelTriggerMax]
  );

  return (
    <div data-qa={qa}>
      <div
        className="flex cursor-text flex-col justify-between gap-8 rounded-4 bg-cold-blue-900 px-14 pb-16
                  pt-12 text-12 leading-[16px]
                  shadow-[inset_0_0_0_1px] shadow-[transparent]
                  focus-within:shadow-cold-blue-500
                  hover:[&:not(:focus-within)]:shadow-[rgba(58,63,121,0.4)]"
        onClick={handleBoxClick}
      >
        <div className="flex justify-between">
          <div data-label="left" className="text-slate-100">
            {topLeftLabel}
          </div>
          {(topRightLabel || topRightValue || (onClickMax && maxPosition === "top-right")) && (
            <div
              data-label="right"
              className={cx(
                "flex items-baseline gap-4",
                (onClickTopRightLabel || (onClickMax && maxPosition === "top-right" && shouldClosestLabelTriggerMax)) &&
                  "cursor-pointer"
              )}
              onClick={handleTopRightClick}
            >
              {topRightLabel && <span className="text-slate-100">{topRightLabel}:</span>}
              {topRightValue && <span>{topRightValue}</span>}
              {onClickMax && maxPosition === "top-right" && (
                <button
                  type="button"
                  className="-my-4 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
                  onClick={handleMaxClick}
                  data-qa="input-max"
                >
                  <Trans>MAX</Trans>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={inputValue}
              className="h-28 w-full min-w-0 p-0 text-24 !leading-[24px] outline-none"
              inputRef={inputRef}
              onValueChange={onUserInput}
              onFocus={handleOnFocus}
              onBlur={handleOnBlur}
              placeholder="0.0"
              qa={qa ? qa + "-input" : undefined}
            />
            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-[rgba(0,0,0,0)] to-cold-blue-900"></div>
          </div>

          <div className="shrink-0 text-24 leading-[24px]">{children}</div>
        </div>

        {(bottomLeftValue || bottomRightValue || (onClickMax && maxPosition === "bottom-right")) && (
          <div className="flex justify-between">
            <div
              className={cx({
                "text-slate-100": isBottomLeftValueMuted,
                "text-white": !isBottomLeftValueMuted,
              })}
            >
              {bottomLeftValue || ""}
            </div>
            <div
              className={cx(
                "flex items-baseline gap-4",
                (onClickBottomRightLabel ||
                  (onClickMax && maxPosition === "bottom-right" && shouldClosestLabelTriggerMax)) &&
                  "cursor-pointer"
              )}
              onClick={handleBottomRightClick}
            >
              {bottomRightLabel && <span className="text-slate-100">{bottomRightLabel}:</span>}
              {bottomRightValue && <span>{bottomRightValue}</span>}

              {onClickMax && maxPosition === "bottom-right" && (
                <button
                  type="button"
                  className="-my-4 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
                  onClick={handleMaxClick}
                  data-qa="input-max"
                >
                  <Trans>MAX</Trans>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showPercentSelector && isPercentSelectorVisible && onPercentChange && (
        <ul className="PercentSelector">
          {PERCENTAGE_SUGGESTIONS.map((percentage) => (
            <li
              className="PercentSelector-item"
              key={percentage}
              onMouseDown={() => {
                onPercentChange?.(percentage);
                handleOnBlur();
              }}
              data-qa={`${qa}-percent-selector-${percentage}`}
            >
              {percentage}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
