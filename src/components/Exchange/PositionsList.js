import React, { useState } from "react";
import cx from "classnames";
import { Trans, t } from "@lingui/macro";
import Tooltip from "../Tooltip/Tooltip";
import PositionSeller from "./PositionSeller";
import PositionEditor from "./PositionEditor";
import OrdersToa from "./OrdersToa";
import { ImSpinner2 } from "react-icons/im";

import { getOrderError, USD_DECIMALS, FUNDING_RATE_PRECISION, SWAP, LONG, SHORT, INCREASE, DECREASE } from "lib/legacy";
import PositionShare from "./PositionShare";
import PositionDropdown from "./PositionDropdown";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import NetValueTooltip from "./NetValueTooltip";
import { helperToast } from "lib/helperToast";
import { getUsd } from "domain/tokens/utils";
import { formatAmount } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import useAccountType, { AccountType } from "lib/wallets/useAccountType";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { getPriceDecimals } from "config/tokens";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Button from "components/Button/Button";
import { FaAngleRight } from "react-icons/fa";

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
      if (order.type === DECREASE && order.sizeDelta > position.size) {
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
    signer,
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
    openSettings,
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
  const positivePercentage = positionToShare?.hasProfitAfterFees;
  const pnlAfterFeesPercentageSigned =
    positionToShare?.deltaPercentageAfterFees === undefined
      ? undefined
      : positionToShare.deltaPercentageAfterFees * (positivePercentage ? 1n : -1n);

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
        signer={signer}
        collateralTokenAddress={collateralTokenAddress}
        pendingTxns={pendingTxns}
        setPendingTxns={setPendingTxns}
        getUsd={getUsd}
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
          key={positionToShare?.key}
          setIsPositionShareModalOpen={setIsPositionShareModalOpen}
          isPositionShareModalOpen={isPositionShareModalOpen}
          entryPrice={positionToShare.averagePrice}
          indexToken={positionToShare.indexToken}
          isLong={positionToShare.isLong}
          leverage={positionToShare.leverageWithPnl}
          markPrice={positionToShare.markPrice}
          pnlAfterFeesPercentage={pnlAfterFeesPercentageSigned}
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
      {isPositionSellerVisible && positionToSellKey in positionsMap && (
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
          signer={signer}
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
        <>
          {positions.length === 0 && (
            <div className="Exchange-empty-positions-list-note small App-card">
              {positionsDataIsLoading ? <Trans>Loading...</Trans> : <Trans>No open positions</Trans>}
            </div>
          )}
          <div className="Exchange-list small">
            {positions.map((position) => {
              const positionOrders = getOrdersForPosition(account, position, orders, nativeTokenAddress);
              const liquidationPrice = getLiquidationPrice({
                size: position.size,
                collateral: position.collateral,
                averagePrice: position.averagePrice,
                isLong: position.isLong,
                fundingFee: position.fundingFee,
              });

              const positionPriceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);

              const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
              const positionDelta = position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || 0n;
              let borrowFeeUSD;
              if (position.collateralToken && position.collateralToken.fundingRate) {
                const borrowFeeRate =
                  (position.collateralToken.fundingRate * position.size * 24n) / BigInt(FUNDING_RATE_PRECISION);
                borrowFeeUSD = formatAmount(borrowFeeRate, USD_DECIMALS, 2, true);
              }

              return (
                <div key={position.key} className="App-card">
                  <div>
                    <div className="App-card-title Position-card-title" onClick={() => onPositionClick(position)}>
                      <TokenIcon
                        className="PositionList-token-icon"
                        symbol={position.indexToken.symbol}
                        displaySize={20}
                        importSize={24}
                      />
                      <span className="Exchange-list-title">{position.indexToken.symbol}</span>
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
                    <div className="App-card-divider" />
                    <div className="App-card-content">
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
                          <Trans>PnL</Trans>
                        </div>
                        <div>
                          <span
                            className={cx("Exchange-list-info-label Position-pnl", {
                              positive: hasPositionProfit && positionDelta > 0,
                              negative: !hasPositionProfit && positionDelta > 0,
                              muted: positionDelta == 0n,
                            })}
                            onClick={openSettings}
                          >
                            {position.deltaStr} ({position.deltaPercentageStr})
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
                            position="bottom-end"
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
                                    textClassName="text-red-500"
                                  />
                                  <StatsTooltipRow
                                    showDollar={false}
                                    label={t`Borrow Fee / Day`}
                                    value={`-$${borrowFeeUSD}`}
                                    textClassName="text-red-500"
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
                    </div>
                    <div className="App-card-divider" />
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Entry Price</Trans>
                        </div>
                        <div>${formatAmount(position.averagePrice, USD_DECIMALS, positionPriceDecimal, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Mark Price</Trans>
                        </div>
                        <div>${formatAmount(position.markPrice, USD_DECIMALS, positionPriceDecimal, true)}</div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">
                          <Trans>Liq. Price</Trans>
                        </div>
                        <div>${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}</div>
                      </div>
                    </div>
                    <div className="App-card-divider" />
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
                                  position="bottom-end"
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
                  {!hideActions && (
                    <div>
                      <div className="App-card-divider"></div>
                      <div className="remove-top-margin">
                        <Button
                          variant="secondary"
                          className="mr-15 mt-15"
                          disabled={position.size == 0n}
                          onClick={() => sellPosition(position)}
                        >
                          <Trans>Close</Trans>
                        </Button>
                        <Button
                          variant="secondary"
                          className="mr-15 mt-15"
                          disabled={position.size == 0n}
                          onClick={() => editPosition(position)}
                        >
                          <Trans>Edit Collateral</Trans>
                        </Button>
                        <Button
                          variant="secondary"
                          className="mt-15"
                          onClick={() => {
                            setPositionToShare(position);
                            setIsPositionShareModalOpen(true);
                          }}
                          disabled={position.size == 0n}
                        >
                          <Trans>Share</Trans>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
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
          {positions.length === 0 && (
            <tr>
              <td colSpan="15">
                <div className="Exchange-empty-positions-list-note">
                  {positionsDataIsLoading ? <Trans>Loading...</Trans> : <Trans>No open positions</Trans>}
                </div>
              </td>
            </tr>
          )}

          {positions.map((position) => {
            const liquidationPrice =
              getLiquidationPrice({
                size: position.size,
                collateral: position.collateral,
                averagePrice: position.averagePrice,
                isLong: position.isLong,
                fundingFee: position.fundingFee,
              }) || 0n;

            const positionPriceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);
            const positionOrders = getOrdersForPosition(account, position, orders, nativeTokenAddress);
            const hasOrderError = !!positionOrders.find((order) => order.error);
            const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
            const positionDelta = position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || 0n;
            let borrowFeeUSD;
            if (position.collateralToken && position.collateralToken.fundingRate) {
              const borrowFeeRate =
                (position.collateralToken.fundingRate * position.size * 24n) / BigInt(FUNDING_RATE_PRECISION);
              borrowFeeUSD = formatAmount(borrowFeeRate, USD_DECIMALS, 2, true);
            }

            return (
              <tr key={position.key}>
                <td className={!hideActions ? "clickable" : ""} onClick={() => onPositionClick(position)}>
                  <div className="Exchange-list-title" onClick={() => onPositionClick(position)}>
                    {!hideActions ? (
                      <Tooltip
                        handle={
                          <>
                            <TokenIcon
                              className="PositionList-token-icon"
                              symbol={position.indexToken.symbol}
                              displaySize={20}
                              importSize={24}
                            />
                            {position.indexToken.symbol}
                          </>
                        }
                        position="bottom-start"
                        handleClassName="plain clickable"
                        renderContent={() => {
                          return (
                            <div>
                              <Trans>
                                Click on the Position to select its market, then use the trade box to increase your
                                Position Size if needed.
                              </Trans>
                              <br />
                              <br />
                              <Trans>
                                Use the "Close" button to reduce your Position Size, or to set Take-Profit / Stop-Loss
                                Orders.
                              </Trans>
                            </div>
                          );
                        }}
                      />
                    ) : (
                      <div className="inline-flex">
                        <TokenIcon
                          className="PositionList-token-icon"
                          symbol={position.indexToken.symbol}
                          displaySize={20}
                          importSize={24}
                        />
                        {position.indexToken.symbol}
                      </div>
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
                      className={cx("Exchange-list-info-label Position-pnl cursor-pointer", {
                        positive: hasPositionProfit && positionDelta > 0,
                        negative: !hasPositionProfit && positionDelta > 0,
                        muted: positionDelta == 0n,
                      })}
                      onClick={openSettings}
                    >
                      {position.deltaStr} ({position.deltaPercentageStr})
                    </div>
                  )}
                </td>
                <td>
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                  {positionOrders.length > 0 && (
                    <div
                      className="Position-list-active-orders"
                      onClick={() => setListSection && setListSection("Orders")}
                    >
                      <Tooltip
                        handle={t`Orders (${positionOrders.length})`}
                        position="bottom-start"
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
                                const priceDecimal = getPriceDecimals(chainId, order.indexToken.symbol);
                                return (
                                  <div
                                    key={`${order.isLong}-${order.type}-${order.index}`}
                                    className="Position-list-order active-order-tooltip"
                                  >
                                    <div className="Position-list-order-label">
                                      <span>
                                        {order.triggerAboveThreshold ? ">" : "<"}{" "}
                                        {formatAmount(order.triggerPrice, 30, priceDecimal, true)}:
                                        <span>
                                          {order.type === INCREASE ? " +" : " -"}$
                                          {formatAmount(order.sizeDelta, 30, 2, true)}
                                        </span>
                                      </span>
                                      <FaAngleRight fontSize={14} />
                                    </div>
                                    {order.error && <div className="negative active-order-error">{order.error}</div>}
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
                      position="bottom-start"
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
                              textClassName="text-red-500"
                            />
                            <StatsTooltipRow
                              showDollar={false}
                              label={t`Borrow Fee / Day`}
                              value={`-$${borrowFeeUSD}`}
                              textClassName="text-red-500"
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
                <td>${formatAmount(position.averagePrice, USD_DECIMALS, positionPriceDecimal, true)}</td>
                <td>${formatAmount(position.markPrice, USD_DECIMALS, positionPriceDecimal, true)}</td>
                <td>${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}</td>

                {!hideActions && (
                  <td>
                    <button
                      className="Exchange-list-action"
                      onClick={() => sellPosition(position)}
                      disabled={position.size == 0n}
                    >
                      <Trans>Close</Trans>
                    </button>
                  </td>
                )}
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
