import React, { useState } from "react";

import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

import "./OrdersToa.css";

export default function OrdersToa(props) {
  const { setIsVisible, isPluginApproving, approveOrderBook } = props;

  const [isChecked, setIsChecked] = useState(false);

  const onConfirmationClick = () => {
    approveOrderBook().then(() => {
      setIsVisible(false);
    });
  };

  const getPrimaryText = () => {
    if (isPluginApproving) {
      return "Enabling Orders...";
    }
    if (!isChecked) {
      return "Accept terms to enable orders";
    }
    return "Enable Orders";
  };

  const isPrimaryEnabled = () => {
    if (isPluginApproving) {
      return false;
    }
    return isChecked;
  };

  return (
    <Modal setIsVisible={setIsVisible} isVisible={true} label="Enable Orders" className="Orders-toa" zIndex="1000">
      Note that orders are not guaranteed to be executed.
      <br />
      <br />
      This can occur in a few situations including but not exclusive to:
      <br />
      <ul>
        <li>Insufficient liquidity to execute the order</li>
        <li>The mark price which is an aggregate of exchange prices did not reach the specified price</li>
        <li>The specified price was reached but not long enough for it to be executed</li>
        <li>No keeper picked up the order for execution</li>
      </ul>
      <div>Additionally, trigger orders are market orders and are not guaranteed to settle at the trigger price.</div>
      <br />
      <div className="Orders-toa-accept-rules">
        <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
          <span className="muted">
            Accept that orders are not guaranteed to execute and trigger orders may not settle at the trigger price
          </span>
        </Checkbox>
      </div>
      <button disabled={!isPrimaryEnabled()} className="App-cta Confirmation-box-button" onClick={onConfirmationClick}>
        {getPrimaryText()}
      </button>
    </Modal>
  );
}
