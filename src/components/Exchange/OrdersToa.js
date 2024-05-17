import React, { useState } from "react";
import { Trans, t } from "@lingui/macro";
import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

import "./OrdersToa.css";
import Button from "components/Button/Button";

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
      return t`Enabling Orders...`;
    }
    if (!isChecked) {
      return t`Accept terms to enable orders`;
    }
    return t`Enable Orders`;
  };

  const isPrimaryEnabled = () => {
    if (isPluginApproving) {
      return false;
    }
    return isChecked;
  };

  return (
    <Modal
      setIsVisible={setIsVisible}
      isVisible={true}
      label={t`Enable Orders`}
      className="Orders-toa Modal-scrollable"
      zIndex="1002"
    >
      <Trans>
        Note that orders are not guaranteed to be executed.
        <br />
        <br />
        This can occur in a few situations including but not exclusive to:
      </Trans>
      <br />
      <ul>
        <Trans>
          <li>Insufficient liquidity to execute the order</li>
          <li>The mark price which is an aggregate of exchange prices did not reach the specified price</li>
          <li>The specified price was reached but not long enough for it to be executed</li>
          <li>No keeper picked up the order for execution</li>
        </Trans>
      </ul>
      <div>
        <Trans>
          Additionally, trigger orders are market orders and are not guaranteed to settle at the trigger price.
        </Trans>
      </div>
      <br />
      <div className="Orders-toa-accept-rules">
        <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
          <span className="muted">
            <Trans>
              Accept that orders are not guaranteed to execute and trigger orders may not settle at the trigger price
            </Trans>
          </span>
        </Checkbox>
      </div>
      <Button
        variant="primary-action"
        disabled={!isPrimaryEnabled()}
        className="mt-15 w-full"
        onClick={onConfirmationClick}
      >
        {getPrimaryText()}
      </Button>
    </Modal>
  );
}
