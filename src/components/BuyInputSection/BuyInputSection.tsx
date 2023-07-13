import "./BuyInputSection.scss";
import React, { useRef, ReactNode, ChangeEvent } from "react";
import cx from "classnames";
import { Trans } from "@lingui/macro";

function escapeSpecialRegExpChars(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

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

  function onUserInput(e) {
    if (onInputValueChange) {
      // Replace comma with dot
      let newValue = e.target.value.replace(/,/g, ".");
      if (newValue === ".") {
        newValue = "0.";
      }

      if (newValue === "" || inputRegex.test(escapeSpecialRegExpChars(newValue))) {
        e.target.value = newValue;
        onInputValueChange(e);
      }
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
              inputMode="decimal"
              placeholder="0.0"
              className="Exchange-swap-input"
              type="text"
              value={inputValue}
              onChange={onUserInput}
              autoComplete="off"
              autoCorrect="off"
              minLength={1}
              maxLength={15}
              spellCheck="false"
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
