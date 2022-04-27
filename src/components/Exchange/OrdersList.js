import React, { useState, useCallback } from "react";

import {
  SWAP,
  INCREASE,
  DECREASE,
  USD_DECIMALS,
  formatAmount,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
  getExchangeRateDisplay,
  getTokenInfo,
  getExchangeRate,
  getPositionKey,
} from "../../Helpers.js";
import { cancelSwapOrder, cancelIncreaseOrder, cancelDecreaseOrder } from "../../Api";
import { getContract } from "../../Addresses";

import Tooltip from "../Tooltip/Tooltip";
import OrderEditor from "./OrderEditor";

import "./OrdersList.css";
import { useTranslation } from 'react-i18next';

function getPositionForOrder(account, order, positionsMap) {
  const key = getPositionKey(account, order.collateralToken, order.indexToken, order.isLong);
  const position = positionsMap[key];
  return position && position.size && position.size.gt(0) ? position : null;
}

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
  } = props;
  const { t } = useTranslation();

  const [editingOrder, setEditingOrder] = useState(null);

  const onCancelClick = useCallback(
    (order) => {
      let func;
      if (order.type === SWAP) {
        func = cancelSwapOrder;
      } else if (order.type === INCREASE) {
        func = cancelIncreaseOrder;
      } else if (order.type === DECREASE) {
        func = cancelDecreaseOrder;
      }

      return func(chainId, library, order.index, {
        successMsg: t("exchange.Order_cancelled"),
        failMsg: t("exchange.Cancel_failed"),
        sentMsg: t("exchange.Cancel_submitted"),
        pendingTxns,
        setPendingTxns,
      });
    },
    [library, pendingTxns, setPendingTxns, chainId, t]
  );

  const onEditClick = useCallback(
    (order) => {
      setEditingOrder(order);
    },
    [setEditingOrder]
  );

  const renderHead = useCallback(() => {
    return (
      <tr className="Exchange-list-header">
        <th>
          <div>{t("exchange.Type")}</div>
        </th>
        <th>
          <div>{t("exchange.Order")}</div>
        </th>
        <th>
          <div>{t("exchange.Price")}</div>
        </th>
        <th>
          <div>{t("exchange.Mark_Price")}</div>
        </th>
        <th colSpan="2"></th>
      </tr>
    );
  }, [t]);

  const renderEmptyRow = useCallback(() => {
    if (orders && orders.length) {
      return null;
    }

    return (
      <tr>
        <td colSpan="5">{t("exchange.No_open_orders")}</td>
      </tr>
    );
  }, [orders, t]);

  const renderActions = useCallback(
    (order) => {
      return (
        <>
          <td>
            <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
              {t("exchange.Edit")}
            </button>
          </td>
          <td>
            <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
              {t("exchange.Cancel")}
            </button>
          </td>
        </>
      );
    },
    [onEditClick, onCancelClick, t]
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

        return (
          <tr className="Exchange-list-item" key={`${order.type}-${order.index}`}>
            <td className="Exchange-list-item-type">{t("exchange.Limit")}</td>
            <td>
              {t("exchange.Swap")}{" "}
              {formatAmount(
                order.amountIn,
                fromTokenInfo.decimals,
                fromTokenInfo.isStable || fromTokenInfo.isUsdg ? 2 : 4,
                true
              )}{" "}
              {fromTokenInfo.symbol} {t("exchange.for")}{" "}
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
                renderContent={() => t("exchange.You_will_receive_at_least_amount_symbol_if_this_order_is_executed_The_execution_price_may_vary_depending_on_swap_fees_at_the_time_the_order_is_executed", {
                  amount: formatAmount(
                    order.minOut,
                    toTokenInfo.decimals,
                    toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                    true
                  ), symbol: toTokenInfo.symbol
                })}
              />
            </td>
            <td>{getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo, true)}</td>
            {!hideActions && renderActions(order)}
          </tr>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken);
      const maximisePrice = (order.type === INCREASE && order.isLong) || (order.type === DECREASE && !order.isLong);
      const markPrice = maximisePrice ? indexToken.contractMaxPrice : indexToken.contractMinPrice;
      const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
      const indexTokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;

      let error;
      if (order.type === DECREASE) {
        const positionForOrder = getPositionForOrder(account, order, positionsMap);
        if (!positionForOrder) {
          error = t("exchange.No_open_position_order_cannot_be_executed");
        } else if (positionForOrder.size.lt(order.sizeDelta)) {
          error = t("exchange.Order_size_exceeds_position_size_order_cannot_be_executed");
        }
      }

      return (
        <tr className="Exchange-list-item" key={`${order.isLong}-${order.type}-${order.index}`}>
          <td className="Exchange-list-item-type">{order.type === INCREASE ? t("exchange.Limit") : t("exchange.Trigger")}</td>
          <td>
            {order.type === INCREASE ? t("exchange.Increase") : t("exchange.Decrease")} {indexTokenSymbol} {order.isLong ? t("exchange.Long") : t("exchange.Short")}
            &nbsp;{t("exchange.by")} ${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}
            {error && <div className="Exchange-list-item-error">{error}</div>}
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
                  <>
                    {t("exchange.The_price_that_the_order_can_be_executed_at_may_differ_slightly_from_the_chart_price_as_market_orders_can_change_the_price_while_limit_orders_cannot")}
                  </>
                );
              }}
            />
          </td>
          {!hideActions && renderActions(order)}
        </tr>
      );
    });
  }, [orders, renderActions, infoTokens, positionsMap, hideActions, chainId, account, t]);

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
              {t("exchange.Swap")} {formatAmount(order.amountIn, fromTokenInfo.decimals, fromTokenInfo.isStable ? 2 : 4, true)}{" "}
              {fromTokenInfo.symbol} {t("exchange.for")}{" "}
              {formatAmount(order.minOut, toTokenInfo.decimals, toTokenInfo.isStable ? 2 : 4, true)}{" "}
              {toTokenInfo.symbol}
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">{t("exchange.Price")}</div>
                <div>
                  <Tooltip
                    position="right-bottom"
                    handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
                    renderContent={() => t("exchange.You_will_receive_at_least_amount_symbol_if_this_order_is_executed_The_execution_price_may_vary_depending_on_swap_fees_at_the_time_the_order_is_executed", {
                      amount: formatAmount(
                        order.minOut,
                        toTokenInfo.decimals,
                        toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                        true
                      ), symbol: toTokenInfo.symbol
                    })}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{t("exchange.Mark_Price")}</div>
                <div>{getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo)}</div>
              </div>
              {!hideActions && (
                <>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    <button className="App-button-option App-card-option" onClick={() => onEditClick(order)}>
                      {t("exchange.Edit")}
                    </button>
                    <button className="App-button-option App-card-option" onClick={() => onCancelClick(order)}>
                      {t("exchange.Cancel")}
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

      let error;
      if (order.type === DECREASE) {
        const positionForOrder = getPositionForOrder(account, order, positionsMap);
        if (!positionForOrder) {
          error = t("exchange.There_is_no_open_position_for_the_order_it_can_t_be_executed");
        } else if (positionForOrder.size.lt(order.sizeDelta)) {
          error = t("exchange.The_order_size_is_bigger_than_position_it_can_t_be_executed");
        }
      }

      return (
        <div key={`${order.isLong}-${order.type}-${order.index}`} className="App-card">
          <div className="App-card-title-small">
            {order.type === INCREASE ? t("exchange.Increase") : t("exchange.Decrease")} {indexTokenSymbol} {order.isLong ? t("exchange.Long") : t("exchange.Short")}
            &nbsp;{t("exchange.by")} ${formatAmount(order.sizeDelta, USD_DECIMALS, 2, true)}
            {error && <div className="Exchange-list-item-error">{error}</div>}
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">{t("exchange.Price")}</div>
              <div>
                {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">{t("exchange.Mark_Price")}</div>
              <div>
                <Tooltip
                  handle={formatAmount(markPrice, USD_DECIMALS, 2, true)}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        {t("exchange.The_price_that_the_order_can_be_executed_at_may_differ_slightly_from_the_chart_price_as_market_orders_can_change_the_price_while_limit_orders_cannot")}
                      </>
                    );
                  }}
                />
              </div>
            </div>
            {!hideActions && (
              <>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  <button className="App-button-option App-card-option" onClick={() => onEditClick(order)}>
                    {t("exchange.Edit")}
                  </button>
                  <button className="App-button-option App-card-option" onClick={() => onCancelClick(order)}>
                    {t("exchange.Cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    });
  }, [orders, onEditClick, onCancelClick, infoTokens, positionsMap, hideActions, chainId, account, t]);

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
          <div className="Exchange-empty-positions-list-note App-card">{t("exchange.No_open_orders")}</div>
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
        />
      )}
    </React.Fragment>
  );
}
