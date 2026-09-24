import "./BuyInputSection.scss";
import cx from "classnames";
import React, { useRef, ReactNode, ChangeEvent, useState, useCallback } from "react";

import { PERCENTAGE_SUGGESTIONS } from "config/ui";
import { DEFAULT_MAX_ACTIONS_STATE, MaxActionsState } from "domain/tokens/useMaxAvailableAmount";

import { getIsMaxActionDisabled, MaxActions } from "components/MaxActions/MaxActions";
import NumberInput from "components/NumberInput/NumberInput";

type MaxActionsProps = {
  state: MaxActionsState;
  onMax: () => void;
  onKeepGas?: () => void;
};

type Props = {
  topLeftLabel: string;
  bottomLeftValue?: string;
  isBottomLeftValueMuted?: boolean;
  bottomRightLabel?: string;
  bottomRightValue?: ReactNode;
  onClickBottomRightLabel?: () => void;
  topRightLabel?: string;
  topRightValue?: ReactNode;
  onClickTopRightLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  // eslint-disable-next-line react/no-unused-prop-types
  maxButtonPosition?: "bottom-right" | "top-right";
  onClickMax?: () => void;
  isMaxSelected?: boolean;
  maxActions?: MaxActionsProps;
  onFocus?: () => void;
  // eslint-disable-next-line react/no-unused-prop-types
  shouldClosestLabelTriggerMax?: boolean;
  children?: ReactNode;
  showPercentSelector?: boolean;
  onPercentChange?: (percentage: number) => void;
  qa?: string;
  isDisabled?: boolean;
  className?: string;
  maxDecimals?: number;
  placeholder?: string;
};

function getMaxActionsProps({ onClickMax, isMaxSelected, maxActions }: Props): MaxActionsProps | undefined {
  if (maxActions) {
    return maxActions;
  }

  if (onClickMax) {
    return {
      state: { ...DEFAULT_MAX_ACTIONS_STATE, selected: isMaxSelected ? "max" : undefined },
      onMax: onClickMax,
    };
  }

  return undefined;
}

function getMaxButtonPosition({
  maxButtonPosition: maybeMaxButtonPosition,
  hasMaxActions,
  shouldClosestLabelTriggerMax = true,
  topRightLabel,
  topRightValue,
  bottomRightLabel,
  bottomRightValue,
}: Props & { hasMaxActions: boolean }) {
  let maxPosition = "bottom-right";
  if (maybeMaxButtonPosition) {
    maxPosition = maybeMaxButtonPosition;
  } else if (hasMaxActions && shouldClosestLabelTriggerMax) {
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
    isBottomLeftValueMuted = true,
    bottomRightLabel,
    bottomRightValue,
    onClickBottomRightLabel,
    topRightLabel,
    topRightValue,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onFocus,
    children,
    showPercentSelector,
    onPercentChange,
    qa,
    isDisabled = false,
    className,
    maxDecimals,
    placeholder = "0.0",
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxActionsProps = getMaxActionsProps(props);
  const hasMaxActions = maxActionsProps !== undefined;
  const onClickMax =
    maxActionsProps && !getIsMaxActionDisabled(maxActionsProps.state) ? maxActionsProps.onMax : undefined;
  const maxButtonPosition = getMaxButtonPosition({ ...props, hasMaxActions });

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
          `text-body-small flex cursor-text flex-col justify-between gap-2 rounded-8
          border border-slate-800 bg-slate-800 px-12 py-8`,
          {
            "bg-slate-900": isDisabled,
            "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300": !isDisabled,
          },
          className
        )}
        onClick={handleBoxClick}
      >
        <div className="flex justify-between">
          <div data-label="left" className="text-typography-secondary">
            {topLeftLabel}
          </div>
          {(topRightLabel || topRightValue || (hasMaxActions && maxButtonPosition === "top-right")) && (
            <div
              data-label="right"
              className={cx(
                "flex items-center gap-4",
                (onClickTopRightLabel || (hasMaxActions && maxButtonPosition === "top-right")) && "cursor-pointer"
              )}
              onClick={handleTopRightClick}
            >
              {maxActionsProps && maxButtonPosition === "top-right" && (
                <MaxActions className="-my-4" {...maxActionsProps} />
              )}
              {topRightLabel && <span className="text-typography-secondary">{topRightLabel}:</span>}
              {topRightValue && <span className="numbers">{topRightValue}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={inputValue}
              className="text-body-large h-28 w-full min-w-0 p-0 outline-none"
              inputRef={inputRef}
              onValueChange={onUserInput}
              onFocus={handleOnFocus}
              onBlur={handleOnBlur}
              placeholder={placeholder}
              qa={qa ? qa + "-input" : undefined}
              isDisabled={isDisabled}
              maxDecimals={maxDecimals}
            />

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

          <div className="shrink-0 text-20 leading-1 tracking-wide">{children}</div>
        </div>

        {(bottomLeftValue || bottomRightValue || (hasMaxActions && maxButtonPosition === "bottom-right")) && (
          <div className="flex justify-between">
            <div
              className={cx("numbers", {
                "text-typography-secondary": isBottomLeftValueMuted,
                "text-typography-primary": !isBottomLeftValueMuted,
              })}
            >
              {bottomLeftValue || ""}
            </div>
            <div
              className={cx(
                "flex items-center gap-4",
                (onClickBottomRightLabel || (hasMaxActions && maxButtonPosition === "bottom-right")) && "cursor-pointer"
              )}
              onClick={handleBottomRightClick}
            >
              {maxActionsProps && maxButtonPosition === "bottom-right" && (
                <MaxActions className="-my-4" {...maxActionsProps} />
              )}
              {bottomRightLabel && <span className="text-typography-secondary">{bottomRightLabel}:</span>}
              {bottomRightValue && <span className="numbers">{bottomRightValue}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
