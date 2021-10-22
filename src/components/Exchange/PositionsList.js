import React, { useState } from "react"
import cx from "classnames"

import Tooltip from '../Tooltip/Tooltip'
import PositionSeller from "./PositionSeller"
import PositionEditor from "./PositionEditor"
import OrdersToa from "./OrdersToa"

import {
  helperToast,
  getLiquidationPrice,
  getUsd,
  getLeverage,
  formatAmount,
  USD_DECIMALS,
  SWAP,
  LONG,
  SHORT,
  LIMIT
} from "../../Helpers"

const getOrdersForPosition = (position, orders, nativeTokenAddress) => {
  /* eslint-disable array-callback-return */
  return orders.filter(order => {
    if (order.swapOption === SWAP) { return false }
    const sameToken = order.indexToken === nativeTokenAddress
      ? position.indexToken.isNative
      : order.indexToken === position.indexToken.address
    if ((order.swapOption === LONG) === position.isLong
      && sameToken) {
      return true
    }
  })
}

export default function PositionsList(props) {
  const {
    positions,
    positionsMap,
    infoTokens,
    active,
    account,
    library,
    pendingTxns,
    setPendingTxns,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    setIsWaitingForPluginApproval,
    approveOrderBook,
    isPluginApproving,
    isWaitingForPluginApproval,
    updateOrderBookApproved,
    orderBookApproved,
    setMarket
  } = props
  const [positionToEditKey, setPositionToEditKey] = useState(undefined)
  const [positionToSellKey, setPositionToSellKey] = useState(undefined)
  const [isPositionEditorVisible, setIsPositionEditorVisible] = useState(undefined)
  const [isPositionSellerVisible, setIsPositionSellerVisible] = useState(undefined)
  const [collateralTokenAddress, setCollateralTokenAddress] = useState(undefined)
  const [ordersToaOpen, setOrdersToaOpen] = useState(false)

  const editPosition = (position) => {
    setCollateralTokenAddress(position.collateralToken.address)
    setPositionToEditKey(position.key)
    setIsPositionEditorVisible(true)
  }

  const sellPosition = (position) => {
    setPositionToSellKey(position.key)
    setIsPositionSellerVisible(true)
  }

  const onPositionClick = (position) => {
    helperToast.success(`${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol} market selected`)
    setMarket(position.isLong ? LONG : SHORT, position.indexToken.address)
  }

  return (
    <div>
      <PositionEditor
        positionsMap={positionsMap}
        positionKey={positionToEditKey}
        isVisible={isPositionEditorVisible}
        setIsVisible={setIsPositionEditorVisible}
        infoTokens={infoTokens}
        active={active}
        account={account}
        library={library}
        collateralTokenAddress={collateralTokenAddress}
        pendingTxns={pendingTxns}
        setPendingTxns={setPendingTxns}
        getLiquidationPrice={getLiquidationPrice}
        getUsd={getUsd}
        getLeverage={getLeverage}
        savedIsPnlInLeverage={savedIsPnlInLeverage}
        chainId={chainId}
      />
      {ordersToaOpen &&
        <OrdersToa
          setIsVisible={setOrdersToaOpen}
          approveOrderBook={approveOrderBook}
          isPluginApproving={isPluginApproving}
        />
      }
      {(isPositionSellerVisible) &&
        <PositionSeller
          setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
          approveOrderBook={approveOrderBook}
          isPluginApproving={isPluginApproving}
          isWaitingForPluginApproval={isWaitingForPluginApproval}
          updateOrderBookApproved={updateOrderBookApproved}
          orderBookApproved={orderBookApproved}
          positionsMap={positionsMap}
          positionKey={positionToSellKey}
          isVisible={isPositionSellerVisible}
          setIsVisible={setIsPositionSellerVisible}
          infoTokens={infoTokens}
          active={active}
          account={account}
          orders={orders}
          library={library}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          flagOrdersEnabled={flagOrdersEnabled}
          savedIsPnlInLeverage={savedIsPnlInLeverage}
          chainId={chainId}
          nativeTokenAddress={nativeTokenAddress}
          setOrdersToaOpen={setOrdersToaOpen}
        />
      }
      {(positions) && <div className="Exchange-list small">
        <div>
          {positions.length === 0 && (
            <div className="Exchange-empty-positions-list-note App-card">
              No open positions
            </div>
          )}
          {positions.map(position => {
            const liquidationPrice = getLiquidationPrice(position)
            return (<div key={position.key} className="App-card">
              <div className="App-card-title">
                <span className="Exchange-list-title">{position.indexToken.symbol}</span>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Leverage</div>
                  <div>
                    {formatAmount(position.leverage, 4, 2, true)}x&nbsp;
                    <span className={cx("Exchange-list-side", { positive: position.isLong, negative: !position.isLong })}>
                      {position.isLong ? "Long" : "Short" }
                    </span>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Size</div>
                  <div>
                     ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Collateral</div>
                  <div>
                     ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">PnL</div>
                  <div>
                    <span className={cx({ positive: position.hasProfit && position.pendingDelta.gt(0), negative: !position.hasProfit && position.pendingDelta.gt(0) })}>
                      {position.deltaStr} ({position.deltaPercentageStr})
                    </span>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Net Value</div>
                  <div>
                    ${formatAmount(position.netValue, USD_DECIMALS, 2, true)}
                  </div>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Mark Price</div>
                  <div>
                    ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Entry Price</div>
                  <div>
                    ${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Liq. Price</div>
                  <div>
                    ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <button className="App-button-option App-card-option" onClick={() => editPosition(position)}>
                  Edit
                </button>
                <button  className="App-button-option App-card-option" onClick={() => sellPosition(position)}>
                  Close
                </button>
              </div>
            </div>)
          })}
        </div>
      </div>}
      <table className="Exchange-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>Position</th>
            <th>Net Value</th>
            <th>Size</th>
            <th>Collateral</th>
            <th>Mark Price</th>
            <th>Entry Price</th>
            <th>Liq. Price</th>
            <th></th>
            <th></th>
          </tr>
        {positions.length === 0 &&
          <tr>
            <td colSpan="15">
              <div className="Exchange-empty-positions-list-note">
                No open positions
              </div>
            </td>
          </tr>
        }
        {positions.map(position => {
          const liquidationPrice = getLiquidationPrice(position)
          const positionOrders = getOrdersForPosition(position, orders, nativeTokenAddress)
          return (
            <tr key={position.key}>
              <td className="clickable" onClick={() => onPositionClick(position)}>
                <div className="Exchange-list-title">{position.indexToken.symbol}</div>
                <div className="Exchange-list-info-label">
                  <span className="muted">
                      {formatAmount(position.leverage, 4, 2, true)}x
                  </span>&nbsp;
                  <span className={cx({ "positive": position.isLong, "negative": !position.isLong })}>
                    {position.isLong ? "Long" : "Short" }
                  </span>
                </div>
              </td>
              <td>
                <div>
                  <Tooltip handle={`$${formatAmount(position.netValue, USD_DECIMALS, 2, true)}`} position="left-bottom" handleClassName="plain">
                    Net Value: Collateral + PnL<br/>
                    Collateral: ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}<br/>
                    PnL: {position.deltaStr} ({position.deltaPercentageStr})
                  </Tooltip>
                </div>
                <div className={cx("Exchange-list-info-label", { "positive": position.hasProfit && position.pendingDelta.gt(0), "negative": !position.hasProfit && position.pendingDelta.gt(0) })}>
                  {position.deltaStr} ({position.deltaPercentageStr})
                </div>
              </td>
              <td>
                <div>
                  ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                </div>
                {positionOrders.length > 0 && <div>
                  <Tooltip handle={`Orders (${positionOrders.length})`} position="left-bottom" handleClassName="Exchange-list-info-label muted plain">
                    <strong>Active Orders</strong>
                    {positionOrders.map(order => {
                      return <div key={`${order.orderType}-${order.index}`}>
                        {order.triggerAboveThreshold ? ">" : "<"} {formatAmount(order.triggerPrice, 30, 2, true)}:
                        {order.orderType === LIMIT ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                      </div>
                    })}
                  </Tooltip>
                </div>}
              </td>
              <td>
                <Tooltip handle={`$${formatAmount(position.collateral, USD_DECIMALS, 2, true)}`} position="left-bottom" handleClassName="plain">
                  Use the "Edit" button to deposit or withdraw collateral.
                </Tooltip>
              </td>
              <td className="clickable" onClick={() => onPositionClick(position)}>
                <Tooltip handle={`$${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}`} position="left-bottom" handleClassName="plain clickable">
                  Click on a row to select the position's market, then use the swap box to increase your position size if needed.<br/>
                  <br/>
                  Use the "Close" button to reduce your position size, or to set stop-loss / take-profit orders.
                </Tooltip>
              </td>
              <td className="clickable" onClick={() => onPositionClick(position)}>
                ${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}
              </td>
              <td className="clickable" onClick={() => onPositionClick(position)}>
                ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
              </td>
              <td>
                <button className="Exchange-list-action" onClick={() => editPosition(position)}>
                  Edit
                </button>
              </td>
              <td>
                <button  className="Exchange-list-action" onClick={() => sellPosition(position)}>
                  Close
                </button>
              </td>
            </tr>
          )
        })
        }
        </tbody>
      </table>
    </div>
  )
}
