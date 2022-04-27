import React, { useState, useMemo } from "react";
import { BsArrowRight } from "react-icons/bs";

import {
  PRECISION,
  USD_DECIMALS,
  SWAP,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  MIN_PROFIT_TIME,
  DECREASE,
  INCREASE,
  useChainId,
  getTokenInfo,
  isTriggerRatioInverted,
  bigNumberify,
  formatAmountFree,
  parseValue,
  getNextToAmount,
  getExchangeRate,
  formatAmount,
  getExchangeRateDisplay,
  calculatePositionDelta,
  getLiquidationPrice,
  formatDateTime,
  getDeltaStr,
  getProfitPrice,
  getTimeRemaining,
} from "../../Helpers";
import { updateSwapOrder, updateIncreaseOrder, updateDecreaseOrder } from "../../Api";
import Modal from "../Modal/Modal";
import ExchangeInfoRow from "./ExchangeInfoRow";
import { getContract } from "../../Addresses";
import { useTranslation } from 'react-i18next';

export default function OrderEditor(props) {
  const {
    account,
    order,
    setEditingOrder,
    infoTokens,
    pendingTxns,
    setPendingTxns,
    library,
    totalTokenWeights,
    usdgSupply,
    getPositionForOrder,
    positionsMap,
  } = props;
  const { t } = useTranslation();

  const { chainId } = useChainId();

  const position = order.type !== SWAP ? getPositionForOrder(account, order, positionsMap) : null;
  const liquidationPrice = order.type === DECREASE && position ? getLiquidationPrice(position) : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const fromTokenInfo = order.type === SWAP ? getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress) : null;
  const toTokenInfo =
    order.type === SWAP
      ? getTokenInfo(infoTokens, order.path[order.path.length - 1], order.shouldUnwrap, nativeTokenAddress)
      : null;

  const triggerRatioInverted = useMemo(() => {
    if (order.type !== SWAP) {
      return null;
    }

    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo, order.type]);

  let initialRatio = 0;
  if (order.triggerRatio) {
    initialRatio = triggerRatioInverted ? PRECISION.mul(PRECISION).div(order.triggerRatio) : order.triggerRatio;
  }
  const [triggerRatioValue, setTriggerRatioValue] = useState(formatAmountFree(initialRatio, USD_DECIMALS, 6));

  const [triggerPriceValue, setTriggerPriceValue] = useState(formatAmountFree(order.triggerPrice, USD_DECIMALS, 4));
  const triggerPrice = useMemo(() => {
    return triggerPriceValue ? parseValue(triggerPriceValue, USD_DECIMALS) : 0;
  }, [triggerPriceValue]);

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return bigNumberify(0);
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (triggerRatioInverted) {
      ratio = PRECISION.mul(PRECISION).div(ratio);
    }
    return ratio;
  }, [triggerRatioValue, triggerRatioInverted]);

  const indexTokenMarkPrice = useMemo(() => {
    if (order.type === SWAP) {
      return;
    }
    const toTokenInfo = getTokenInfo(infoTokens, order.indexToken);
    return order.isLong ? toTokenInfo.maxPrice : toTokenInfo.minPrice;
  }, [infoTokens, order]);

  let toAmount;
  if (order.type === SWAP) {
    const { amount } = getNextToAmount(
      chainId,
      order.amountIn,
      order.path[0],
      order.path[order.path.length - 1],
      infoTokens,
      undefined,
      triggerRatio,
      usdgSupply,
      totalTokenWeights
    );
    toAmount = amount;
  }

  const onClickPrimary = () => {
    setIsSubmitting(true);

    let func;
    let params;

    if (order.type === SWAP) {
      func = updateSwapOrder;
      params = [chainId, library, order.index, toAmount, triggerRatio, order.triggerAboveThreshold];
    } else if (order.type === DECREASE) {
      func = updateDecreaseOrder;
      params = [
        chainId,
        library,
        order.index,
        order.collateralDelta,
        order.sizeDelta,
        triggerPrice,
        order.triggerAboveThreshold,
      ];
    } else if (order.type === INCREASE) {
      func = updateIncreaseOrder;
      params = [chainId, library, order.index, order.sizeDelta, triggerPrice, order.triggerAboveThreshold];
    }

    params.push({
      successMsg: t("exchange.Order_updated"),
      failMsg: t("exchange.Order_update_failed"),
      sentMsg: t("exchange.Order_update_submitted"),
      pendingTxns,
      setPendingTxns,
    });

    return func(...params)
      .then(() => {
        setEditingOrder(null);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onTriggerRatioChange = (evt) => {
    setTriggerRatioValue(evt.target.value || "");
  };

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const getError = () => {
    if ((!triggerRatio || triggerRatio.eq(0)) && (!triggerPrice || triggerPrice.eq(0))) {
      return t("exchange.Enter_Price");
    }
    if (order.type === SWAP && triggerRatio.eq(order.triggerRatio)) {
      return t("exchange.Enter_new_Price");
    }
    if (order.type !== SWAP && triggerPrice.eq(order.triggerPrice)) {
      return t("exchange.Enter_new_Price");
    }
    if (position) {
      if (order.type === DECREASE) {
        if (position.isLong && triggerPrice.lte(liquidationPrice)) {
          return t("exchange.Price_below_Liq_Price");
        }
        if (!position.isLong && triggerPrice.gte(liquidationPrice)) {
          return t("exchange.Price_above_Liq_Price");
        }
      }

      const { delta, hasProfit } = calculatePositionDelta(triggerPrice, position);
      if (hasProfit && delta.eq(0)) {
        return t("exchange.Invalid_price_see_warning");
      }
    }

    if (order.type !== SWAP && indexTokenMarkPrice) {
      if (order.triggerAboveThreshold && indexTokenMarkPrice.gt(triggerPrice)) {
        return t("exchange.Price_below_Mark_Price");
      }
      if (!order.triggerAboveThreshold && indexTokenMarkPrice.lt(triggerPrice)) {
        return t("exchange.Price_above_Mark_Price");
      }
    }

    if (order.type === SWAP) {
      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && !currentRate.gte(triggerRatio)) {
        return t("exchange.Price_is_triggerRatioInverted_Mark_Price", { triggerRatioInverted: triggerRatioInverted ? "below" : "above" });
      }
    }
  };

  const renderMinProfitWarning = () => {
    if (MIN_PROFIT_TIME === 0 || order.type === SWAP || !position || !triggerPrice || triggerPrice.eq(0)) {
      return null;
    }

    const { delta, pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(triggerPrice, position);
    if (hasProfit && delta.eq(0)) {
      const { deltaStr } = getDeltaStr({
        delta: pendingDelta,
        deltaPercentage: pendingDeltaPercentage,
        hasProfit,
      });
      const profitPrice = getProfitPrice(triggerPrice, position);
      const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME;
      return (
        <div className="Confirmation-box-warning">
          <div dangerouslySetInnerHTML={
            { __html: t("exchange.confirmation_box_warning6", {
              existingPosition: deltaStr
            }) }
          }></div>
          {t("exchange.Profit_price")}: {position.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}. {t("exchange.This_rule_only_applies_for_the_next_time", { time: getTimeRemaining(minProfitExpiration), until: formatDateTime(minProfitExpiration) })}
        </div>
      );
    }
  };

  const isPrimaryEnabled = () => {
    if (isSubmitting) {
      return false;
    }
    const error = getError();
    if (error) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }

    if (isSubmitting) {
      return t("exchange.Updating_Order");
    }
    return t("exchange.Update_Order");
  };

  if (order.type !== SWAP) {
    const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
    return (
      <Modal
        isVisible={true}
        className="Exchange-list-modal"
        setIsVisible={() => setEditingOrder(null)}
        label={t("exchange.Edit_order")}
      >
        {renderMinProfitWarning()}
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">{t("exchange.Price")}</div>
            <div
              className="muted align-right clickable"
              onClick={() => {
                setTriggerPriceValue(formatAmountFree(indexTokenMarkPrice, USD_DECIMALS, 2));
              }}
            >
              {t("exchange.Mark")}: {formatAmount(indexTokenMarkPrice, USD_DECIMALS, 2)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div className="Exchange-swap-input-container">
              <input
                type="number"
                min="0"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={triggerPriceValue}
                onChange={onTriggerPriceChange}
              />
            </div>
            <div className="PositionEditor-token-symbol">USD</div>
          </div>
        </div>
        <ExchangeInfoRow label={t("exchange.Price")}>
          {triggerPrice && !triggerPrice.eq(order.triggerPrice) ? (
            <>
              <span className="muted">
                {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </span>
              &nbsp;
              <BsArrowRight />
              &nbsp;
              {triggerPricePrefix} {formatAmount(triggerPrice, USD_DECIMALS, 2, true)}
            </>
          ) : (
            <span>
              {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
            </span>
          )}
        </ExchangeInfoRow>
        {liquidationPrice && (
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{t("exchange.Liq_Price")}</div>
            <div className="align-right">{`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <button
            className="App-cta Exchange-swap-button Exchange-list-modal-button"
            onClick={onClickPrimary}
            disabled={!isPrimaryEnabled()}
          >
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isVisible={true}
      className="Exchange-list-modal"
      setIsVisible={() => setEditingOrder(null)}
      label={t("exchange.Edit_order")}
    >
      <div className="Exchange-swap-section">
        <div className="Exchange-swap-section-top">
          <div className="muted">{t("exchange.Price")}</div>
          {fromTokenInfo && toTokenInfo && (
            <div
              className="muted align-right clickable"
              onClick={() => {
                setTriggerRatioValue(
                  formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10)
                );
              }}
            >
              {t("exchange.Mark_Price")}:{" "}
              {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 2)}
            </div>
          )}
        </div>
        <div className="Exchange-swap-section-bottom">
          <div className="Exchange-swap-input-container">
            <input
              type="number"
              min="0"
              placeholder="0.0"
              className="Exchange-swap-input"
              value={triggerRatioValue}
              onChange={onTriggerRatioChange}
            />
          </div>
          {(() => {
            if (!toTokenInfo) return;
            if (!fromTokenInfo) return;
            const [tokenA, tokenB] = triggerRatioInverted ? [toTokenInfo, fromTokenInfo] : [fromTokenInfo, toTokenInfo];
            return (
              <div className="PositionEditor-token-symbol">
                {tokenA.symbol}&nbsp;/&nbsp;{tokenB.symbol}
              </div>
            );
          })()}
        </div>
      </div>
      <ExchangeInfoRow label={t("exchange.Minimum_received")}>
        {triggerRatio && !triggerRatio.eq(order.triggerRatio) ? (
          <>
            <span className="muted">{formatAmount(order.minOut, toTokenInfo.decimals, 4, true)}</span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {formatAmount(toAmount, toTokenInfo.decimals, 4, true)}
          </>
        ) : (
          formatAmount(order.minOut, toTokenInfo.decimals, 4, true)
        )}
        &nbsp;{toTokenInfo.symbol}
      </ExchangeInfoRow>
      <ExchangeInfoRow label={t("exchange.Price")}>
        {triggerRatio && !triggerRatio.eq(0) && !triggerRatio.eq(order.triggerRatio) ? (
          <>
            <span className="muted">
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
                omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
              })}
            </span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
          </>
        ) : (
          getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
            omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
          })
        )}
      </ExchangeInfoRow>
      {fromTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">{fromTokenInfo.symbol} {t("exchange.price")}</div>
          <div className="align-right">{formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      {toTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">{toTokenInfo.symbol} {t("exchange.price")}</div>
          <div className="align-right">{formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      <div className="Exchange-swap-button-container">
        <button
          className="App-cta Exchange-swap-button Exchange-list-modal-button"
          onClick={onClickPrimary}
          disabled={!isPrimaryEnabled()}
        >
          {getPrimaryText()}
        </button>
      </div>
    </Modal>
  );
}
