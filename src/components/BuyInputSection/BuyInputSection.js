import React from "react";
import cx from "classnames";
import "./BuyInputSection.css";
import { Trans } from "@lingui/macro";

export default function BuyInputSection(props) {
  const {
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
  } = props;

  return (
    <div className="Exchange-swap-section buy-input">
      <div className="Exchange-swap-section-top">
        <div className="muted">
          {topLeftLabel}: {balance}
        </div>
        <div className={cx("align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          <span className="Exchange-swap-label muted">{topRightLabel}</span>&nbsp;
          <span className="Exchange-swap-balance">
            {tokenBalance} {/*(selectedToken && selectedToken.symbol) || defaultTokenName*/}
          </span>
        </div>
      </div>
      <div className="Exchange-swap-section-bottom">
        <div className="Exchange-swap-input-container">
          {!staticInput && (
            <input
              type="number"
              min="0"
              placeholder="0.0"
              className="Exchange-swap-input"
              value={inputValue}
              onChange={onInputValueChange}
            />
          )}
          {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
          {showMaxButton && (
            <div className="Exchange-swap-max" onClick={onClickMax}>
              <Trans>MAX</Trans>
            </div>
          )}
        </div>
        <div className="PositionEditor-token-symbol">{props.children}</div>
      </div>
    </div>
  );
}
