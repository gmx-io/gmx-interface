import React from 'react'
import cx from "classnames";

import "./BuyInputSection.css"

export default function BuyInputSection(props) {
  const { topLeftLabel, topRightLabel, onClickTopRightLabel,
    inputValue, onInputValueChange, onClickMax, showMaxButton, staticInput, hightlight, selectedToken, balance, tokenBalance, defaultTokenName } = props

  return (
    <div className={cx(hightlight && "highlighted", "buy-input Exchange-swap-section")}>
      <div className="Exchange-swap-section-top">
        <div className="Exchange-swap-label">
          {topLeftLabel}
        </div>
        <div className="Exchange-swap-balance-select">
          <div className={cx("Exchange-swap-token-balance-block", "align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
          <span className="Exchange-swap-label">{topRightLabel}</span>&nbsp;<span className="Exchange-swap-balance">{tokenBalance} {(selectedToken && selectedToken.symbol) || defaultTokenName}</span>
          </div>
          {showMaxButton && <div className="Exchange-swap-max-btn" onClick={onClickMax}>
            MAX
          </div>}
        </div>
      </div>
      <div className="Exchange-swap-section-bottom middle">
        <div className="PositionEditor-token-symbol">
          {props.children}
        </div>
        <div className="Exchange-swap-input-container">
          {!staticInput && <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={inputValue} onChange={onInputValueChange} />}
          {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
          <span className="Exchange-swap-selected-token-symbol">&nbsp;{(selectedToken && selectedToken.symbol) || defaultTokenName}</span>
        </div>
      </div>
      <div className="Exchange-swap-section-bottom">
        <span className="Exchange-swap-label">{(selectedToken && selectedToken.name) || defaultTokenName}</span>
        <span className="Exchange-swap-selected-token-balance">{ balance }</span>
      </div>
    </div>
  )
}
