import React from 'react'
import cx from "classnames";

import "./BuyInputSection.css"

export default function BuyInputSection(props) {
  const { topLeftLabel, topRightLabel, onClickTopRightLabel,
    inputValue, onInputValueChange, onClickMax, showMaxButton, staticInput, hightlight } = props

  return (
    <div className={cx(hightlight && "highlighted", "buy-input Exchange-swap-section")}>
      <div className="Exchange-swap-section-top">
        <div className="muted">
          {topLeftLabel}
        </div>
        <div className="Exchange-swap-balance-select">
          <div className={cx("muted", "align-right", { clickable: onClickTopRightLabel })} onClick={onClickTopRightLabel}>
            {topRightLabel}
          </div>
          {showMaxButton && <div className="Exchange-swap-max-btn" onClick={onClickMax}>
            MAX
          </div>}
        </div>
      </div>
      <div className="Exchange-swap-section-bottom">
        <div className="Exchange-swap-input-container">
          {!staticInput && <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={inputValue} onChange={onInputValueChange} />}
          {staticInput && <div className="InputSection-static-input">{inputValue}</div>}
        </div>
        <div className="PositionEditor-token-symbol">
          {props.children}
        </div>
      </div>
    </div>
  )
}
