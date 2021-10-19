import React, { useState, useMemo } from "react"
import { BsArrowRight } from 'react-icons/bs'
import { ethers } from 'ethers'

import {
  PRECISION,
  USD_DECIMALS,
  SWAP,
  LONG,
  STOP,
  LIMIT,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  MIN_PROFIT_TIME,
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
  getProfitPrice
} from "../../Helpers"
import {
  updateSwapOrder,
  updateIncreaseOrder,
  updateDecreaseOrder
} from '../../Api'
import Modal from '../Modal/Modal'
import ExchangeInfoRow from './ExchangeInfoRow'
import { getContract } from '../../Addresses'

const { AddressZero } = ethers.constants

export default function OrderEditor(props) {
  const {
    order,
    setEditingOrder,
    infoTokens,
    pendingTxns,
    setPendingTxns,
    updateOrders,
    library,
    totalTokenWeights,
    usdgSupply,
    getPositionForOrder,
    positionsMap
  } = props;

  const { chainId } = useChainId()

  const { swapOption } = order;

  const position = order.orderType === STOP ? getPositionForOrder(order, positionsMap) : null
  const liquidationPrice = position ? getLiquidationPrice(position) : null

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const fromTokenInfo = getTokenInfo(infoTokens, order.fromTokenAddress === nativeTokenAddress ? AddressZero : order.fromTokenAddress);
  const toTokenInfo = getTokenInfo(infoTokens, order.shouldUnwrap ? AddressZero : order.toTokenAddress);

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

  const onTriggerRatioChange = evt => {
    setTriggerRatioValue(evt.target.value || '')
  }

  const onTriggerPriceChange = evt => {
    setTriggerPriceValue(evt.target.value || '')
  }

  const getError = () => {
    if (!triggerRatio && !triggerPrice) {
      return "Enter Price";
    }
    if (order.swapOption === SWAP && triggerRatio.eq(order.triggerRatio)) {
      return "Enter new Price";
    }
    if (order.swapOption !== SWAP && triggerPrice.eq(order.triggerPrice)) {
      return "Enter new Price";
    }
    if (position) {
      if (position.isLong && triggerPrice.lte(liquidationPrice)) { return "Price below Liq. Price" }
      if (!position.isLong && triggerPrice.gte(liquidationPrice)) { return "Price above Liq. Price" }

      const { delta, hasProfit } = calculatePositionDelta(triggerPrice, position)
      if (hasProfit && delta.eq(0)) {
        return "Invalid price, see warning"
      }
    }

    if (swapOption !== SWAP && indexTokenEntryMarkPrice) {
      if (order.triggerAboveThreshold && indexTokenEntryMarkPrice.gt(triggerPrice)) {
        return "Price below Mark Price"
      }
      if (!order.triggerAboveThreshold && indexTokenEntryMarkPrice.lt(triggerPrice)) {
        return "Price above Mark Price"
      }
    }

    if (swapOption === SWAP) {
      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && !currentRate.gte(triggerRatio)) {
        return `Price is ${triggerRatioInverted ? "below" : "above"} Mark Price`
      }
    }
  }

  const renderMinProfitWarning = () => {
    if (!position) { return null }

    const { delta, pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(triggerPrice, position)
    if (hasProfit && delta.eq(0)) {
      const { deltaStr } = getDeltaStr({
        delta: pendingDelta,
        deltaPercentage: pendingDeltaPercentage,
        hasProfit
      })
      const [profitPrice, priceMovementPercentage] = getProfitPrice(triggerPrice, position)
      const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME
      return (
        <div className="Confirmation-box-warning">
          WARNING: You may have a&nbsp;
          <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
            pending profit
          </a> of {deltaStr}. <br/>
          Profit price: ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
          Current movement: {formatAmount(priceMovementPercentage, 2, 2, true)}%.
          This requirement expires on {formatDateTime(minProfitExpiration)}
        </div>
      )
    }
  }

  const isPrimaryEnabled = () => {
    if (isSubmitting) { return false }
    const error = getError()
    if (error) { return false }

    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }

    if (isSubmitting) {
      return "Updating Order...";
    }
    return "Update Order";
  }

  if (order.swapOption !== SWAP) {
    const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
    return  <Modal isVisible={true} className="Exchange-list-modal" setIsVisible={() => setEditingOrder(null)} label="Edit order">
      {renderMinProfitWarning()}
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
      {liquidationPrice &&
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">Liq. Price</div>
          <div className="align-right">
            {`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
          </div>
        </div>
      }
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
