import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";

type Props = {
  topLeftLabel: string;
  topRightLabel: string;
  inputValue: string | number;
  showMaxButton: boolean;
  staticInput: boolean;
  children: ReactNode;
  balance?: string | number;
  tokenBalance?: string | number;
  onClickMax?: () => void;
  onInputValueChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onClickTopRightLabel?: () => void;
};

export default function BuyInputSection({
  topLeftLabel,
  topRightLabel,
  onClickTopRightLabel,
  inputValue,
  onInputValueChange,
  onClickMax,
  showMaxButton,
  staticInput,
  balance,
  tokenBalance,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

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
          {balance && `: ${balance}`}
        </div>
        <div className={cx("align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          <span className="text-gray">{topRightLabel}</span>
          {tokenBalance && <span className="Exchange-swap-label">:&nbsp;{tokenBalance}</span>}
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
