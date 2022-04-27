import React, { useState } from "react";

import Modal from "../Modal/Modal";
import Checkbox from "../Checkbox/Checkbox";

import "./OrdersToa.css";
import { useTranslation } from 'react-i18next';

export default function OrdersToa(props) {
  const { t } = useTranslation();
  const { setIsVisible, isPluginApproving, approveOrderBook } = props;

  const [isChecked, setIsChecked] = useState(false);

  const onConfirmationClick = () => {
    approveOrderBook().then(() => {
      setIsVisible(false);
    });
  };

  const getPrimaryText = () => {
    if (isPluginApproving) {
      return t("exchange.Enabling_Orders");
    }
    if (!isChecked) {
      return t("exchange.Accept_terms_to_enable_orders");
    }
    return t("exchange.Enable_Orders");
  };

  const isPrimaryEnabled = () => {
    if (isPluginApproving) {
      return false;
    }
    return isChecked;
  };

  return (
    <Modal setIsVisible={setIsVisible} isVisible={true} label="Enable Orders" className="Orders-toa" zIndex="1000">
      {t("exchange.Note_that_orders_are_not_guaranteed_to_be_executed")}
      <br />
      <br />
      {t("exchange.This_can_occur_in_a_few_situations_including_but_not_exclusive_to")}:
      <br />
      <ul>
        <li>{t("exchange.Insufficient_liquidity_to_execute_the_order")}</li>
        <li>{t("exchange.The_mark_price_which_is_an_aggregate_of_exchange_prices_did_not_reach_the_specified_price")}</li>
        <li>{t("exchange.The_specified_price_was_reached_but_not_long_enough_for_it_to_be_executed")}</li>
        <li>{t("exchange.No_keeper_picked_up_the_order_for_execution")}</li>
      </ul>
      <div>{t("exchange.Additionally_trigger_orders_are_market_orders_and_are_not_guaranteed_to_settle_at_the_trigger_price")}</div>
      <br />
      <div className="Orders-toa-accept-rules">
        <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
          <span className="muted">
            {t("exchange.Accept_that_orders_are_not_guaranteed_to_execute_and_trigger_orders_may_not_settle_at_the_trigger_price")}
          </span>
        </Checkbox>
      </div>
      <button disabled={!isPrimaryEnabled()} className="App-cta Confirmation-box-button" onClick={onConfirmationClick}>
        {getPrimaryText()}
      </button>
    </Modal>
  );
}
