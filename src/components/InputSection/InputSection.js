import React from "react";
import cx from "classnames";
import "./InputSection.css";
import { Trans } from "@lingui/macro";

export default function InputSection(props) {
  const {
    topLeftLabel,
    topRightLabel,
    onClickTopRightLabel,
    inputValue,
    onInputValueChange,
    onClickMax,
    showMaxButton,
    staticInput,
  } = props;

  return (
    <div className="Exchange-swap-section">
      <div className="Exchange-swap-section-top">
        <div className="muted">{topLeftLabel}</div>
        <div className={cx("muted", "align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          {topRightLabel}
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
            <button className="Exchange-swap-max" onClick={onClickMax}>
              <Trans>MAX</Trans>
            </button>
          )}
        </div>
        <div className="PositionEditor-token-symbol">{props.children}</div>
      </div>
    </div>
  );
}
