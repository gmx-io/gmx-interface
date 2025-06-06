import "./BuyInputSection.scss";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import React, { useRef, ReactNode, ChangeEvent, useState, useCallback } from "react";

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
  // eslint-disable-next-line react/no-unused-prop-types
  maxButtonPosition?: "bottom-right" | "top-right";
  onClickMax?: () => void;
  onFocus?: () => void;
  // eslint-disable-next-line react/no-unused-prop-types
  shouldClosestLabelTriggerMax?: boolean;
  children?: ReactNode;
  showPercentSelector?: boolean;
  onPercentChange?: (percentage: number) => void;
  qa?: string;
  isDisabled?: boolean;
};

function getMaxButtonPosition({
  maxButtonPosition: maybeMaxButtonPosition,
  onClickMax,
  shouldClosestLabelTriggerMax = true,
  topRightLabel,
  topRightValue,
  bottomRightLabel,
  bottomRightValue,
}: Props) {
  let maxPosition = "bottom-right";
  if (maybeMaxButtonPosition) {
    maxPosition = maybeMaxButtonPosition;
  } else if (onClickMax && shouldClosestLabelTriggerMax) {
    if (topRightLabel || topRightValue) {
      maxPosition = "top-right";
    } else if (bottomRightLabel || bottomRightValue) {
      maxPosition = "bottom-right";
    }
  }
  return maxPosition;
}

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
    onFocus,
    children,
    showPercentSelector,
    onPercentChange,
    qa,
    isDisabled = false,
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxButtonPosition = getMaxButtonPosition(props);

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
      } else if (onClickMax && maxButtonPosition === "top-right") {
        e.stopPropagation();
        onClickMax();
      }
    },
    [onClickTopRightLabel, onClickMax, maxButtonPosition]
  );

  const handleBottomRightClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClickBottomRightLabel) {
        e.stopPropagation();
        onClickBottomRightLabel();
      } else if (onClickMax && maxButtonPosition === "bottom-right") {
        e.stopPropagation();
        onClickMax();
      }
    },
    [onClickBottomRightLabel, onClickMax, maxButtonPosition]
  );

  return (
    <div data-qa={qa}>
      <div
        className={cx(
          `flex cursor-text flex-col justify-between gap-8 rounded-8 bg-cold-blue-900
          px-14 pb-16 pt-12 text-12 leading-[16px] shadow-[inset_0_0_0_1px] shadow-[transparent] border border-cold-blue-900`,
          {
            "border-2 border-cold-blue-900 bg-opacity-70": isDisabled,
            "hover:border-blue-300 focus-within:border-blue-300": !isDisabled,
          }
        )}
        onClick={handleBoxClick}
      >
        <div className="flex justify-between">
          <div data-label="left" className="text-slate-100">
            {topLeftLabel}
          </div>
          {(topRightLabel || topRightValue || (onClickMax && maxButtonPosition === "top-right")) && (
            <div
              data-label="right"
              className={cx(
                "flex items-baseline gap-4",
                (onClickTopRightLabel || (onClickMax && maxButtonPosition === "top-right")) && "cursor-pointer"
              )}
              onClick={handleTopRightClick}
            >
              {topRightLabel && <span className="text-slate-100">{topRightLabel}:</span>}
              {topRightValue && <span>{topRightValue}</span>}
              {onClickMax && maxButtonPosition === "top-right" && <MaxButton onClick={handleMaxClick} />}
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
              isDisabled={isDisabled}
            />
            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-[rgba(0,0,0,0)] to-cold-blue-900" />

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

          <div className="shrink-0 text-24 leading-[24px]">{children}</div>
        </div>

        {(bottomLeftValue || bottomRightValue || (onClickMax && maxButtonPosition === "bottom-right")) && (
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
                (onClickBottomRightLabel || (onClickMax && maxButtonPosition === "bottom-right")) && "cursor-pointer"
              )}
              onClick={handleBottomRightClick}
            >
              {bottomRightLabel && <span className="text-slate-100">{bottomRightLabel}:</span>}
              {bottomRightValue && <span>{bottomRightValue}</span>}

              {onClickMax && maxButtonPosition === "bottom-right" && <MaxButton onClick={handleMaxClick} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const MaxButton = ({ onClick }: { onClick: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void }) => {
  return (
    <button
      type="button"
      className="-my-4 rounded-full font-medium bg-fill-accent px-8 py-2"
      onClick={onClick}
      data-qa="input-max"
    >
      <Trans>Max</Trans>
    </button>
  );
};
