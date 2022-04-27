import React, { useCallback, useState, useMemo } from "react";
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
} from "../../Helpers";
import { getConstant } from "../../Constants";
import { getContract } from "../../Addresses";

import { BsArrowRight } from "react-icons/bs";
import Modal from "../Modal/Modal";
import Tooltip from "../Tooltip/Tooltip";
import Checkbox from "../Checkbox/Checkbox";
import ExchangeInfoRow from "./ExchangeInfoRow";
import { getNativeToken, getToken, getWrappedToken } from "../../data/Tokens";
import { useTranslation } from 'react-i18next';

const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS).div(100); // 1%;

function getSpread(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress) {
  if (fromTokenInfo && fromTokenInfo.maxPrice && toTokenInfo && toTokenInfo.minPrice) {
    const fromDiff = fromTokenInfo.maxPrice.sub(fromTokenInfo.minPrice);
    const fromSpread = fromDiff.mul(PRECISION).div(fromTokenInfo.maxPrice);
    const toDiff = toTokenInfo.maxPrice.sub(toTokenInfo.minPrice);
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
  } = props;

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isProfitWarningAccepted, setIsProfitWarningAccepted] = useState(false);
  const { t } = useTranslation();

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
      return t("exchange.Confirm_Limit_Order");
    }
    if (isSwap) {
      return t("exchange.Confirm_Swap");
    }
    return isLong ? t("exchange.Confirm_Long") : t("exchange.Confirm_Short");
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

  const getError = () => {
    if (!isSwap && hasExistingPosition && !isMarketOrder) {
      const { delta, hasProfit } = calculatePositionDelta(triggerPriceUsd, existingPosition);
      if (hasProfit && delta.eq(0)) {
        return t("exchange.Invalid_price_see_warning");
      }
    }
    if (isMarketOrder && hasPendingProfit && !isProfitWarningAccepted) {
      return t("exchange.Forfeit_profit_not_checked");
    }
    return false;
  };

  const getPrimaryText = () => {
    if (!isPendingConfirmation) {
      const error = getError();
      if (error) {
        return error;
      }

      if (isSwap) {
        return title;
      }
      const action = isMarketOrder ? (isLong ? t("exchange.Long") : t("exchange.Short")) : t("exchange.Create_Order");

      if (
        isMarketOrder &&
        MIN_PROFIT_TIME > 0 &&
        hasExistingPosition &&
        existingPosition.delta.eq(0) &&
        existingPosition.pendingDelta.gt(0)
      ) {
        return isLong ? t("exchange.Forfeit_profit_and_action", { action: action }) : t("exchange.Forfeit_profit_and_Short");
      }

      return isMarketOrder && MIN_PROFIT_TIME > 0 ? t("exchange.Accept_minimum_and_action", { action: action }) : action;
    }

    if (!isMarketOrder) {
      return t("exchange.Creating_Order");
    }
    if (isSwap) {
      return t("exchange.Swapping");
    }
    if (isLong) {
      return t("exchange.Longing");
    }
    return t("exchange.Shorting");
  };

  const isPrimaryEnabled = () => {
    if (getError()) {
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
          {t("exchange.confirmation_box_warning")}
        </div>
      );
    }
  }, [isMarketOrder, spread, t]);

  const renderFeeWarning = useCallback(() => {
    if (orderOption === LIMIT || !feeBps || feeBps <= 50) {
      return null;
    }

    if (isSwap) {
      return (
        <div className="Confirmation-box-warning">
          {t("exchange.confirmation_box_warning2", { fromToken: fromToken.symbol, toToken: toToken.symbol })}
        </div>
      );
    }

    if (!collateralTokenAddress) {
      return null;
    }

    const collateralToken = getToken(chainId, collateralTokenAddress);
    return (
      <div className="Confirmation-box-warning">
        {t("exchange.confirmation_box_warning3", { fromToken: fromToken.symbol, collateralToken: collateralToken.symbol })} <br />
        {t("exchange.confirmation_box_warning4", { collateralToken: collateralToken.symbol })}
      </div>
    );
  }, [feeBps, isSwap, collateralTokenAddress, chainId, fromToken.symbol, toToken.symbol, orderOption, t]);

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
              <div dangerouslySetInnerHTML={
                { __html: t("exchange.confirmation_box_warning5", {
                  existingPosition: existingPosition.deltaStr
                }) }
              }></div>
              {t("exchange.Profit_price")}: {existingPosition.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
              {t("exchange.This_rule_only_applies_for_the_next_time", { time: getTimeRemaining(minProfitExpiration), until: formatDateTime(minProfitExpiration) })}
            </div>
          );
        }
        if (!isMarketOrder) {
          const { delta, hasProfit } = calculatePositionDelta(triggerPriceUsd, existingPosition);
          if (hasProfit && delta.eq(0)) {
            const profitPrice = getProfitPrice(existingPosition.markPrice, existingPosition);
            return (
              <div className="Confirmation-box-warning">
                <div dangerouslySetInnerHTML={
                  { __html: t("exchange.confirmation_box_warning6", {
                    existingPosition: existingPosition.deltaStr
                  }) }
                }></div>
                {t("exchange.Profit_price")}: {existingPosition.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
                {t("exchange.This_rule_only_applies_for_the_next_time", { time: getTimeRemaining(minProfitExpiration), until: formatDateTime(minProfitExpiration) })}
              </div>
            );
          }
        }
      }

      return (
        <div className="Confirmation-box-warning">
          <div dangerouslySetInnerHTML={
            { __html: t("exchange.confirmation_box_warning7", {
              minProfitTime: MIN_PROFIT_TIME / 60 / 60
            }) }
          }></div>
        </div>
      );
    }
  }, [isSwap, hasExistingPosition, existingPosition, isMarketOrder, triggerPriceUsd, t]);

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
        <div dangerouslySetInnerHTML={
          { __html: t("exchange.confirmation_box_warning8", {
            existingOrderType: existingOrder.isLong ? "Long" : "Short",
            sizeInToken: sizeInToken,
            indexToken: indexToken.symbol,
            existingOrderSizeDelta: formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true),
            existingOrderTriggerPrice: formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)
          }) }
        }></div>
      </div>
    );
  }, [existingOrder, isSwap, chainId, t]);

  // TODO handle unaprproved order plugin (very unlikely case)
  const renderMain = useCallback(() => {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            {t("exchange.Pay")}&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} ($
            {formatAmount(fromUsdMin, USD_DECIMALS, 2, true)})
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            {t("exchange.Receive")}&nbsp;{formatAmount(toAmount, toToken.decimals, 4, true)} {toToken.symbol} ($
            {formatAmount(toUsdMax, USD_DECIMALS, 2, true)})
          </div>
        </div>
      );
    }

    return (
      <div className="Confirmation-box-main">
        <span>
          {t("exchange.Pay")}&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} ($
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
  }, [isSwap, fromAmount, fromToken, toToken, fromUsdMin, toUsdMax, isLong, toAmount, t]);

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
              ? t('exchange.There_may_not_be_sufficient_liquidity_to_execute_your_order_when_the_price_conditions_are_met')
              : t('exchange.The_order_will_only_execute_if_the_price_conditions_are_met_and_there_is_sufficient_liquidity')
          }
        />
      </ExchangeInfoRow>
    );
  }, [toTokenInfo, shortCollateralToken, isShort, isLong, isSwap, toAmount, toUsdMax, t]);

  const renderMarginSection = useCallback(() => {
    return (
      <>
        <div className="Confirmation-box-info">
          {renderMain()}
          {renderFeeWarning()}
          {renderMinProfitWarning()}
          {renderExistingOrderWarning()}
          {hasPendingProfit && isMarketOrder && (
            <div className="PositionEditor-accept-profit-warning">
              <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                <span className="muted">{t("exchange.Forfeit_profit")}</span>
              </Checkbox>
            </div>
          )}
          {orderOption === LIMIT && renderAvailableLiquidity()}
          {isShort && (
            <ExchangeInfoRow label={t("exchange.Profits_In")}>{getToken(chainId, shortCollateralAddress).symbol}</ExchangeInfoRow>
          )}
          {isLong && <ExchangeInfoRow label={t("exchange.Profits_In")} value={toTokenInfo.symbol} />}
          <ExchangeInfoRow label={t("exchange.Leverage")}>
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
          <ExchangeInfoRow label={t("exchange.Liq_Price")}>
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
          <ExchangeInfoRow label={t("exchange.Fees")}>${formatAmount(feesUsd, USD_DECIMALS, 2, true)}</ExchangeInfoRow>
          <ExchangeInfoRow label={t("exchange.Collateral")}>
            <Tooltip
              handle={`$${formatAmount(collateralAfterFees, USD_DECIMALS, 2, true)}`}
              position="right-bottom"
              renderContent={() => {
                return (
                  <>
                    {t("exchange.Your_positions_collateral_after_deducting_fees")}
                    <br />
                    <br />
                    {t("exchange.Pay_amount")}: ${formatAmount(fromUsdMin, USD_DECIMALS, 2, true)}
                    <br />
                    {t("exchange.Fees")}: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)}
                    <br />
                  </>
                );
              }}
            />
          </ExchangeInfoRow>
          {showSpread && (
            <ExchangeInfoRow label={t("exchange.Spread")} isWarning={spread.isHigh} isTop={true}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          {isMarketOrder && (
            <ExchangeInfoRow label={t("exchange.Entry_Price")}>
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
            <ExchangeInfoRow label={t("exchange.Limit_Price")} isTop={true}>
              ${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}
            </ExchangeInfoRow>
          )}
          <ExchangeInfoRow label={t("exchange.Borrow_Fee")}>
            {isLong && toTokenInfo && formatAmount(toTokenInfo.fundingRate, 4, 4)}
            {isShort && shortCollateralToken && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
            {((isLong && toTokenInfo && toTokenInfo.fundingRate) ||
              (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) &&
              "% / 1h"}
          </ExchangeInfoRow>
          <ExchangeInfoRow label={t("exchange.Allowed_Slippage")}>
            <Tooltip
              handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
              position="right-top"
              renderContent={() => {
                return (
                  <>
                    {t("exchange.You_can_change_this_in_the_settings_menu_on_the_top_right_of_the_page")}
                    <br />
                    <br />
                    {t("exchange.Note_that_a_low_allowed_slippage_e_g_less_than_may_result_in_failed_orders_if_prices_are_volatile")}
                  </>
                );
              }}
            />
          </ExchangeInfoRow>
          {isMarketOrder && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                <span className="muted">{t("exchange.Allow_up_to_slippage")}</span>
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
    renderExistingOrderWarning,
    chainId,
    renderFeeWarning,
    hasPendingProfit,
    isProfitWarningAccepted,
    renderAvailableLiquidity,
    orderOption,
    fromUsdMin,
    collateralAfterFees,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
    allowedSlippage,
    t
  ]);

  const renderSwapSection = useCallback(() => {
    return (
      <>
        <div className="Confirmation-box-info">
          {renderMain()}
          {renderFeeWarning()}
          {renderSpreadWarning()}
          {orderOption === LIMIT && renderAvailableLiquidity()}
          <ExchangeInfoRow label={t("exchange.Min_Receive")}>
            {formatAmount(minOut, toTokenInfo.decimals, 4, true)} {toTokenInfo.symbol}
          </ExchangeInfoRow>
          <ExchangeInfoRow label={t("exchange.Price")}>
            {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromTokenInfo, toTokenInfo)}
          </ExchangeInfoRow>
          {!isMarketOrder && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{t("exchange.Limit_Price")}</div>
              <div className="align-right">{getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}</div>
            </div>
          )}
          {showSpread && (
            <ExchangeInfoRow label={t("exchange.Spread")} isWarning={spread.isHigh}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{t("exchange.Fees")}</div>
            <div className="align-right">
              {formatAmount(feeBps, 2, 2, true)}% ({formatAmount(fees, fromTokenInfo.decimals, 4, true)}{" "}
              {fromTokenInfo.symbol}: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)})
            </div>
          </div>
          {renderExecutionFee()}
          {fromTokenUsd && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{fromTokenInfo.symbol} {t("exchange.Price")}</div>
              <div className="align-right">{fromTokenUsd} USD</div>
            </div>
          )}
          {toTokenUsd && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">{toTokenInfo.symbol} {t("exchange.Price")}</div>
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
    t
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
