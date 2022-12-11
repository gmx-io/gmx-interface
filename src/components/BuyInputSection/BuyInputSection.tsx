import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, ReactNode } from "react";
import "./BuyInputSection.css";

type Props = {
  topLeftLabel: string;
  topRightLabel: string;
  onClickTopRightLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onClickMax?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showMaxButton?: boolean;
  staticInput?: boolean;
  balance: string;
  tokenBalance: string;
  children?: ReactNode;
};

export default function BuyInputSection(props: Props) {
  const {
    topLeftLabel,
    topRightLabel,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onClickMax,
    onFocus,
    onBlur,
    showMaxButton,
    staticInput,
    balance,
    tokenBalance,
    children,
  } = props;

  return (
    <div className="Exchange-swap-section buy-input">
      <div className="Exchange-swap-section-top">
        <div className="muted">
          {topLeftLabel}: {balance}
        </div>
        <div className={cx("align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          <span className="Exchange-swap-label muted">{topRightLabel}</span>&nbsp;
          <span className="Exchange-swap-balance">{tokenBalance}</span>
        </div>
      </div>
      <label className="Exchange-swap-section-bottom">
        <div className="Exchange-swap-input-container">
          {!staticInput && (
            <input
              type="number"
              min="0"
              placeholder="0.0"
              className="Exchange-swap-input"
              value={inputValue}
              onChange={onInputValueChange}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          )}
          {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
          {showMaxButton && (
            <div
              className="Exchange-swap-max"
              onClick={() => {
                if (onFocus) onFocus();
                if (onClickMax) onClickMax();
              }}
            >
              <Trans>MAX</Trans>
            </div>
          )}
        </div>
        <div className="PositionEditor-token-symbol">{children}</div>
      </label>
    </div>
  );
}
