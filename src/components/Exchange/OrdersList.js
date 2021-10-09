import React, { useState, useEffect, useCallback } from 'react'

import {
  SWAP,
  LONG,
  SHORT,
  STOP,
  LIMIT,
  USD_DECIMALS,
  PRECISION,
  formatAmount,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  getExchangeRateDisplay,
  getTokenInfo,
  getExchangeRate,
  getPositionKey,
  useChainId
} from '../../Helpers.js';
import {
  cancelSwapOrder,
  cancelIncreaseOrder,
  cancelDecreaseOrder,
  updateSwapOrder,
  updateIncreaseOrder,
  updateDecreaseOrder
} from '../../Api'

import Tooltip from '../Tooltip/Tooltip'
import OrderEditor from './OrderEditor'

import './OrdersList.css';

function getPositionForOrder(order, positionsMap) {
  const key = getPositionKey(order.collateralToken, order.indexToken, order.swapOption === LONG)
  const position = positionsMap[key]
  return (position && position.size && position.size.gt(0)) ? position : null
}

export default function OrdersList(props) {
  const { 
    active, 
    library, 
    setPendingTxns,
    pendingTxns,
    infoTokens,
    positionsMap,
    totalTokenWeights,
    usdgSupply,
    orders,
    updateOrders,
    hideActions
  } = props;

  const { chainId } = useChainId()

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
              <Tooltip handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}>
                Execution price may vary slightly depending on exact fees at the time the order is executed.
              </Tooltip>
            </td>
            <td>
              {getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo, true)}
            </td>
            {!hideActions && renderActions(order)}
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
      if (order.orderType === STOP) {
        const positionForOrder = getPositionForOrder(order, positionsMap)
        if (!positionForOrder) {
          error = "There is no open position for the order, it can't be executed"  
        } else if (positionForOrder.size.lt(order.sizeDelta)) {
          error = "The order size is bigger than position, it can't be executed"
        }
      }

      return (
        <tr className="Exchange-list-item" key={`${order.orderType}-${order.swapOption}-${order.index}`}>
          <td className="Exchange-list-item-type">
            {order.orderType === LIMIT ? "Limit" : "Trigger"}
          </td>
          <td>
            {order.orderType === LIMIT ? "Increase" : "Decrease"} {order.swapOption} {sizeInToken} {indexTokenSymbol}
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
          {!hideActions && renderActions(order)}
        </tr>
      )
    })
  }, [orders, renderActions, infoTokens, positionsMap, hideActions])

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
              <Tooltip position="center-bottom" handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}>
                Execution price may vary slightly depending on exact fees at the time the order is executed.
              </Tooltip>
            </td>
            <td>
              {getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo)}
            </td>
            <td>
              {!hideActions &&
                <>
                  <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
                    Edit
                  </button>
                  <br />
                  <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
                    Cancel
                  </button>
                </>
              }
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
      if (order.orderType === STOP) {
        const positionForOrder = getPositionForOrder(order, positionsMap)
        if (!positionForOrder) {
          error = "There is no open position for the order, it can't be executed"  
        } else if (positionForOrder.size.lt(order.sizeDelta)) {
          error = "The order size is bigger than position, it can't be executed"
        }
      }

      return (
        <tr className="Exchange-list-item" key={`${order.orderType}-${order.swapOption}-${order.index}`}>
          <td>
            {order.orderType === LIMIT ? "Limit" : "Trigger"} {order.swapOption} {sizeInToken} {indexTokenSymbol}
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
            {!hideActions &&
              <>
                <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
                  Edit
                </button>
                <br />
                <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
                  Cancel
                </button>
              </>
            }
          </td>
        </tr>
      )
    })
  }, [orders, onEditClick, onCancelClick, infoTokens, positionsMap, hideActions])

	return (
    <React.Fragment>
  		<table className="Exchange-list Orders App-box large">
        <tbody>
          {renderHead()}
          {renderEmptyRow()}
          {renderLargeList()}
        </tbody>
      </table>
      <table className="Exchange-list Orders small">
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
          totalTokenWeights={totalTokenWeights}
          usdgSupply={usdgSupply}
        />
      }
    </React.Fragment>
	);
}

