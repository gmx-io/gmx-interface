import React, { useState } from "react";
import cx from "classnames";

import Tooltip from "../Tooltip/Tooltip";
import PositionSeller from "./PositionSeller";
import PositionEditor from "./PositionEditor";
import OrdersToa from "./OrdersToa";

import { ImSpinner2 } from "react-icons/im";

import {
  helperToast,
  bigNumberify,
  getLiquidationPrice,
  getUsd,
  getLeverage,
  formatAmount,
  USD_DECIMALS,
  FUNDING_RATE_PRECISION,
  SWAP,
  LONG,
  SHORT,
  INCREASE,
  DECREASE,
} from "../../Helpers";

const getOrdersForPosition = (position, orders, nativeTokenAddress) => {
  if (!orders || orders.length === 0) {
    return [];
  }
  /* eslint-disable array-callback-return */
  return orders
    .filter((order) => {
      if (order.type === SWAP) {
        return false;
      }
      const hasMatchingIndexToken =
        order.indexToken === nativeTokenAddress
          ? position.indexToken.isNative
          : order.indexToken === position.indexToken.address;
      const hasMatchingCollateralToken =
        order.collateralToken === nativeTokenAddress
          ? position.collateralToken.isNative
          : order.collateralToken === position.collateralToken.address;
      if (order.isLong === position.isLong && hasMatchingIndexToken && hasMatchingCollateralToken) {
        return true;
      }
    })
    .map((order) => {
      if (order.type === DECREASE && order.sizeDelta.gt(position.size)) {
        order.error = "Order size exceeds position size, order cannot be executed";
      }
      return order;
    });
};

export default function PositionsList(props) {
  const {
    pendingPositions,
    setPendingPositions,
    positions,
    positionsDataIsLoading,
    positionsMap,
    infoTokens,
    active,
    account,
    library,
    pendingTxns,
    setPendingTxns,
    setListSection,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    setIsWaitingForPluginApproval,
    approveOrderBook,
    isPluginApproving,
    isWaitingForPluginApproval,
    orderBookApproved,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    showPnlAfterFees,
    setMarket,
  } = props;

  const [positionToEditKey, setPositionToEditKey] = useState(undefined);
  const [positionToSellKey, setPositionToSellKey] = useState(undefined);
  const [isPositionEditorVisible, setIsPositionEditorVisible] = useState(undefined);
  const [isPositionSellerVisible, setIsPositionSellerVisible] = useState(undefined);
  const [collateralTokenAddress, setCollateralTokenAddress] = useState(undefined);
  const [ordersToaOpen, setOrdersToaOpen] = useState(false);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);

  const editPosition = (position) => {
    setCollateralTokenAddress(position.collateralToken.address);
    setPositionToEditKey(position.key);
    setIsPositionEditorVisible(true);
  };

  const sellPosition = (position) => {
    setPositionToSellKey(position.key);
    setIsPositionSellerVisible(true);
    setIsHigherSlippageAllowed(false);
  };

  const onPositionClick = (position) => {
    helperToast.success(`${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol} market selected`);
    setMarket(position.isLong ? LONG : SHORT, position.indexToken.address);
  };

  return (
    <div className="PositionsList">
      <PositionEditor
        pendingPositions={pendingPositions}
        setPendingPositions={setPendingPositions}
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
        getUsd={getUsd}
        getLeverage={getLeverage}
        savedIsPnlInLeverage={savedIsPnlInLeverage}
        positionRouterApproved={positionRouterApproved}
        isPositionRouterApproving={isPositionRouterApproving}
        isWaitingForPositionRouterApproval={isWaitingForPositionRouterApproval}
        approvePositionRouter={approvePositionRouter}
        chainId={chainId}
      />
      {ordersToaOpen && (
        <OrdersToa
          setIsVisible={setOrdersToaOpen}
          approveOrderBook={approveOrderBook}
          isPluginApproving={isPluginApproving}
        />
      )}
      {isPositionSellerVisible && (
        <PositionSeller
          pendingPositions={pendingPositions}
          setPendingPositions={setPendingPositions}
          setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
          approveOrderBook={approveOrderBook}
          isPluginApproving={isPluginApproving}
          isWaitingForPluginApproval={isWaitingForPluginApproval}
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
          positionRouterApproved={positionRouterApproved}
          isPositionRouterApproving={isPositionRouterApproving}
          isWaitingForPositionRouterApproval={isWaitingForPositionRouterApproval}
          approvePositionRouter={approvePositionRouter}
          isHigherSlippageAllowed={isHigherSlippageAllowed}
          setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
        />
      )}
      {positions && (
        <div className="Exchange-list small">
          <div>
            {positions.length === 0 && positionsDataIsLoading && (
              <div className="Exchange-empty-positions-list-note App-card">Loading...</div>
            )}
            {positions.length === 0 && !positionsDataIsLoading && (
              <div className="Exchange-empty-positions-list-note App-card">No open positions</div>
            )}
            {positions.map((position) => {
              const positionOrders = getOrdersForPosition(position, orders, nativeTokenAddress);
              const liquidationPrice = getLiquidationPrice(position);
              const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
              const positionDelta =
                position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || bigNumberify(0);
              let borrowFeeText;
              if (position.collateralToken && position.collateralToken.fundingRate) {
                const borrowFeeRate = position.collateralToken.fundingRate
                  .mul(position.size)
                  .mul(24)
                  .div(FUNDING_RATE_PRECISION);
                borrowFeeText = `Borrow Fee / Day: $${formatAmount(borrowFeeRate, USD_DECIMALS, 2)}`;
              }

              return (
                <div key={position.key} className="App-card">
                  <div className="App-card-title">
                    <span className="Exchange-list-title">{position.indexToken.symbol}</span>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Leverage</div>
                      <div>
                        {formatAmount(position.leverage, 4, 2, true)}x&nbsp;
                        <span
                          className={cx("Exchange-list-side", {
                            positive: position.isLong,
                            negative: !position.isLong,
                          })}
                        >
                          {position.isLong ? "Long" : "Short"}
                        </span>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Size</div>
                      <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Collateral</div>
                      <div>
                        <Tooltip
                          handle={`$${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          handleClassName={cx("plain", { negative: position.hasLowCollateral })}
                          renderContent={() => {
                            return (
                              <>
                                {position.hasLowCollateral && (
                                  <div>
                                    WARNING: This position has a low amount of collateral after deducting borrowing
                                    fees, deposit more collateral to reduce the position's liquidation risk.
                                    <br />
                                    <br />
                                  </div>
                                )}
                                Initial Collateral: ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                                <br />
                                Borrow Fee: ${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}
                                {borrowFeeText && <div>{borrowFeeText}</div>}
                                <br />
                                Use the "Edit" button to deposit or withdraw collateral.
                              </>
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">PnL</div>
                      <div>
                        <span
                          className={cx("Exchange-list-info-label", {
                            positive: hasPositionProfit && positionDelta.gt(0),
                            negative: !hasPositionProfit && positionDelta.gt(0),
                            muted: positionDelta.eq(0),
                          })}
                        >
                          {position.deltaStr} ({position.deltaPercentageStr})
                        </span>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Net Value</div>
                      <div>
                        <Tooltip
                          handle={`$${formatAmount(position.netValue, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          handleClassName="plain"
                          renderContent={() => {
                            return (
                              <>
                                Net Value:{" "}
                                {showPnlAfterFees
                                  ? "Initial Collateral - Fees + PnL"
                                  : "Initial Collateral - Borrow Fee + PnL"}
                                <br />
                                <br />
                                Initial Collateral: ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                                <br />
                                PnL: {position.deltaBeforeFeesStr}
                                <br />
                                Borrow Fee: ${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}
                                <br />
                                Open + Close fee: ${formatAmount(position.positionFee, USD_DECIMALS, 2, true)}
                                <br />
                                PnL After Fees: {position.deltaAfterFeesStr} ({position.deltaAfterFeesPercentageStr})
                              </>
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Orders</div>
                      <div>
                        {positionOrders.length === 0 && "None"}
                        {positionOrders.map((order) => {
                          return (
                            <div key={`${order.isLong}-${order.type}-${order.index}`} className="Position-list-order">
                              {order.triggerAboveThreshold ? ">" : "<"} {formatAmount(order.triggerPrice, 30, 2, true)}:
                              {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                              {order.error && (
                                <>
                                  , <span className="negative">{order.error}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">Mark Price</div>
                      <div>${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Entry Price</div>
                      <div>${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">Liq. Price</div>
                      <div>${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    <button className="App-button-option App-card-option" onClick={() => editPosition(position)}>
                      Edit
                    </button>
                    <button className="App-button-option App-card-option" onClick={() => sellPosition(position)}>
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
          {positions.length === 0 && positionsDataIsLoading && (
            <tr>
              <td colSpan="15">
                <div className="Exchange-empty-positions-list-note">Loading...</div>
              </td>
            </tr>
          )}
          {positions.length === 0 && !positionsDataIsLoading && (
            <tr>
              <td colSpan="15">
                <div className="Exchange-empty-positions-list-note">No open positions</div>
              </td>
            </tr>
          )}
          {positions.map((position) => {
            const liquidationPrice = getLiquidationPrice(position) || bigNumberify(0);
            const positionOrders = getOrdersForPosition(position, orders, nativeTokenAddress);
            const hasOrderError = !!positionOrders.find((order) => order.error);
            const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
            const positionDelta =
              position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || bigNumberify(0);
            let borrowFeeText;
            if (position.collateralToken && position.collateralToken.fundingRate) {
              const borrowFeeRate = position.collateralToken.fundingRate
                .mul(position.size)
                .mul(24)
                .div(FUNDING_RATE_PRECISION);
              borrowFeeText = `Borrow Fee / Day: $${formatAmount(borrowFeeRate, USD_DECIMALS, 2)}`;
            }

            return (
              <tr key={position.key}>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  <div className="Exchange-list-title">
                    {position.indexToken.symbol}
                    {position.hasPendingChanges && <ImSpinner2 className="spin position-loading-icon" />}
                  </div>
                  <div className="Exchange-list-info-label">
                    {position.leverage && (
                      <span className="muted">{formatAmount(position.leverage, 4, 2, true)}x&nbsp;</span>
                    )}
                    <span className={cx({ positive: position.isLong, negative: !position.isLong })}>
                      {position.isLong ? "Long" : "Short"}
                    </span>
                  </div>
                </td>
                <td>
                  <div>
                    {!position.netValue && "Opening..."}
                    {position.netValue && (
                      <Tooltip
                        handle={`$${formatAmount(position.netValue, USD_DECIMALS, 2, true)}`}
                        position="left-bottom"
                        handleClassName="plain"
                        renderContent={() => {
                          return (
                            <>
                              Net Value:{" "}
                              {showPnlAfterFees
                                ? "Initial Collateral - Fees + PnL"
                                : "Initial Collateral - Borrow Fee + PnL"}
                              <br />
                              <br />
                              Initial Collateral: ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                              <br />
                              PnL: {position.deltaBeforeFeesStr}
                              <br />
                              Borrow Fee: ${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}
                              <br />
                              Open + Close fee: ${formatAmount(position.positionFee, USD_DECIMALS, 2, true)}
                              <br />
                              <br />
                              PnL After Fees: {position.deltaAfterFeesStr} ({position.deltaAfterFeesPercentageStr})
                            </>
                          );
                        }}
                      />
                    )}
                  </div>
                  {position.deltaStr && (
                    <div
                      className={cx("Exchange-list-info-label", {
                        positive: hasPositionProfit && positionDelta.gt(0),
                        negative: !hasPositionProfit && positionDelta.gt(0),
                        muted: positionDelta.eq(0),
                      })}
                    >
                      {position.deltaStr} ({position.deltaPercentageStr})
                    </div>
                  )}
                </td>
                <td>
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                  {positionOrders.length > 0 && (
                    <div onClick={() => setListSection && setListSection("Orders")}>
                      <Tooltip
                        handle={`Orders (${positionOrders.length})`}
                        position="left-bottom"
                        handleClassName={cx(
                          ["Exchange-list-info-label", "Exchange-position-list-orders", "plain", "clickable"],
                          { muted: !hasOrderError, negative: hasOrderError }
                        )}
                        renderContent={() => {
                          return (
                            <>
                              <strong>Active Orders</strong>
                              {positionOrders.map((order) => {
                                return (
                                  <div
                                    key={`${order.isLong}-${order.type}-${order.index}`}
                                    className="Position-list-order"
                                  >
                                    {order.triggerAboveThreshold ? ">" : "<"}{" "}
                                    {formatAmount(order.triggerPrice, 30, 2, true)}:
                                    {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                                    {order.error && (
                                      <>
                                        , <span className="negative">{order.error}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          );
                        }}
                      />
                    </div>
                  )}
                </td>
                <td>
                  <Tooltip
                    handle={`$${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}`}
                    position="left-bottom"
                    handleClassName={cx("plain", { negative: position.hasLowCollateral })}
                    renderContent={() => {
                      return (
                        <>
                          {position.hasLowCollateral && (
                            <div>
                              WARNING: This position has a low amount of collateral after deducting borrowing fees,
                              deposit more collateral to reduce the position's liquidation risk.
                              <br />
                              <br />
                            </div>
                          )}
                          Initial Collateral: ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                          <br />
                          Borrow Fee: ${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}
                          {borrowFeeText && <div>{borrowFeeText}</div>}
                          <br />
                          Use the "Edit" button to deposit or withdraw collateral.
                        </>
                      );
                    }}
                  />
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  <Tooltip
                    handle={`$${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}`}
                    position="left-bottom"
                    handleClassName="plain clickable"
                    renderContent={() => {
                      return (
                        <>
                          Click on a row to select the position's market, then use the swap box to increase your
                          position size if needed.
                          <br />
                          <br />
                          Use the "Close" button to reduce your position size, or to set stop-loss / take-profit orders.
                        </>
                      );
                    }}
                  />
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  ${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                </td>
                <td>
                  <button
                    className="Exchange-list-action"
                    onClick={() => editPosition(position)}
                    disabled={position.size.eq(0)}
                  >
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    className="Exchange-list-action"
                    onClick={() => sellPosition(position)}
                    disabled={position.size.eq(0)}
                  >
                    Close
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
