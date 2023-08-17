import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent, useState } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";
import { POSITION_CLOSE_SUGGESTION_LISTS } from "config/ui";

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
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seperator = ":";

  function handleOnFocus() {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(true);
    }
    onFocus?.();
  }

  function handleOnBlur() {
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(false);
    }
    onBlur?.();
  }

  function handleBoxClick() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  return (
    <div>
      <div className="Exchange-swap-section buy-input" onClick={handleBoxClick}>
        <div className="buy-input-top-row">
          <div className="text-gray">
            {topLeftLabel}
            {topLeftValue && `${seperator} ${topLeftValue}`}
          </div>
          <div className={cx("align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
            <span className="text-gray">{topRightLabel}</span>
            {topRightValue && (
              <span className="Exchange-swap-label">
                {topRightLabel ? seperator : ""}&nbsp;{topRightValue}
              </span>
            )}
          </div>
        </div>
        <div className="Exchange-swap-section-bottom">
          <div className="Exchange-swap-input-container">
            {!staticInput && (
              <input
                type="number"
                min="0"
                placeholder="0.0"
                step="any"
                className="Exchange-swap-input"
                value={inputValue}
                onChange={onInputValueChange}
                ref={inputRef}
                onFocus={handleOnFocus}
                onBlur={handleOnBlur}
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
          {POSITION_CLOSE_SUGGESTION_LISTS.map((percentage) => (
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
