import React, { useState, useCallback } from "react";
import { Trans } from "@lingui/macro";

import {
  SWAP,
  INCREASE,
  DECREASE,
  USD_DECIMALS,
  formatAmount,
  getOrderError,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  getExchangeRateDisplay,
  getTokenInfo,
  getExchangeRate,
  getPositionForOrder,
  getUsd,
} from "../../lib/legacy.js";
import { handleCancelOrder } from "../../domain/legacy";
import { getContract } from "../../config/Addresses";

import Tooltip from "../Tooltip/Tooltip";
import OrderEditor from "./OrderEditor";

import "./OrdersList.css";
import Checkbox from "../Checkbox/Checkbox.js";

export default function OrdersList(props) {
  const {
    account,
    library,
    setPendingTxns,
    pendingTxns,
    infoTokens,
    positionsMap,
    totalTokenWeights,
    usdgSupply,
    orders,
    hideActions,
    chainId,
    savedShouldDisableOrderValidation,
    cancelOrderIdList,
    setCancelOrderIdList,
  } = props;

  const [editingOrder, setEditingOrder] = useState(null);

  const onCancelClick = useCallback(
    (order) => {
      handleCancelOrder(chainId, library, order, { pendingTxns, setPendingTxns });
    },
    [library, pendingTxns, setPendingTxns, chainId]
  );

  const onEditClick = useCallback(
    (order) => {
      setEditingOrder(order);
    },
    [setEditingOrder]
  );

  const renderHead = useCallback(() => {
    const isAllOrdersSelected = cancelOrderIdList?.length > 0 && cancelOrderIdList?.length === orders.length;
    return (
      <tr className="Exchange-list-header">
        {orders.length > 0 && (
          <th>
            <div className="checkbox-inline ">
              <Checkbox
                isChecked={isAllOrdersSelected}
                setIsChecked={() => {
                  if (isAllOrdersSelected) {
                    setCancelOrderIdList([]);
                  } else {
                    const allOrderIds = orders.map((o) => `${o.type}-${o.index}`);
                    setCancelOrderIdList(allOrderIds);
                  }
                }}
              />
            </div>
          </th>
        )}

        <th>
          <div>
            <Trans>Type</Trans>
          </div>
        </th>
        <th>
          <div>
            <Trans>Order</Trans>
          </div>
        </th>
        <th>
          <div>
            <Trans>Price</Trans>
          </div>
        </th>
        <th>
          <div>
            <Trans>Mark Price</Trans>
          </div>
        </th>
      </tr>
    );
  }, [cancelOrderIdList, orders, setCancelOrderIdList]);

  const renderEmptyRow = useCallback(() => {
    if (orders && orders.length) {
      return null;
    }

    return (
      <tr>
        <td colSpan="5">
          <Trans>No open orders</Trans>
        </td>
      </tr>
    );
  }, [orders]);

  const renderActions = useCallback(
    (order) => {
      return (
        <>
          <td>
            <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
              <Trans>Edit</Trans>
            </button>
          </td>
          <td>
            <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
              <Trans>Cancel</Trans>
            </button>
          </td>
        </>
      );
    },
    [onEditClick, onCancelClick]
  );

  const renderLargeList = useCallback(() => {
    if (!orders || !orders.length) {
      return null;
    }
    return orders.map((order) => {
      if (order.type === SWAP) {
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromTokenInfo = getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress);
        const toTokenInfo = getTokenInfo(
          infoTokens,
          order.path[order.path.length - 1],
          order.shouldUnwrap,
          nativeTokenAddress
        );

        const markExchangeRate = getExchangeRate(fromTokenInfo, toTokenInfo);
        const orderId = `${order.type}-${order.index}`;

        return (
          <tr className="Exchange-list-item" key={orderId}>
            <td>
              <div className="checkbox-inline ">
                <Checkbox
                  isChecked={cancelOrderIdList?.includes(orderId)}
                  setIsChecked={() => {
                    setCancelOrderIdList((prevState) => {
                      if (prevState.includes(orderId)) {
                        return prevState.filter((i) => i !== orderId);
                      } else {
                        return prevState.concat(orderId);
                      }
                    });
                  }}
                />
              </div>
            </td>
            <td className="Exchange-list-item-type">Limit</td>
            <td>
              Swap{" "}
              {formatAmount(
                order.amountIn,
                fromTokenInfo.decimals,
                fromTokenInfo.isStable || fromTokenInfo.isUsdg ? 2 : 4,
                true
              )}{" "}
              {fromTokenInfo.symbol} for{" "}
              {formatAmount(
                order.minOut,
                toTokenInfo.decimals,
                toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                true
              )}{" "}
              {toTokenInfo.symbol}
            </td>
            <td>
              <Tooltip
                handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
                renderContent={() => `
                  You will receive at least ${formatAmount(
                    order.minOut,
                    toTokenInfo.decimals,
                    toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                    true
                  )} ${
                  toTokenInfo.symbol
                } if this order is executed. The execution price may vary depending on swap fees at the time the order is executed.
                `}
              />
            </td>
            <td>{getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo, true)}</td>
            {!hideActions && renderActions(order)}
          </tr>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken);

      // Longs Increase: max price
      // Longs Decrease: min price
      // Short Increase: min price
      // Short Decrease: max price
      const maximisePrice = (order.type === INCREASE && order.isLong) || (order.type === DECREASE && !order.isLong);

      const markPrice = maximisePrice ? indexToken.contractMaxPrice : indexToken.contractMinPrice;
      const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
      const indexTokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;

      const error = getOrderError(account, order, positionsMap);
      const orderId = `${order.type}-${order.index}`;
      const orderText = (
        <>
          {order.type === INCREASE ? "Increase" : "Decrease"} {indexTokenSymbol} {order.isLong ? "Long" : "Short"}
          &nbsp;by ${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}
          {error && <div className="Exchange-list-item-error">{error}</div>}
        </>
      );

      return (
        <tr className="Exchange-list-item" key={`${order.isLong}-${order.type}-${order.index}`}>
          <td className="Exchange-list-item-type">
            <div>
              <Checkbox
                isChecked={cancelOrderIdList?.includes(orderId)}
                setIsChecked={() => {
                  setCancelOrderIdList((prevState) => {
                    if (prevState.includes(orderId)) {
                      return prevState.filter((i) => i !== orderId);
                    } else {
                      return prevState.concat(orderId);
                    }
                  });
                }}
              />
            </div>
          </td>
          <td className="Exchange-list-item-type">{order.type === INCREASE ? "Limit" : "Trigger"}</td>
          <td>
            {order.type === DECREASE ? (
              orderText
            ) : (
              <Tooltip
                handle={orderText}
                position="right-bottom"
                renderContent={() => {
                  const collateralTokenInfo = getTokenInfo(infoTokens, order.purchaseToken);
                  const collateralUSD = getUsd(order.purchaseTokenAmount, order.purchaseToken, false, infoTokens);
                  return (
                    <span>
                      Collateral: ${formatAmount(collateralUSD, USD_DECIMALS, 2, true)} (
                      {formatAmount(order.purchaseTokenAmount, collateralTokenInfo.decimals, 4, true)}{" "}
                      {collateralTokenInfo.baseSymbol || collateralTokenInfo.symbol})
                    </span>
                  );
                }}
              />
            )}
          </td>
          <td>
            {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
          </td>
          <td>
            <Tooltip
              handle={formatAmount(markPrice, USD_DECIMALS, 2, true)}
              position="right-bottom"
              renderContent={() => {
                return (
                  <Trans>
                    The price that orders can be executed at may differ slightly from the chart price, as market orders
                    update oracle prices, while limit/trigger orders do not.
                  </Trans>
                );
              }}
            />
          </td>
          {!hideActions && renderActions(order)}
        </tr>
      );
    });
  }, [
    orders,
    renderActions,
    infoTokens,
    positionsMap,
    hideActions,
    chainId,
    account,
    cancelOrderIdList,
    setCancelOrderIdList,
  ]);

  const renderSmallList = useCallback(() => {
    if (!orders || !orders.length) {
      return null;
    }

    return orders.map((order) => {
      if (order.type === SWAP) {
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromTokenInfo = getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress);
        const toTokenInfo = getTokenInfo(
          infoTokens,
          order.path[order.path.length - 1],
          order.shouldUnwrap,
          nativeTokenAddress
        );
        const markExchangeRate = getExchangeRate(fromTokenInfo, toTokenInfo);

        return (
          <div key={`${order.type}-${order.index}`} className="App-card">
            <div className="App-card-title-small">
              Swap {formatAmount(order.amountIn, fromTokenInfo.decimals, fromTokenInfo.isStable ? 2 : 4, true)}{" "}
              {fromTokenInfo.symbol} for{" "}
              {formatAmount(order.minOut, toTokenInfo.decimals, toTokenInfo.isStable ? 2 : 4, true)}{" "}
              {toTokenInfo.symbol}
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  <Tooltip
                    position="right-bottom"
                    handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
                    renderContent={() => `
                    You will receive at least ${formatAmount(
                      order.minOut,
                      toTokenInfo.decimals,
                      toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                      true
                    )} ${
                      toTokenInfo.symbol
                    } if this order is executed. The exact execution price may vary depending on fees at the time the order is executed.
                  `}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Mark Price</Trans>
                </div>
                <div>{getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo)}</div>
              </div>
              {!hideActions && (
                <>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    <button className="App-button-option App-card-option" onClick={() => onEditClick(order)}>
                      <Trans>Edit</Trans>
                    </button>
                    <button className="App-button-option App-card-option" onClick={() => onCancelClick(order)}>
                      <Trans>Cancel</Trans>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken);
      const maximisePrice = (order.type === INCREASE && order.isLong) || (order.type === DECREASE && !order.isLong);
      const markPrice = maximisePrice ? indexToken.contractMaxPrice : indexToken.contractMinPrice;
      const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
      const indexTokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;

      const collateralTokenInfo = getTokenInfo(infoTokens, order.purchaseToken);
      const collateralUSD = getUsd(order.purchaseTokenAmount, order.purchaseToken, true, infoTokens);

      const error = getOrderError(account, order, positionsMap);

      return (
        <div key={`${order.isLong}-${order.type}-${order.index}`} className="App-card">
          <div className="App-card-title-small">
            {order.type === INCREASE ? "Increase" : "Decrease"} {indexTokenSymbol} {order.isLong ? "Long" : "Short"}
            &nbsp;by ${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}
            {error && <div className="Exchange-list-item-error">{error}</div>}
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">
                <Trans>Price</Trans>
              </div>
              <div>
                {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Mark Price</Trans>
              </div>
              <div>
                <Tooltip
                  handle={formatAmount(markPrice, USD_DECIMALS, 2, true)}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <Trans>
                        The price that the order can be executed at may differ slightly from the chart price as market
                        orders can change the price while limit / trigger orders cannot.
                      </Trans>
                    );
                  }}
                />
              </div>
            </div>
            {order.type === INCREASE && (
              <div className="App-card-row">
                <div className="label">
                  <Trans>Collateral</Trans>
                </div>
                <div>
                  ${formatAmount(collateralUSD, USD_DECIMALS, 2, true)} (
                  {formatAmount(order.purchaseTokenAmount, collateralTokenInfo.decimals, 4, true)}{" "}
                  {collateralTokenInfo.baseSymbol || collateralTokenInfo.symbol})
                </div>
              </div>
            )}
            {!hideActions && (
              <>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  <button className="App-button-option App-card-option" onClick={() => onEditClick(order)}>
                    <Trans>Edit</Trans>
                  </button>
                  <button className="App-button-option App-card-option" onClick={() => onCancelClick(order)}>
                    <Trans>Cancel</Trans>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    });
  }, [orders, onEditClick, onCancelClick, infoTokens, positionsMap, hideActions, chainId, account]);

  return (
    <React.Fragment>
      <table className="Exchange-list Orders App-box large">
        <tbody>
          {renderHead()}
          {renderEmptyRow()}
          {renderLargeList()}
        </tbody>
      </table>
      <div className="Exchange-list Orders small">
        {(!orders || orders.length === 0) && (
          <div className="Exchange-empty-positions-list-note App-card">No open orders</div>
        )}
        {renderSmallList()}
      </div>
      {editingOrder && (
        <OrderEditor
          account={account}
          order={editingOrder}
          setEditingOrder={setEditingOrder}
          infoTokens={infoTokens}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          getPositionForOrder={getPositionForOrder}
          positionsMap={positionsMap}
          library={library}
          totalTokenWeights={totalTokenWeights}
          usdgSupply={usdgSupply}
          savedShouldDisableOrderValidation={savedShouldDisableOrderValidation}
        />
      )}
    </React.Fragment>
  );
}
