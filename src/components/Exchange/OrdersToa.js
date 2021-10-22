import React, { useState } from 'react'

import Modal from '../Modal/Modal'
import Checkbox from '../Checkbox/Checkbox'

import "./OrdersToa.css"

export default function OrdersToa(props) {
  const {
    setIsVisible,
    isPluginApproving,
    approveOrderBook
  } = props

  const [isChecked, setIsChecked] = useState(false)

  const onConfirmationClick = () => {
    approveOrderBook().then(() => {
      setIsVisible(false)
    })
  }

  const getPrimaryText = () => {
    if (isPluginApproving) { return "Enabling Orders..." }
    if (!isChecked) { return "Accept terms to enable orders" }
    return "Enable Orders"
  }

  const isPrimaryEnabled = () => {
    if (isPluginApproving) { return false }
    return isChecked
  }

  return <Modal setIsVisible={setIsVisible} isVisible={true} label="Enable Orders" className="Orders-toa" zIndex="30">
    Note that orders may not execute if there is insufficient liquidity.<br/>
    <br/>
    Additionally, since the mark price is based on an aggregate of exchanges, an order may not execute even if the specified price was reached on another exchange.
    <div className="Orders-toa-accept-rules">
      <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
        <span className="muted">Accept that orders are not guaranteed to&nbsp;execute</span>
      </Checkbox>
    </div>
    <button
      disabled={!isPrimaryEnabled()}
      className="App-cta Confirmation-box-button"
      onClick={onConfirmationClick}
    >{getPrimaryText()}</button>
  </Modal>
}
