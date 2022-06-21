import React, { useCallback, useState, useMemo } from "react";
import "./ConfirmationBox.css";
import {
  USD_DECIMALS,
  PRECISION,
  BASIS_POINTS_DIVISOR,
  LIMIT,
  MIN_PROFIT_TIME,
  INCREASE,
  expandDecimals,
  getExchangeRate,
  getProfitPrice,
  getTimeRemaining,
  formatAmount,
  useLocalStorageSerializeKey,
  getExchangeRateDisplay,
  DEFAULT_SLIPPAGE_AMOUNT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  SLIPPAGE_BPS_KEY,
  formatDateTime,
  calculatePositionDelta,
  DECREASE,
  TRIGGER_PREFIX_ABOVE,
  TRIGGER_PREFIX_BELOW,
} from "../../Helpers";
import { getConstant } from "../../Constants";
import { getContract } from "../../Addresses";

import { BsArrowRight } from "react-icons/bs";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import Checkbox from "../Checkbox/Checkbox";
import ExchangeInfoRow from "./ExchangeInfoRow";
import { cancelDecreaseOrder } from "../../Api";
import { getNativeToken, getToken, getWrappedToken } from "../../data/Tokens";

const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS).div(100); // 1%;

function getSpread(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress) {
  if (fromTokenInfo && fromTokenInfo.maxPrice && toTokenInfo && toTokenInfo.minPrice) {
    const fromDiff = fromTokenInfo.maxPrice.sub(fromTokenInfo.minPrice).div(2);
    const fromSpread = fromDiff.mul(PRECISION).div(fromTokenInfo.maxPrice);
    const toDiff = toTokenInfo.maxPrice.sub(toTokenInfo.minPrice).div(2);
    const toSpread = toDiff.mul(PRECISION).div(toTokenInfo.maxPrice);

    let value = fromSpread.add(toSpread);

    const fromTokenAddress = fromTokenInfo.isNative ? nativeTokenAddress : fromTokenInfo.address;
    const toTokenAddress = toTokenInfo.isNative ? nativeTokenAddress : toTokenInfo.address;

    if (isLong && fromTokenAddress === toTokenAddress) {
      value = fromSpread;
    }

    return {
      value,
      isHigh: value.gt(HIGH_SPREAD_THRESHOLD),
    };
  }
}

export default function ConfirmationBox(props) {
  const {
    fromToken,
    fromTokenInfo,
    toToken,
    toTokenInfo,
    isSwap,
    isLong,
    isMarketOrder,
    orderOption,
    isShort,
    toAmount,
    fromAmount,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
    onConfirmationClick,
    setIsConfirming,
    shortCollateralAddress,
    hasExistingPosition,
    leverage,
    existingPosition,
    existingLiquidationPrice,
    displayLiquidationPrice,
    shortCollateralToken,
    isPendingConfirmation,
    triggerPriceUsd,
    triggerRatio,
    fees,
    feesUsd,
    isSubmitting,
    fromUsdMin,
    toUsdMax,
    nextAveragePrice,
    collateralTokenAddress,
    feeBps,
    chainId,
    orders,
    library,
    setPendingTxns,
    pendingTxns,
  } = props;

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isProfitWarningAccepted, setIsProfitWarningAccepted] = useState(false);
  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);

  let minOut;
  let fromTokenUsd;
  let toTokenUsd;

  let collateralAfterFees = fromUsdMin;
  if (feesUsd) {
    collateralAfterFees = fromUsdMin.sub(feesUsd);
  }

  if (isSwap) {
    minOut = toAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    fromTokenUsd = fromTokenInfo ? formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true) : 0;
    toTokenUsd = toTokenInfo ? formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true) : 0;
  }

  const getTitle = () => {
    if (!isMarketOrder) {
      return "Confirm Limit Order";
    }
    if (isSwap) {
      return "Confirm Swap";
    }
    return isLong ? "Confirm Long" : "Confirm Short";
  };
  const title = getTitle();

  const existingOrder = useMemo(() => {
    const wrappedToken = getWrappedToken(chainId);
    for (const order of orders) {
      if (order.type !== INCREASE) continue;
      const sameToken =
        order.indexToken === wrappedToken.address ? toToken.isNative : order.indexToken === toToken.address;
      if (order.isLong === isLong && sameToken) {
        return order;
      }
    }
  }, [orders, chainId, isLong, toToken.address, toToken.isNative]);

  const existingTriggerOrders = useMemo(() => {
    const wrappedToken = getWrappedToken(chainId);
    return orders.filter((order) => {
      if (order.type !== DECREASE) return false;
      const sameToken =
        order.indexToken === wrappedToken.address ? toToken.isNative : order.indexToken === toToken.address;
      return order.isLong === isLong && sameToken;
    });
  }, [orders, chainId, isLong, toToken.address, toToken.isNative]);

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    return existingTriggerOrders.filter((order) => {
      if (order.triggerAboveThreshold) {
        return existingPosition.markPrice.gte(order.triggerPrice);
      } else {
        return existingPosition.markPrice.lte(order.triggerPrice);
      }
    });
  }, [existingPosition, existingTriggerOrders]);

  const getError = () => {
    if (!isSwap && hasExistingPosition && !isMarketOrder) {
      const { delta, hasProfit } = calculatePositionDelta(triggerPriceUsd, existingPosition);
      if (hasProfit && delta.eq(0)) {
        return "Invalid price, see warning";
      }
    }
    if (isMarketOrder && hasPendingProfit && !isProfitWarningAccepted) {
      return "Forfeit profit not checked";
    }
    return false;
  };

  const getPrimaryText = () => {
    if (decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return `Accept confirmation of trigger orders`;
    }

    if (!isPendingConfirmation) {
      const error = getError();
      if (error) {
        return error;
      }

      if (isSwap) {
        return title;
      }
      const action = isMarketOrder ? (isLong ? "Long" : "Short") : "Create Order";

      if (
        isMarketOrder &&
        MIN_PROFIT_TIME > 0 &&
        hasExistingPosition &&
        existingPosition.delta.eq(0) &&
        existingPosition.pendingDelta.gt(0)
      ) {
        return isLong ? `Forfeit profit and ${action}` : `Forfeit profit and Short`;
      }

      return isMarketOrder && MIN_PROFIT_TIME > 0 ? `Accept minimum and ${action}` : action;
    }

    if (!isMarketOrder) {
      return "Creating Order...";
    }
    if (isSwap) {
      return "Swapping...";
    }
    if (isLong) {
      return "Longing...";
    }
    return "Shorting...";
  };

  const isPrimaryEnabled = () => {
    if (getError()) {
      return false;
    }
    if (decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return false;
    }
    return !isPendingConfirmation && !isSubmitting;
  };

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const spread = getSpread(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress);
  // it's meaningless for limit/stop orders to show spread based on current prices
  const showSpread = isMarketOrder && !!spread;

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const renderSpreadWarning = useCallback(() => {
    if (!isMarketOrder) {
      return null;
    }

    if (spread && spread.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          The spread is > 1%, please ensure the trade details are acceptable before comfirming
        </div>
      );
    }
  }, [isMarketOrder, spread]);

  const renderFeeWarning = useCallback(() => {
    if (orderOption === LIMIT || !feeBps || feeBps <= 50) {
      return null;
    }

    if (isSwap) {
      return (
        <div className="Confirmation-box-warning">
          Fees are high to swap from {fromToken.symbol} to {toToken.symbol}.
        </div>
      );
    }

    if (!collateralTokenAddress) {
      return null;
    }

    const collateralToken = getToken(chainId, collateralTokenAddress);
    return (
      <div className="Confirmation-box-warning">
        Fees are high to swap from {fromToken.symbol} to {collateralToken.symbol}. <br />
        {collateralToken.symbol} is needed for collateral.
      </div>
    );
  }, [feeBps, isSwap, collateralTokenAddress, chainId, fromToken.symbol, toToken.symbol, orderOption]);

  const hasPendingProfit =
    MIN_PROFIT_TIME > 0 && existingPosition && existingPosition.delta.eq(0) && existingPosition.pendingDelta.gt(0);

  const renderMinProfitWarning = useCallback(() => {
    if (MIN_PROFIT_TIME === 0) {
      return null;
    }
    if (!isSwap) {
      if (hasExistingPosition) {
        const minProfitExpiration = existingPosition.lastIncreasedTime + MIN_PROFIT_TIME;
        if (isMarketOrder && existingPosition.delta.eq(0) && existingPosition.pendingDelta.gt(0)) {
          const profitPrice = getProfitPrice(existingPosition.markPrice, existingPosition);
          return (
            <div className="Confirmation-box-warning">
              Increasing this position at the current price will forfeit a&nbsp;
              <a
                href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change"
                target="_blank"
                rel="noopener noreferrer"
              >
                pending profit
              </a>{" "}
              of {existingPosition.deltaStr}.<br />
              <br />
              Profit price: {existingPosition.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
              This rule only applies for the next {getTimeRemaining(minProfitExpiration)}, until{" "}
              {formatDateTime(minProfitExpiration)}.
            </div>
          );
        }
        if (!isMarketOrder) {
          const { delta, hasProfit } = calculatePositionDelta(triggerPriceUsd, existingPosition);
          if (hasProfit && delta.eq(0)) {
            const profitPrice = getProfitPrice(existingPosition.markPrice, existingPosition);
            return (
              <div className="Confirmation-box-warning">
                This order will forfeit a&nbsp;
                <a
                  href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  profit
                </a>{" "}
                of {existingPosition.deltaStr}.<br />
                Profit price: {existingPosition.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
                This rule only applies for the next {getTimeRemaining(minProfitExpiration)}, until{" "}
                {formatDateTime(minProfitExpiration)}.
              </div>
            );
          }
        }
      }

      return (
        <div className="Confirmation-box-warning">
          A minimum price change of&nbsp;
          <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
            1.5%
          </a>{" "}
          is required for a position to be in profit. This only applies for the first {MIN_PROFIT_TIME / 60 / 60} hours
          after increasing a position.
        </div>
      );
    }
  }, [isSwap, hasExistingPosition, existingPosition, isMarketOrder, triggerPriceUsd]);

  const renderExistingOrderWarning = useCallback(() => {
    if (isSwap || !existingOrder) {
      return;
    }
    const indexToken = getToken(chainId, existingOrder.indexToken);
    const sizeInToken = formatAmount(
      existingOrder.sizeDelta.mul(PRECISION).div(existingOrder.triggerPrice),
      USD_DECIMALS,
      4,
      true
    );
    return (
      <div className="Confirmation-box-warning">
        You have an active Limit Order to Increase {existingOrder.isLong ? "Long" : "Short"} {sizeInToken}{" "}
        {indexToken.symbol} (${formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true)}) at price $
        {formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)}
      </div>
    );
  }, [existingOrder, isSwap, chainId]);

  const renderExistingTriggerErrors = useCallback(() => {
    if (isSwap || decreaseOrdersThatWillBeExecuted?.length < 1) {
      return;
    }
    const existingTriggerOrderLength = decreaseOrdersThatWillBeExecuted.length;
    const orderText = existingTriggerOrderLength > 1 ? "orders" : "order";
    return (
      <>
        <div className="Confirmation-box-warning">
          You have {existingTriggerOrderLength > 1 ? `${existingTriggerOrderLength}` : "an"} active trigger {orderText}{" "}
          that might execute immediately after you open this position. Please cancel the {orderText} or accept the
          confirmation to continue.
        </div>
        <ul className="trigger-order-list">
          {decreaseOrdersThatWillBeExecuted.map((order, i) => {
            const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
            const indexToken = getToken(chainId, order.indexToken);
            return (
              <li key={`${order.account}-${i}`}>
                <p>
                  {order.type === INCREASE ? "Increase" : "Decrease"} {indexToken.symbol}{" "}
                  {order.isLong ? "Long" : "Short"}
                  &nbsp;{triggerPricePrefix} ${formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
                </p>
                <button
                  onClick={() =>
                    cancelDecreaseOrder(chainId, library, order.index, {
                      successMsg: "Order cancelled",
                      failMsg: "Cancel failed",
                      sentMsg: "Cancel submitted",
                      pendingTxns,
                      setPendingTxns,
                    })
                  }
                >
                  Cancel
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  }, [decreaseOrdersThatWillBeExecuted, isSwap, chainId, library, pendingTxns, setPendingTxns]);

  const renderExistingTriggerWarning = useCallback(() => {
    if (
      isSwap ||
      existingTriggerOrders.length < 1 ||
      decreaseOrdersThatWillBeExecuted.length > 0 ||
      renderExistingOrderWarning()
    ) {
      return;
    }
    const existingTriggerOrderLength = existingTriggerOrders.length;
    return (
      <div className="Confirmation-box-warning">
        You have {existingTriggerOrderLength > 1 ? `${existingTriggerOrderLength}` : "an"} active trigger{" "}
        {existingTriggerOrderLength > 1 ? "orders" : "order"} that could impact this position.
      </div>
    );
  }, [existingTriggerOrders, isSwap, decreaseOrdersThatWillBeExecuted, renderExistingOrderWarning]);

  // TODO handle unaprproved order plugin (very unlikely case)
  const renderMain = useCallback(() => {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            Pay&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} ($
            {formatAmount(fromUsdMin, USD_DECIMALS, 2, true)})
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            Receive&nbsp;{formatAmount(toAmount, toToken.decimals, 4, true)} {toToken.symbol} ($
            {formatAmount(toUsdMax, USD_DECIMALS, 2, true)})
          </div>
        </div>
      );
    }

    return (
      <div className="Confirmation-box-main">
        <span>
          Pay&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} ($
          {formatAmount(fromUsdMin, USD_DECIMALS, 2, true)})
        </span>
        <div className="Confirmation-box-main-icon"></div>
        <div>
          {isLong ? "Long" : "Short"}&nbsp;
          {formatAmount(toAmount, toToken.decimals, 4, true)} {toToken.symbol} ($
          {formatAmount(toUsdMax, USD_DECIMALS, 2, true)})
        </div>
      </div>
    );
  }, [isSwap, fromAmount, fromToken, toToken, fromUsdMin, toUsdMax, isLong, toAmount]);

  const SWAP_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "SWAP_ORDER_EXECUTION_GAS_FEE");
  const INCREASE_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "INCREASE_ORDER_EXECUTION_GAS_FEE");
  const executionFee = isSwap ? SWAP_ORDER_EXECUTION_GAS_FEE : INCREASE_ORDER_EXECUTION_GAS_FEE;
  const renderExecutionFee = useCallback(() => {
    if (isMarketOrder) {
      return null;
    }
    return (
      <ExchangeInfoRow label="Execution Fee">
        {formatAmount(executionFee, 18, 4)} {getNativeToken(chainId).symbol}
      </ExchangeInfoRow>
    );
  }, [isMarketOrder, executionFee, chainId]);

  const renderAvailableLiquidity = useCallback(() => {
    let availableLiquidity;
    const riskThresholdBps = 5000;
    let isLiquidityRisk;
    const token = isSwap || isLong ? toTokenInfo : shortCollateralToken;

    if (!token || !token.poolAmount || !token.availableAmount) {
      return null;
    }

    if (isSwap) {
      const poolWithoutBuffer = token.poolAmount.sub(token.bufferAmount);
      availableLiquidity = token.availableAmount.gt(poolWithoutBuffer) ? poolWithoutBuffer : token.availableAmount;
      isLiquidityRisk = availableLiquidity.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(toAmount);
    } else {
      if (isShort) {
        availableLiquidity = token.availableAmount;

        let adjustedMaxGlobalShortSize;

        if (toTokenInfo.maxAvailableShort && toTokenInfo.maxAvailableShort.gt(0)) {
          adjustedMaxGlobalShortSize = toTokenInfo.maxAvailableShort
            .mul(expandDecimals(1, token.decimals))
            .div(expandDecimals(1, USD_DECIMALS));
        }

        if (adjustedMaxGlobalShortSize && adjustedMaxGlobalShortSize.lt(token.availableAmount)) {
          availableLiquidity = adjustedMaxGlobalShortSize;
        }

        const sizeTokens = toUsdMax.mul(expandDecimals(1, token.decimals)).div(token.minPrice);
        isLiquidityRisk = availableLiquidity.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(sizeTokens);
      } else {
        availableLiquidity = token.availableAmount;
        isLiquidityRisk = availableLiquidity.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(toAmount);
      }
    }

    if (!availableLiquidity) {
      return null;
    }

    return (
      <ExchangeInfoRow label="Available Liquidity">
        <Tooltip
          position="right-bottom"
          handleClassName={isLiquidityRisk ? "negative" : null}
          handle={
            <>
              {formatAmount(availableLiquidity, token.decimals, token.isStable ? 0 : 2, true)} {token.symbol}
            </>
          }
          renderContent={() =>
            isLiquidityRisk
              ? "There may not be sufficient liquidity to execute your order when the price conditions are met"
              : "The order will only execute if the price conditions are met and there is sufficient liquidity"
          }
        />
      </ExchangeInfoRow>
    );
  }, [toTokenInfo, shortCollateralToken, isShort, isLong, isSwap, toAmount, toUsdMax]);

  const renderMarginSection = useCallback(() => {
    return (
      <>
        <div className="Confirmation-box-info">
          {renderMain()}
          {renderFeeWarning()}
          {renderMinProfitWarning()}
          {renderExistingOrderWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {hasPendingProfit && isMarketOrder && (
            <div className="PositionEditor-accept-profit-warning">
              <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                <span className="muted">Forfeit profit</span>
              </Checkbox>
            </div>
          )}
          {orderOption === LIMIT && renderAvailableLiquidity()}
          {isShort && (
            <ExchangeInfoRow label="Profits In">{getToken(chainId, shortCollateralAddress).symbol}</ExchangeInfoRow>
          )}
          {isLong && <ExchangeInfoRow label="Profits In" value={toTokenInfo.symbol} />}
          <ExchangeInfoRow label="Leverage">
            {hasExistingPosition && toAmount && toAmount.gt(0) && (
              <div className="inline-block muted">
                {formatAmount(existingPosition.leverage, 4, 2)}x
                <BsArrowRight className="transition-arrow" />
              </div>
            )}
            {toAmount && leverage && leverage.gt(0) && `${formatAmount(leverage, 4, 2)}x`}
            {!toAmount && leverage && leverage.gt(0) && `-`}
            {leverage && leverage.eq(0) && `-`}
          </ExchangeInfoRow>
          <ExchangeInfoRow label="Liq. Price">
            {hasExistingPosition && toAmount && toAmount.gt(0) && (
              <div className="inline-block muted">
                ${formatAmount(existingLiquidationPrice, USD_DECIMALS, 2, true)}
                <BsArrowRight className="transition-arrow" />
              </div>
            )}
            {toAmount && displayLiquidationPrice && `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, 2, true)}`}
            {!toAmount && displayLiquidationPrice && `-`}
            {!displayLiquidationPrice && `-`}
          </ExchangeInfoRow>
          <ExchangeInfoRow label="Fees">${formatAmount(feesUsd, USD_DECIMALS, 2, true)}</ExchangeInfoRow>
          <ExchangeInfoRow label="Collateral">
            <Tooltip
              handle={`$${formatAmount(collateralAfterFees, USD_DECIMALS, 2, true)}`}
              position="right-bottom"
              renderContent={() => {
                return (
                  <>
                    Your position's collateral after deducting fees.
                    <br />
                    <br />
                    Pay amount: ${formatAmount(fromUsdMin, USD_DECIMALS, 2, true)}
                    <br />
                    Fees: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)}
                    <br />
                  </>
                );
              }}
            />
          </ExchangeInfoRow>
          {showSpread && (
            <ExchangeInfoRow label="Spread" isWarning={spread.isHigh} isTop={true}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          {isMarketOrder && (
            <ExchangeInfoRow label="Entry Price">
              {hasExistingPosition && toAmount && toAmount.gt(0) && (
                <div className="inline-block muted">
                  ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, 2, true)}
                  <BsArrowRight className="transition-arrow" />
                </div>
              )}
              {nextAveragePrice && `$${formatAmount(nextAveragePrice, USD_DECIMALS, 2, true)}`}
              {!nextAveragePrice && `-`}
            </ExchangeInfoRow>
          )}
          {!isMarketOrder && (
            <ExchangeInfoRow label="Limit Price" isTop={true}>
              ${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}
            </ExchangeInfoRow>
          )}
          <ExchangeInfoRow label="Borrow Fee">
            {isLong && toTokenInfo && formatAmount(toTokenInfo.fundingRate, 4, 4)}
            {isShort && shortCollateralToken && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
            {((isLong && toTokenInfo && toTokenInfo.fundingRate) ||
              (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) &&
              "% / 1h"}
          </ExchangeInfoRow>
          <ExchangeInfoRow label="Allowed Slippage">
            <Tooltip
              handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
              position="right-top"
              renderContent={() => {
                return (
                  <>
                    You can change this in the settings menu on the top right of the page.
                    <br />
                    <br />
                    Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices are
                    volatile.
                  </>
                );
              }}
            />
          </ExchangeInfoRow>
          {isMarketOrder && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                <span className="muted font-sm">Allow up to 1% slippage</span>
              </Checkbox>
            </div>
          )}
          {decreaseOrdersThatWillBeExecuted.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="muted font-sm">I am aware of the trigger orders</span>
              </Checkbox>
            </div>
          )}
          {renderExecutionFee()}
        </div>
      </>
    );
  }, [
    renderMain,
    renderMinProfitWarning,
    shortCollateralAddress,
    isShort,
    isLong,
    toTokenInfo,
    nextAveragePrice,
    toAmount,
    hasExistingPosition,
    existingPosition,
    isMarketOrder,
    triggerPriceUsd,
    showSpread,
    spread,
    displayLiquidationPrice,
    existingLiquidationPrice,
    feesUsd,
    leverage,
    renderExecutionFee,
    shortCollateralToken,
    chainId,
    renderFeeWarning,
    hasPendingProfit,
    isProfitWarningAccepted,
    renderAvailableLiquidity,
    orderOption,
    fromUsdMin,
    collateralAfterFees,
    renderExistingOrderWarning,
    renderExistingTriggerWarning,
    renderExistingTriggerErrors,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
    allowedSlippage,
    isTriggerWarningAccepted,
    decreaseOrdersThatWillBeExecuted,
  ]);

  const renderSwapSection = useCallback(() => {
    return (
      <>
        <div className="Confirmation-box-info">
          {renderMain()}
          {renderFeeWarning()}
          {renderSpreadWarning()}
          {orderOption === LIMIT && renderAvailableLiquidity()}
          <ExchangeInfoRow label="Min. Receive">
            {formatAmount(minOut, toTokenInfo.decimals, 4, true)} {toTokenInfo.symbol}
          </ExchangeInfoRow>
          <ExchangeInfoRow label="Price">
            {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromTokenInfo, toTokenInfo)}
          </ExchangeInfoRow>
          {!isMarketOrder && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Limit Price</div>
              <div className="align-right">{getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}</div>
            </div>
          )}
          {showSpread && (
            <ExchangeInfoRow label="Spread" isWarning={spread.isHigh}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Fees</div>
            <div className="align-right">
              {formatAmount(feeBps, 2, 2, true)}% ({formatAmount(fees, fromTokenInfo.decimals, 4, true)}{" "}
              {fromTokenInfo.symbol}: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)})
            </div>
          </div>
          {renderExecutionFee()}
          {fromTokenUsd && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{fromTokenInfo.symbol} Price</div>
              <div className="align-right">{fromTokenUsd} USD</div>
            </div>
          )}
          {toTokenUsd && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{toTokenInfo.symbol} Price</div>
              <div className="align-right">{toTokenUsd} USD</div>
            </div>
          )}
        </div>
      </>
    );
  }, [
    renderMain,
    renderSpreadWarning,
    fromTokenInfo,
    toTokenInfo,
    orderOption,
    showSpread,
    spread,
    feesUsd,
    feeBps,
    renderExecutionFee,
    fromTokenUsd,
    toTokenUsd,
    triggerRatio,
    fees,
    isMarketOrder,
    minOut,
    renderFeeWarning,
    renderAvailableLiquidity,
  ]);

  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={() => setIsConfirming(false)} label={title}>
        {isSwap && renderSwapSection()}
        {!isSwap && renderMarginSection()}
        <div className="Confirmation-box-row">
          <button
            onClick={onConfirmationClick}
            className="App-cta Confirmation-box-button"
            disabled={!isPrimaryEnabled()}
          >
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}
