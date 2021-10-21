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
    if (!isChecked) { return "Accept terms to enable Orders" }
    return "Enable Orders"
  }

  const isPrimaryEnabled = () => {
    if (isPluginApproving) { return false }
    return isChecked
  }

  return <Modal setIsVisible={setIsVisible} isVisible={true} label="Enable Orders" className="Orders-toa" zIndex="30">
    Orders are in beta and are not guaranteed to execute. Additionally if there is insufficient liquidity to execute an order it will not be executed even if price conditions are met
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