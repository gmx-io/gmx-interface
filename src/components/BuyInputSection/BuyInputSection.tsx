import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent, useState } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import { INPUT_LABEL_SEPARATOR, PERCENTAGE_SUGGESTIONS } from "config/ui";
import NumberInput from "components/NumberInput/NumberInput";

type Props = {
  topLeftLabel: string;
  topLeftValue?: string;
  topRightLabel?: string;
  topRightValue?: string;
  onClickTopRightLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onClickMax?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showMaxButton?: boolean;
  staticInput?: boolean;
  children?: ReactNode;
  showPercentSelector?: boolean;
  onPercentChange?: (percentage: number) => void;
  preventFocusOnLabelClick?: "left" | "right" | "both";
};

export default function BuyInputSection(props: Props) {
  const {
    topLeftLabel,
    topLeftValue,
    topRightLabel,
    topRightValue,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onClickMax,
    onFocus,
    onBlur,
    showMaxButton,
    staticInput,
    children,
    showPercentSelector,
    onPercentChange,
    preventFocusOnLabelClick,
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOnFocus() {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(true);
    }
    if (onFocus) onFocus();
  }

  function handleOnBlur() {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(false);
    }
    if (onBlur) onBlur();
  }

  function handleBoxClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const labelElement = target.closest("[data-label]");
    const labelClicked = labelElement ? labelElement.getAttribute("data-label") : null;

    const shouldPreventFocus = preventFocusOnLabelClick === labelClicked || preventFocusOnLabelClick === "both";
    const isMaxButtonClicked = target.classList.contains("Exchange-swap-max");

    if (!shouldPreventFocus && !isMaxButtonClicked && inputRef.current) {
      inputRef.current.focus();
    }
  }

  function onUserInput(e) {
    if (onInputValueChange) {
      onInputValueChange(e);
    }
  }

  return (
    <div>
      <div className="Exchange-swap-section buy-input" onClick={handleBoxClick}>
        <div className="buy-input-top-row">
          <div data-label="left" className="text-gray-300">
            {topLeftLabel}
            {topLeftValue && `${INPUT_LABEL_SEPARATOR} ${topLeftValue}`}
          </div>
          <div
            data-label="right"
            className={cx("align-right", { clickable: onClickTopRightLabel })}
            onClick={onClickTopRightLabel}
          >
            <span className="text-gray-300">{topRightLabel}</span>
            {topRightValue && (
              <span className="Exchange-swap-label">
                {topRightLabel ? INPUT_LABEL_SEPARATOR : ""}&nbsp;{topRightValue}
              </span>
            )}
          </div>
        </div>
        <div className="Exchange-swap-section-bottom">
          <div className="Exchange-swap-input-container">
            {!staticInput && (
              <NumberInput
                value={inputValue}
                className="Exchange-swap-input"
                inputRef={inputRef}
                onValueChange={onUserInput}
                onFocus={handleOnFocus}
                onBlur={handleOnBlur}
                placeholder="0.0"
              />
            )}
            {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
            {showMaxButton && (
              <button type="button" className="Exchange-swap-max" onClick={onClickMax}>
                <Trans>MAX</Trans>
              </button>
            )}
          </div>
          <div className="PositionEditor-token-symbol">{children}</div>
        </div>
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
            >
              {percentage}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
