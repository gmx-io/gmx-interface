import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";

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
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const seperator = ":";

  function handleBoxClick() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  return (
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
              onFocus={onFocus}
              onBlur={onBlur}
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
  );
}
