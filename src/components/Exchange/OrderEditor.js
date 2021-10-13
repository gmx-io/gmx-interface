import React, { useState, useMemo } from "react"
import { BsArrowRight } from 'react-icons/bs'

import {
  PRECISION,
  USD_DECIMALS,
  SWAP,
  LONG,
  STOP,
  LIMIT,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  useChainId,
  getTokenInfo,
  isTriggerRatioInverted,
  bigNumberify,
  formatAmountFree,
  parseValue,
  getNextToAmount,
  getExchangeRate,
  formatAmount,
  getExchangeRateDisplay
} from "../../Helpers"
import Modal from '../Modal/Modal'
import ExchangeInfoRow from './ExchangeInfoRow'

export default function OrderEditor(props) {
  const {
    order,
    setEditingOrder,
    infoTokens,
    updateSwapOrder,
    updateIncreaseOrder,
    updateDecreaseOrder,
    pendingTxns,
    setPendingTxns,
    updateOrders,
    library,
    totalTokenWeights,
    usdgSupply
  } = props;

  const { chainId } = useChainId()

  const {
    fromTokenAddress,
    toTokenAddress,
    swapOption
  } = order;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress)
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress)

  const triggerRatioInverted = useMemo(() => {
    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo)
  }, [toTokenInfo, fromTokenInfo])

  let initialRatio = 0;
  if (order.triggerRatio) {
    initialRatio = triggerRatioInverted
      ? PRECISION.mul(PRECISION).div(order.triggerRatio)
      : order.triggerRatio
  }
  const [triggerRatioValue, setTriggerRatioValue] = useState(formatAmountFree(initialRatio, USD_DECIMALS, 6));

  const [triggerPriceValue, setTriggerPriceValue] = useState(formatAmountFree(order.triggerPrice, USD_DECIMALS, 4));
  const triggerPrice = useMemo(() => {
    return triggerPriceValue ? parseValue(triggerPriceValue, USD_DECIMALS) : 0
  }, [triggerPriceValue])


  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return bigNumberify(0)
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS)
    if (triggerRatioInverted) {
      ratio = PRECISION.mul(PRECISION).div(ratio)
    }
    return ratio
  }, [triggerRatioValue, triggerRatioInverted])

  const indexTokenEntryMarkPrice = useMemo(() => {
    if (order.swapOption === SWAP) {
      return;
    }
    const toTokenInfo = getTokenInfo(infoTokens, order.indexToken)
    return order.swapOption === LONG ? toTokenInfo.maxPrice : toTokenInfo.minPrice
  }, [infoTokens, order])

  const { amount: toAmount } = getNextToAmount(
    chainId,
    order.amountIn,
    order.fromTokenAddress,
    order.toTokenAddress,
    infoTokens,
    undefined,
    triggerRatio,
    usdgSupply,
    totalTokenWeights
  )

  const onClickPrimary = () => {
    setIsSubmitting(true);

    let func;
    let params;

    if (order.swapOption === SWAP) {
      func = updateSwapOrder;
      params = [chainId, library, order.index, toAmount, triggerRatio, order.triggerAboveThreshold];
    } else if (order.orderType === STOP) {
      func = updateDecreaseOrder;
      params = [chainId, library, order.index, order.collateralDelta, order.sizeDelta, triggerPrice, order.triggerAboveThreshold];
    } else if (order.orderType === LIMIT) {
      func = updateIncreaseOrder;
      params = [chainId, library, order.index, order.sizeDelta, triggerPrice, order.triggerAboveThreshold];
    }

    params.push({
      successMsg: "Order updated!",
      failMsg: "Order update failed",
      sentMsg: "Order update submitted",
      pendingTxns,
      setPendingTxns
    })

    return func(...params).then(() => {
      setEditingOrder(null);
      updateOrders(undefined, true);
    }).finally(() => {
      setIsSubmitting(false);
    })
  }

  const isPrimaryEnabled = () => {
    if (isSubmitting) { return false }
    if (order.swapOption === SWAP) { return !!triggerRatio && !triggerRatio.eq(order.triggerRatio) }
    return !!triggerPrice && !triggerPrice.eq(order.triggerPrice)
  }

  const onTriggerRatioChange = evt => {
    setTriggerRatioValue(evt.target.value || '')
  }

  const onTriggerPriceChange = evt => {
    setTriggerPriceValue(evt.target.value || '')
  }

  const getPrimaryText = () => {
    if (isSubmitting) {
      return "Updating Order...";
    }
    if (!triggerRatio && !triggerPrice) {
      return "Enter Price";
    }
    if (order.swapOption === SWAP && triggerRatio.eq(order.triggerRatio)) {
      return "Enter Price";
    }
    if (order.swapOption !== SWAP && triggerPrice.eq(order.triggerPrice)) {
      return "Enter Price";
    }
    return "Update Order";
  }

  function renderTriggerPriceWarning() {
    if (swapOption === SWAP || !indexTokenEntryMarkPrice) {
      return null;
    }

    // mul or div by 0.99999 to avoid unnecessary warnings wher users clicks "Mark Price"
    if (!triggerPrice
      || (order.triggerAboveThreshold && indexTokenEntryMarkPrice.lte(triggerPrice.mul(100000).div(99999)))
      || (!order.triggerAboveThreshold && indexTokenEntryMarkPrice.gte(triggerPrice.mul(99999).div(100000)))
    ) {
      return null;
    }

    return (
      <div className="Confirmation-box-warning">
        WARNING: Trigger Price is {order.triggerAboveThreshold ? "lower" : "higher"} then Mark Price and order will be executed immediatelly
      </div>
    );
  }

  function renderTriggerRatioWarning() {
    if (swapOption !== SWAP) {
      return null;
    }
    const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
    // mul or div by 0.99999 to avoid unnecessary warnings wher users clicks "Mark Price"
    if (!currentRate.gte(triggerRatio.mul(99999).div(100000))) {
      return (
        <div className="Confirmation-box-warning">
          WARNING: Trigger Price is {triggerRatioInverted ? "lower" : "higher"} then current price and order will be executed immediatelly
        </div>
      );
    }
  }

  if (order.swapOption !== SWAP) {
    const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
    return  <Modal isVisible={true} className="Exchange-list-modal" setIsVisible={() => setEditingOrder(null)} label="Edit order">
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              Price
            </div>
            <div
              className="muted align-right clickable"
              onClick={() => {setTriggerPriceValue(formatAmountFree(indexTokenEntryMarkPrice, USD_DECIMALS, 2))}}
            >
              Mark: {formatAmount(indexTokenEntryMarkPrice, USD_DECIMALS, 2)}
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div className="Exchange-swap-input-container">
              <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={triggerPriceValue} onChange={onTriggerPriceChange} />
            </div>
            <div className="PositionEditor-token-symbol">
              USD
            </div>
          </div>
        </div>
        {renderTriggerPriceWarning()}
        <ExchangeInfoRow label="Price">
          {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
          {triggerPrice && !triggerPrice.eq(order.triggerPrice) &&
            <React.Fragment>
              &nbsp;
              <BsArrowRight />
              &nbsp;
              {triggerPricePrefix} {formatAmount(triggerPrice, USD_DECIMALS, 2, true)}
            </React.Fragment>
          }
        </ExchangeInfoRow>
        {/*<ExchangeInfoRow label="Leverage">
          {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
            {formatAmount(existingPosition.leverage, 4, 2)}x
            <BsArrowRight className="transition-arrow" />
          </div>}
          {(toAmount && leverage && leverage.gt(0)) && `${formatAmount(leverage, 4, 2)}x`}
          {(!toAmount && leverage && leverage.gt(0)) && `-`}
          {(leverage && leverage.eq(0)) && `-`}
        </ExchangeInfoRow>*/}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button Exchange-list-modal-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
  }

  return (
    <Modal isVisible={true} className="Exchange-list-modal" setIsVisible={() => setEditingOrder(null)} label="Edit order">
      <div className="Exchange-swap-section">
        <div className="Exchange-swap-section-top">
          <div className="muted">
            Price
          </div>
          {fromTokenInfo && toTokenInfo &&
            <div
              className="muted align-right clickable"
              onClick={() => {setTriggerRatioValue(formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10))}}
            >
              Mark Price: {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 2)}
            </div>
          }
        </div>
        <div className="Exchange-swap-section-bottom">
          <div className="Exchange-swap-input-container">
            <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={triggerRatioValue} onChange={onTriggerRatioChange} />
          </div>
          {(() => {
            if (!toTokenInfo) return;
            if (!fromTokenInfo) return;
            const [tokenA, tokenB] = triggerRatioInverted ? [toTokenInfo, fromTokenInfo] : [fromTokenInfo, toTokenInfo]
            return <div className="PositionEditor-token-symbol">
              {tokenA.symbol}&nbsp;/&nbsp;{tokenB.symbol}
            </div>
          })()}
        </div>
      </div>
      {renderTriggerRatioWarning()}
      <ExchangeInfoRow label="Minimum received">
        {formatAmount(order.minOut, toTokenInfo.decimals, 4, true)}
        {triggerRatio && !triggerRatio.eq(order.triggerRatio) &&
          <React.Fragment>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {formatAmount(toAmount, toTokenInfo.decimals, 4, true)}
          </React.Fragment>
        }
        &nbsp;{toTokenInfo.symbol}
      </ExchangeInfoRow>
      <ExchangeInfoRow label="Price">
        {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, { omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio) })}
        {triggerRatio && !triggerRatio.eq(0) && !triggerRatio.eq(order.triggerRatio) &&
          <React.Fragment>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
          </React.Fragment>
        }
      </ExchangeInfoRow>
      {fromTokenInfo &&
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">{fromTokenInfo.symbol} price</div>
          <div className="align-right">{formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      }
      {toTokenInfo &&
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">{toTokenInfo.symbol} price</div>
          <div className="align-right">{formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      }
      <div className="Exchange-swap-button-container">
        <button className="App-cta Exchange-swap-button Exchange-list-modal-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
          {getPrimaryText()}
        </button>
      </div>
    </Modal>
  );
}
