import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BsArrowRight } from 'react-icons/bs'

import Modal from '../Modal/Modal'
import {
  SWAP,
  LONG,
  SHORT,
  STOP,
  LIMIT,
  USD_DECIMALS,
  PRECISION,
  formatAmount,
  useOrders,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  isTriggerRatioInverted,
  getExchangeRateDisplay,
  formatAmountFree,
  parseValue,
  getTokenInfo,
  getExchangeRate,
  getNextToAmount,
  bigNumberify,
  getPositionKey,
  useChainId
} from '../../Helpers.js';
import ExchangeInfoRow from './ExchangeInfoRow'
import {
  cancelSwapOrder,
  cancelIncreaseOrder,
  cancelDecreaseOrder,
  updateSwapOrder,
  updateIncreaseOrder,
  updateDecreaseOrder
} from '../../Api'

import './OrdersList.css';

function hasPositionForOrder(order, positionsMap) {
  const key = getPositionKey(order.collateralToken, order.indexToken, order.swapOption === "Long")
  const position = positionsMap[key]
  return position && position.size && position.size.gt(0)
}

export default function OrdersList(props) {
  const { 
    active, 
    library, 
    account,
    setPendingTxns,
    pendingTxns,
    infoTokens,
    positionsMap
  } = props;

  const { chainId } = useChainId()

  const [orders, updateOrders] = useOrders(active, library, account);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    function onBlock() {
      updateOrders(undefined, true)
    }
    if (active) {
      library.on('block', onBlock)
      return () => {
        library.removeListener('block', onBlock)
      }
    }
  }, [active, library, updateOrders])

  const onCancelClick = useCallback(order => {
    let func;
    if (order.swapOption === SWAP) { 
      func = cancelSwapOrder;
    } else if (order.orderType === LIMIT) {
      func = cancelIncreaseOrder;
    } else if (order.orderType === STOP) {
      func = cancelDecreaseOrder;
    }

    return func(chainId, library, order.index, {
      successMsg: "Order cancelled",
      failMsg: "Order cancel failed",
      sentMsg: "Cancel order",
      pendingTxns,
      setPendingTxns
    }).then(() => {
      updateOrders(undefined, true);
    });
  }, [library, pendingTxns, setPendingTxns, updateOrders, chainId])

  const onEditClick = useCallback((order) => {
    setEditingOrder(order);
  }, [setEditingOrder])

	const renderHead = useCallback((renderType = true) => {
		return (
      <tr className="Exchange-list-header">
        {renderType &&
          <th>
            <div>Type</div>
          </th>
        }
        <th>
          <div>Order</div>
        </th>
        <th>
          <div>Price</div>
        </th>
        <th>
          <div>Mark Price</div>
        </th>
        {renderType && <th colSpan="2"></th>}
        {!renderType && <th></th>}
      </tr>
		);
	}, [])

 const renderEmptyRow = useCallback(() => {
    if (orders && orders.length) {
      return null;
    }

    return <tr><td colSpan="5">No open orders</td></tr>;
  }, [orders]);

  const renderActions = useCallback((order) => {
    return <>
      <td>
        <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
          Edit
        </button>
      </td>
      <td>
        <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
          Cancel
        </button>
      </td>
    </>
  }, [onEditClick, onCancelClick])

  const renderLargeList = useCallback(() => {
    if (!orders || !orders.length) {
      return null;
    }

    return orders.map(order => {
      if (order.swapOption === SWAP) {
        const fromTokenInfo = getTokenInfo(infoTokens, order.fromTokenAddress);
        const toTokenInfo = getTokenInfo(infoTokens, order.toTokenAddress);

        const markExchangeRate = getExchangeRate(
          fromTokenInfo,
          toTokenInfo
        )

        return (
          <tr className="Exchange-list-item" key={`${order.swapOption}-${order.orderType}-${order.index}`}>
            <td className="Exchange-list-item-type">
              {order.orderType}
            </td>
            <td>
              Swap {formatAmount(order.amountIn, fromTokenInfo.decimals, (fromTokenInfo.isStable || fromTokenInfo.isUsdg) ? 2 : 6, true)} {fromTokenInfo.symbol} for {formatAmount(order.minOut, toTokenInfo.decimals, (toTokenInfo.isStable || toTokenInfo.isUsdg) ? 2 : 6, true)} {toTokenInfo.symbol}
            </td>
            <td>
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
            </td>
            <td>
              {getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo, true)}
            </td>
            {renderActions(order)}
          </tr>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken);
      const sizeInToken = formatAmount(order.sizeDelta.mul(PRECISION).div(order.triggerPrice), USD_DECIMALS, 4, true)
      const maximisePrice = (order.orderType === LIMIT && order.swapOption === LONG) || (order.orderType === STOP && !order.swapOption === SHORT)
      const markPrice = maximisePrice ? indexToken.maxPrice : indexToken.minPrice
      const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
      const indexTokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol

      let error
      if (order.orderType === "Stop" && !hasPositionForOrder(order, positionsMap)) {
        error = "There is no open position for the order, it can't be executed"  
      }

      return (
        <tr className="Exchange-list-item" key={`${order.orderType}-${order.swapOption}-${order.index}`}>
          <td className="Exchange-list-item-type">
            {order.orderType === "Limit" ? "Limit" : "Trigger"}
          </td>
          <td>
            {order.orderType === "Limit" ? "Increase" : "Decrease"} {order.swapOption} {sizeInToken} {indexTokenSymbol}
            &nbsp;(${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)})
            {error &&
              <div className="Exchange-list-item-error">
                {error}
              </div>
            }
          </td>
          <td>
            {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
          </td>
          <td>
            {formatAmount(markPrice, USD_DECIMALS, 2, true)}
          </td>
          {renderActions(order)}
        </tr>
      )
    })
  }, [orders, renderActions, infoTokens, positionsMap])

  const renderSmallList = useCallback(() => {
    if (!orders || !orders.length) {
      return null;
    }

    return orders.map(order => {
      if (order.swapOption === SWAP) {
        const fromTokenInfo = getTokenInfo(infoTokens, order.fromTokenAddress);
        const toTokenInfo = getTokenInfo(infoTokens, order.toTokenAddress);
        const markExchangeRate = getExchangeRate(
          fromTokenInfo,
          toTokenInfo
        )
        return (
          <tr className="Exchange-list-item" key={`${order.orderType}-${order.index}`}>
            <td>
              Swap {formatAmount(order.amountIn, fromTokenInfo.decimals, fromTokenInfo.isStable ? 2 : 4, true)} {fromTokenInfo.symbol} for {formatAmount(order.minOut, toTokenInfo.decimals, toTokenInfo.isStable ? 2 : 4, true)} {toTokenInfo.symbol}
            </td>
            <td>
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
            </td>
            <td>
              {getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo)}
            </td>
            <td>
              <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
                Edit
              </button>
              <br />
              <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
                Cancel
              </button>
          </td>
          </tr>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken);
      const sizeInToken = formatAmount(order.sizeDelta.mul(PRECISION).div(order.triggerPrice), USD_DECIMALS, 4, true)
      const maximisePrice = (order.orderType === LIMIT && order.swapOption === LONG) || (order.orderType === STOP && !order.swapOption === SHORT)
      const markPrice = maximisePrice ? indexToken.maxPrice : indexToken.minPrice
      const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
      const indexTokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol

      let error
      if (order.orderType === "Stop" && !hasPositionForOrder(order, positionsMap)) {
        error = "There is no open position for the order, it can't be executed"  
      }

      return (
        <tr className="Exchange-list-item" key={`${order.orderType}-${order.swapOption}-${order.index}`}>
          <td>
            {order.orderType === "Limit" ? "Limit" : "Trigger"} {order.swapOption} {sizeInToken} {indexTokenSymbol}
            &nbsp;(${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)})
            {error &&
              <div className="Exchange-list-item-error">
                {error}
              </div>
            }
          </td>
          <td>{triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}</td>
          <td>
            {formatAmount(markPrice, USD_DECIMALS, 2, true)}
          </td>
          <td>
            <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
              Edit
            </button>
            <br />
            <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
              Cancel
            </button>
          </td>
        </tr>
      )
    })
  }, [orders, onEditClick, onCancelClick, infoTokens, positionsMap])

	return (
    <React.Fragment>
  		<table className="Exchange-list App-box large">
        <tbody>
          {renderHead()}
          {renderEmptyRow()}
          {renderLargeList()}
        </tbody>
      </table>
      <table className="Exchange-list small">
        <tbody>
          {renderHead(false)}
          {renderEmptyRow()}
          {renderSmallList()}
         </tbody>
      </table>
      {editingOrder && 
        <OrderEditor
          order={editingOrder}
          setEditingOrder={setEditingOrder} 
          infoTokens={infoTokens} 
          updateSwapOrder={updateSwapOrder}
          updateIncreaseOrder={updateIncreaseOrder}
          updateDecreaseOrder={updateDecreaseOrder}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          updateOrders={updateOrders}
          library={library}
        />
      }
    </React.Fragment>
	);
}

function OrderEditor(props) {
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
    library
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
    order.amountIn,
    order.fromTokenAddress,
    order.toTokenAddress,
    infoTokens,
    undefined,
    triggerRatio
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
      return "Updating order...";
    }
    if (!triggerRatio && !triggerPrice) {
      return "Enter a trigger price";
    }
    if (order.swapOption === SWAP && triggerRatio.eq(order.triggerRatio)) {
      return "Enter a new trigger price";
    }
    if (order.swapOption !== SWAP && triggerPrice.eq(order.triggerPrice)) {
      return "Enter a new trigger price";
    }
    return "Update Order";
  }

  function renderTriggerPriceWarning() {
    if (swapOption === SWAP) {
      return null;
    }

    if ((order.triggerAboveThreshold && indexTokenEntryMarkPrice.lt(triggerPrice))
      || (!order.triggerAboveThreshold && indexTokenEntryMarkPrice.gt(triggerPrice))
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
    if (!currentRate.gt(triggerRatio)) {
      return (
        <div className="Exchange-list-modal-warning ">
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
              Trigger Price
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
        <ExchangeInfoRow label="Trigger Price">
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
            Trigger Price
          </div>
          {fromTokenInfo && toTokenInfo &&
            <div
              className="muted align-right clickable"
              onClick={() => {setTriggerRatioValue(formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10))}}
            >
              Price: {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 2)}
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
      <ExchangeInfoRow label="Trigger Price">
        {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, { omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio) })}
        {triggerRatio && !triggerRatio.eq(order.triggerRatio) &&
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
