import React, { useState } from "react";
import cx from "classnames";
import { Trans, t } from "@lingui/macro";
import Tooltip from "../Tooltip/Tooltip";
import PositionSeller from "./PositionSeller";
import PositionEditor from "./PositionEditor";
import OrdersToa from "./OrdersToa";
import { ImSpinner2 } from "react-icons/im";

import {
  getLiquidationPrice,
  getLeverage,
  getOrderError,
  USD_DECIMALS,
  FUNDING_RATE_PRECISION,
  SWAP,
  LONG,
  SHORT,
  INCREASE,
  DECREASE,
} from "lib/legacy";
import PositionShare from "./PositionShare";
import PositionDropdown from "./PositionDropdown";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import NetValueTooltip from "./NetValueTooltip";
import { helperToast } from "lib/helperToast";
import { getUsd } from "domain/tokens/utils";
import { bigNumberify, formatAmount } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import useAccountType, { AccountType } from "lib/wallets/useAccountType";

const getOrdersForPosition = (account, position, orders, nativeTokenAddress) => {
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
      order.error = getOrderError(account, order, undefined, position);
      if (order.type === DECREASE && order.sizeDelta.gt(position.size)) {
        order.error = t`Order size is bigger than position, will only be executable if position increases`;
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
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
    usdgSupply,
    totalTokenWeights,
    hideActions,
  } = props;

  const [positionToEditKey, setPositionToEditKey] = useState(undefined);
  const [positionToSellKey, setPositionToSellKey] = useState(undefined);
  const [positionToShare, setPositionToShare] = useState(null);
  const [isPositionEditorVisible, setIsPositionEditorVisible] = useState(undefined);
  const [isPositionSellerVisible, setIsPositionSellerVisible] = useState(undefined);
  const [collateralTokenAddress, setCollateralTokenAddress] = useState(undefined);
  const [isPositionShareModalOpen, setIsPositionShareModalOpen] = useState(false);
  const [ordersToaOpen, setOrdersToaOpen] = useState(false);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  const accountType = useAccountType();
  const isContractAccount = accountType === AccountType.CONTRACT;

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
    if (hideActions) return;
    const longOrShortText = position.isLong ? t`Long` : t`Short`;
    helperToast.success(t`${longOrShortText} ${position.indexToken.symbol} market selected`);
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
        minExecutionFee={minExecutionFee}
        minExecutionFeeUSD={minExecutionFeeUSD}
        minExecutionFeeErrorMessage={minExecutionFeeErrorMessage}
        isContractAccount={isContractAccount}
      />
      {ordersToaOpen && (
        <OrdersToa
          setIsVisible={setOrdersToaOpen}
          approveOrderBook={approveOrderBook}
          isPluginApproving={isPluginApproving}
        />
      )}
      {isPositionShareModalOpen && (
        <PositionShare
          setIsPositionShareModalOpen={setIsPositionShareModalOpen}
          isPositionShareModalOpen={isPositionShareModalOpen}
          positionToShare={positionToShare}
          chainId={chainId}
          account={account}
        />
      )}
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
          minExecutionFee={minExecutionFee}
          minExecutionFeeUSD={minExecutionFeeUSD}
          minExecutionFeeErrorMessage={minExecutionFeeErrorMessage}
          usdgSupply={usdgSupply}
          totalTokenWeights={totalTokenWeights}
          isContractAccount={isContractAccount}
        />
      )}
      {positions && (
        <div className="Exchange-list small">
          <div>
            {positions.length === 0 && positionsDataIsLoading && (
              <div className="Exchange-empty-positions-list-note App-card">
                <Trans>Loading...</Trans>
              </div>
            )}
            {positions.length === 0 && !positionsDataIsLoading && (
              <div className="Exchange-empty-positions-list-note App-card">
                <Trans>No open positions</Trans>
              </div>
            )}
            {positions.map((position) => {
              const positionOrders = getOrdersForPosition(account, position, orders, nativeTokenAddress);
              const liquidationPrice = getLiquidationPrice(position);
              const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
              const positionDelta =
                position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || bigNumberify(0);
              let borrowFeeUSD;
              if (position.collateralToken && position.collateralToken.fundingRate) {
                const borrowFeeRate = position.collateralToken.fundingRate
                  .mul(position.size)
                  .mul(24)
                  .div(FUNDING_RATE_PRECISION);
                borrowFeeUSD = formatAmount(borrowFeeRate, USD_DECIMALS, 2, true);
              }

              return (
                <div key={position.key} className="App-card">
                  <div className="App-card-title">
                    <span className="Exchange-list-title">{position.indexToken.symbol}</span>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Leverage</Trans>
                      </div>
                      <div>
                        <span className="Position-leverage">{position.leverageStr}</span>
                        <span
                          className={cx("Exchange-list-side", {
                            positive: position.isLong,
                            negative: !position.isLong,
                          })}
                        >
                          {position.isLong ? t`Long` : t`Short`}
                        </span>
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Size</Trans>
                      </div>
                      <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Collateral</Trans>
                      </div>
                      <div className="position-list-collateral">
                        <Tooltip
                          handle={`$${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          handleClassName={cx("plain", { negative: position.hasLowCollateral })}
                          renderContent={() => {
                            return (
                              <>
                                {position.hasLowCollateral && (
                                  <div>
                                    <Trans>
                                      WARNING: This position has a low amount of collateral after deducting borrowing
                                      fees, deposit more collateral to reduce the position's liquidation risk.
                                    </Trans>
                                    <br />
                                    <br />
                                  </div>
                                )}
                                <StatsTooltipRow
                                  label={t`Initial Collateral`}
                                  value={formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                                />
                                <StatsTooltipRow
                                  label={t`Borrow Fee`}
                                  value={formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}
                                />
                                <StatsTooltipRow
                                  showDollar={false}
                                  label={t`Borrow Fee / Day`}
                                  value={`-$${borrowFeeUSD}`}
                                />

                                {!hideActions && (
                                  <span>
                                    <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                                  </span>
                                )}
                              </>
                            );
                          }}
                        />
                        {!hideActions && (
                          <span className="edit-icon" onClick={() => editPosition(position)}>
                            <AiOutlineEdit fontSize={16} />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>PnL</Trans>
                      </div>
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
                      <div className="label">
                        <Trans>Net Value</Trans>
                      </div>
                      <div>
                        <NetValueTooltip isMobile position={position} />
                      </div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Orders</Trans>
                      </div>
                      <div>
                        {positionOrders.length === 0 && "None"}
                        {positionOrders.map((order) => {
                          const orderText = () => (
                            <>
                              {order.triggerAboveThreshold ? ">" : "<"} {formatAmount(order.triggerPrice, 30, 2, true)}:
                              {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                            </>
                          );
                          if (order.error) {
                            return (
                              <div key={`${order.isLong}-${order.type}-${order.index}`} className="Position-list-order">
                                <Tooltip
                                  className="order-error"
                                  handle={orderText()}
                                  position="right-bottom"
                                  handleClassName="plain"
                                  renderContent={() => <span className="negative">{order.error}</span>}
                                />
                              </div>
                            );
                          } else {
                            return (
                              <div key={`${order.isLong}-${order.type}-${order.index}`} className="Position-list-order">
                                {orderText()}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-content">
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Entry Price</Trans>
                      </div>
                      <div>${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Mark Price</Trans>
                      </div>
                      <div>${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                    <div className="App-card-row">
                      <div className="label">
                        <Trans>Liq. Price</Trans>
                      </div>
                      <div>${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}</div>
                    </div>
                  </div>
                  {!hideActions && (
                    <>
                      <div className="App-card-divider"></div>
                      <div className="App-card-options">
                        <button
                          className="App-button-option App-card-option"
                          disabled={position.size.eq(0)}
                          onClick={() => sellPosition(position)}
                        >
                          <Trans>Close</Trans>
                        </button>
                        <button
                          className="App-button-option App-card-option"
                          disabled={position.size.eq(0)}
                          onClick={() => editPosition(position)}
                        >
                          <Trans>Edit Collateral</Trans>
                        </button>
                        <button
                          className="Exchange-list-action App-button-option App-card-option"
                          onClick={() => {
                            setPositionToShare(position);
                            setIsPositionShareModalOpen(true);
                          }}
                          disabled={position.size.eq(0)}
                        >
                          <Trans>Share</Trans>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <table className="Exchange-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>
              <Trans>Position</Trans>
            </th>
            <th>
              <Trans>Net Value</Trans>
            </th>
            <th>
              <Trans>Size</Trans>
            </th>
            <th>
              <Trans>Collateral</Trans>
            </th>
            <th>
              <Trans>Entry Price</Trans>
            </th>
            <th>
              <Trans>Mark Price</Trans>
            </th>
            <th>
              <Trans>Liq. Price</Trans>
            </th>
            {!hideActions && (
              <>
                <th></th>
                <th></th>
              </>
            )}
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
                <div className="Exchange-empty-positions-list-note">
                  <Trans>No open positions</Trans>
                </div>
              </td>
            </tr>
          )}
          {positions.map((position) => {
            const liquidationPrice = getLiquidationPrice(position) || bigNumberify(0);
            const positionOrders = getOrdersForPosition(account, position, orders, nativeTokenAddress);
            const hasOrderError = !!positionOrders.find((order) => order.error);
            const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
            const positionDelta =
              position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || bigNumberify(0);
            let borrowFeeUSD;
            if (position.collateralToken && position.collateralToken.fundingRate) {
              const borrowFeeRate = position.collateralToken.fundingRate
                .mul(position.size)
                .mul(24)
                .div(FUNDING_RATE_PRECISION);
              borrowFeeUSD = formatAmount(borrowFeeRate, USD_DECIMALS, 2, true);
            }

            return (
              <tr key={position.key}>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  <div className="Exchange-list-title">
                    {!hideActions ? (
                      <Tooltip
                        handle={position.indexToken.symbol}
                        position="left-bottom"
                        handleClassName="plain clickable"
                        renderContent={() => {
                          return (
                            <div>
                              <Trans>
                                Click on a row to select the position's market, then use the trade box to increase your
                                position size if needed.
                              </Trans>
                              <br />
                              <br />
                              <Trans>
                                Use the "Close" button to reduce your position size, or to set stop-loss / take-profit
                                orders.
                              </Trans>
                            </div>
                          );
                        }}
                      />
                    ) : (
                      position.indexToken.symbol
                    )}
                    {position.hasPendingChanges && <ImSpinner2 className="spin position-loading-icon" />}
                  </div>
                  <div className="Exchange-list-info-label">
                    {position.leverageStr && <span className="muted Position-leverage">{position.leverageStr}</span>}
                    <span className={cx({ positive: position.isLong, negative: !position.isLong })}>
                      {position.isLong ? t`Long` : t`Short`}
                    </span>
                  </div>
                </td>
                <td>
                  <div>{position.netValue ? <NetValueTooltip position={position} /> : t`Opening...`}</div>

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
                        handle={t`Orders (${positionOrders.length})`}
                        position="left-bottom"
                        handleClassName={cx(
                          ["Exchange-list-info-label", "Exchange-position-list-orders", "plain", "clickable"],
                          { muted: !hasOrderError, negative: hasOrderError }
                        )}
                        renderContent={() => {
                          return (
                            <>
                              <strong>
                                <Trans>Active Orders</Trans>
                              </strong>
                              {positionOrders.map((order) => {
                                return (
                                  <div
                                    key={`${order.isLong}-${order.type}-${order.index}`}
                                    className="Position-list-order active-order-tooltip"
                                  >
                                    {order.triggerAboveThreshold ? ">" : "<"}{" "}
                                    {formatAmount(order.triggerPrice, 30, 2, true)}:
                                    {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                                    {order.error && <div className="negative active-oredr-error">{order.error}</div>}
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
                  <div className="position-list-collateral">
                    <Tooltip
                      handle={`$${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}`}
                      position="left-bottom"
                      handleClassName={cx("plain", { negative: position.hasLowCollateral })}
                      renderContent={() => {
                        return (
                          <>
                            {position.hasLowCollateral && (
                              <div>
                                <Trans>
                                  WARNING: This position has a low amount of collateral after deducting borrowing fees,
                                  deposit more collateral to reduce the position's liquidation risk.
                                </Trans>
                                <br />
                                <br />
                              </div>
                            )}

                            <StatsTooltipRow
                              label={t`Initial Collateral`}
                              value={formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                            />
                            <StatsTooltipRow
                              label={t`Borrow Fee`}
                              showDollar={false}
                              value={`-$${formatAmount(position.fundingFee, USD_DECIMALS, 2, true)}`}
                            />
                            <StatsTooltipRow
                              showDollar={false}
                              label={t`Borrow Fee / Day`}
                              value={`-$${borrowFeeUSD}`}
                            />
                            {!hideActions && (
                              <>
                                <br />
                                <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                              </>
                            )}
                          </>
                        );
                      }}
                    />
                    {!hideActions && (
                      <span className="edit-icon" onClick={() => editPosition(position)}>
                        <AiOutlineEdit fontSize={16} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  ${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                </td>
                <td className="clickable" onClick={() => onPositionClick(position)}>
                  ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                </td>

                <td>
                  <button
                    className="Exchange-list-action"
                    onClick={() => sellPosition(position)}
                    disabled={position.size.eq(0)}
                  >
                    <Trans>Close</Trans>
                  </button>
                </td>
                {!hideActions && (
                  <td>
                    <PositionDropdown
                      handleEditCollateral={() => {
                        editPosition(position);
                      }}
                      handleShare={() => {
                        setPositionToShare(position);
                        setIsPositionShareModalOpen(true);
                      }}
                      handleMarketSelect={() => {
                        onPositionClick(position);
                      }}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
