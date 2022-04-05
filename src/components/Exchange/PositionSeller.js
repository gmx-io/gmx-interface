import React, { useState, useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { ethers } from "ethers";

import { BsArrowRight } from "react-icons/bs";

import {
  formatAmount,
  bigNumberify,
  DEFAULT_SLIPPAGE_AMOUNT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  USD_DECIMALS,
  DUST_USD,
  BASIS_POINTS_DIVISOR,
  USDG_ADDRESS,
  SLIPPAGE_BPS_KEY,
  TRIGGER_PREFIX_BELOW,
  TRIGGER_PREFIX_ABOVE,
  MIN_PROFIT_TIME,
  fetcher,
  usePrevious,
  formatAmountFree,
  parseValue,
  expandDecimals,
  getTokenInfo,
  getLiquidationPrice,
  getLeverage,
  getMarginFee,
  PRECISION,
  MARKET,
  STOP,
  DECREASE,
  useLocalStorageSerializeKey,
  calculatePositionDelta,
  getDeltaStr,
  getProfitPrice,
  formatDateTime,
  getTimeRemaining,
} from "../../Helpers";
import { getConstant } from "../../Constants";
import { createDecreaseOrder, callContract, useHasOutdatedUi } from "../../Api";
import { getContract } from "../../Addresses";
import PositionRouter from "../../abis/PositionRouter.json";
import Checkbox from "../Checkbox/Checkbox";
import Tab from "../Tab/Tab";
import Modal from "../Modal/Modal";
import ExchangeInfoRow from "./ExchangeInfoRow";
import Tooltip from "../Tooltip/Tooltip";

const { AddressZero } = ethers.constants;

const orderOptionLabels = {
  [MARKET]: "Market",
  [STOP]: "Trigger",
};

function getTokenAmount(usdAmount, tokenAddress, max, infoTokens) {
  if (!usdAmount) {
    return;
  }
  if (tokenAddress === USDG_ADDRESS) {
    return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION);
  }
  const info = getTokenInfo(infoTokens, tokenAddress);
  if (!info) {
    return;
  }
  if (max && !info.maxPrice) {
    return;
  }
  if (!max && !info.minPrice) {
    return;
  }

  return usdAmount.mul(expandDecimals(1, info.decimals)).div(max ? info.minPrice : info.maxPrice);
}

export default function PositionSeller(props) {
  const {
    active,
    pendingPositions,
    setPendingPositions,
    positionsMap,
    positionKey,
    isVisible,
    setIsVisible,
    account,
    library,
    infoTokens,
    setPendingTxns,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    isWaitingForPluginApproval,
    isPluginApproving,
    orderBookApproved,
    setOrdersToaOpen,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
  } = props;
  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, "Exchange-keep-leverage"], true);
  const position = positionsMap && positionKey ? positionsMap[positionKey] : undefined;
  const [fromValue, setFromValue] = useState("");
  const [isProfitWarningAccepted, setIsProfitWarningAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsVisible = usePrevious(isVisible);
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const { data: minExecutionFee } = useSWR([active, chainId, positionRouterAddress, "minExecutionFee"], {
    fetcher: fetcher(library, PositionRouter),
  });

  const orderOptions = [MARKET, STOP];
  let [orderOption, setOrderOption] = useState(MARKET);

  if (!flagOrdersEnabled) {
    orderOption = MARKET;
  }

  const needPositionRouterApproval = !positionRouterApproved && orderOption === MARKET;

  const onOrderOptionChange = (option) => {
    setOrderOption(option);
  };

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };
  const [triggerPriceValue, setTriggerPriceValue] = useState("");
  const triggerPriceUsd = orderOption === MARKET ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const [nextDelta, nextHasProfit = bigNumberify(0)] = useMemo(() => {
    if (!position) {
      return [bigNumberify(0), false];
    }

    if (orderOption !== STOP) {
      return [position.delta, position.hasProfit, position.deltaPercentage];
    }

    if (!triggerPriceUsd) {
      return [bigNumberify(0), false];
    }

    const { delta, hasProfit, deltaPercentage } = calculatePositionDelta(triggerPriceUsd, position);
    return [delta, hasProfit, deltaPercentage];
  }, [position, orderOption, triggerPriceUsd]);

  const existingOrder = useMemo(() => {
    if (orderOption === STOP && (!triggerPriceUsd || triggerPriceUsd.eq(0))) {
      return null;
    }
    if (!orders || !position) {
      return null;
    }
    for (const order of orders) {
      // only Stop orders can't be executed without corresponding opened position
      if (order.type !== DECREASE) continue;

      // if user creates Stop-Loss we need only Stop-Loss orders and vice versa
      if (orderOption === STOP) {
        const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice);
        if (triggerAboveThreshold !== order.triggerAboveThreshold) continue;
      }

      const sameToken =
        order.indexToken === nativeTokenAddress
          ? position.indexToken.isNative
          : order.indexToken === position.indexToken.address;
      if (order.isLong === position.isLong && sameToken) {
        return order;
      }
    }
  }, [position, orders, triggerPriceUsd, orderOption, nativeTokenAddress]);

  const needOrderBookApproval = orderOption === STOP && !orderBookApproved;

  const { data: hasOutdatedUi } = useHasOutdatedUi();

  let collateralToken;
  let maxAmount;
  let maxAmountFormatted;
  let maxAmountFormattedFree;
  let fromAmount;

  let convertedAmount;
  let convertedAmountFormatted;

  let nextLeverage;
  let liquidationPrice;
  let nextLiquidationPrice;
  let isClosing;
  let sizeDelta;

  let nextCollateral;
  let collateralDelta = bigNumberify(0);
  let receiveAmount = bigNumberify(0);
  let convertedReceiveAmount = bigNumberify(0);
  let adjustedDelta = bigNumberify(0);

  let title;
  let fundingFee;
  let positionFee;
  let totalFees;
  if (position) {
    fundingFee = position.fundingFee;
    fromAmount = parseValue(fromValue, USD_DECIMALS);
    sizeDelta = fromAmount;

    title = `Close ${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol}`;
    collateralToken = position.collateralToken;
    liquidationPrice = getLiquidationPrice(position);

    if (fromAmount) {
      isClosing = position.size.sub(fromAmount).lt(DUST_USD);
      positionFee = getMarginFee(fromAmount);
    }

    if (isClosing) {
      sizeDelta = position.size;
      receiveAmount = position.collateral;
    }

    if (sizeDelta) {
      adjustedDelta = nextDelta.mul(sizeDelta).div(position.size);
    }

    if (nextHasProfit) {
      receiveAmount = receiveAmount.add(adjustedDelta);
    } else {
      if (receiveAmount.gt(adjustedDelta)) {
        receiveAmount = receiveAmount.sub(adjustedDelta);
      } else {
        receiveAmount = bigNumberify(0);
      }
    }

    if (keepLeverage && sizeDelta && !isClosing) {
      collateralDelta = sizeDelta.mul(position.collateral).div(position.size);
      // if the position will be realising a loss then reduce collateralDelta by the realised loss
      if (!nextHasProfit) {
        const deductions = adjustedDelta.add(positionFee).add(fundingFee);
        if (collateralDelta.gt(deductions)) {
          collateralDelta = collateralDelta = collateralDelta.sub(deductions);
        } else {
          collateralDelta = bigNumberify(0);
        }
      }
    }

    receiveAmount = receiveAmount.add(collateralDelta);

    if (sizeDelta && positionFee && fundingFee) {
      totalFees = positionFee.add(fundingFee);
      if (receiveAmount.gt(totalFees)) {
        receiveAmount = receiveAmount.sub(totalFees);
      } else {
        receiveAmount = bigNumberify(0);
      }
    }

    convertedReceiveAmount = getTokenAmount(receiveAmount, collateralToken.address, false, infoTokens);

    if (isClosing) {
      nextCollateral = bigNumberify(0);
    } else {
      if (position.collateral) {
        nextCollateral = position.collateral;
        if (collateralDelta && collateralDelta.gt(0)) {
          nextCollateral = position.collateral.sub(collateralDelta);
        } else if (position.delta && position.delta.gt(0) && sizeDelta) {
          if (!position.hasProfit) {
            nextCollateral = nextCollateral.sub(adjustedDelta);
          }
        }
      }
    }

    maxAmount = position.size;
    maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true);
    maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2);
    if (fromAmount && collateralToken.maxPrice) {
      convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice);
      convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true);
    }

    if (fromAmount) {
      if (!isClosing && !keepLeverage) {
        nextLeverage = getLeverage({
          size: position.size,
          sizeDelta,
          collateral: position.collateral,
          entryFundingRate: position.entryFundingRate,
          cumulativeFundingRate: position.cumulativeFundingRate,
          hasProfit: nextHasProfit,
          delta: nextDelta,
          includeDelta: savedIsPnlInLeverage,
        });
        nextLiquidationPrice = getLiquidationPrice({
          isLong: position.isLong,
          size: position.size,
          sizeDelta,
          collateral: position.collateral,
          averagePrice: position.averagePrice,
          entryFundingRate: position.entryFundingRate,
          cumulativeFundingRate: position.cumulativeFundingRate,
          delta: nextDelta,
          hasProfit: nextHasProfit,
          includeDelta: true,
        });
      }
    }
  }

  const [deltaStr, deltaPercentageStr] = useMemo(() => {
    if (!position || !position.markPrice) {
      return ["-", "-"];
    }
    if (orderOption !== STOP) {
      const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
        position.markPrice,
        position,
        fromAmount
      );
      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: pendingDelta,
        deltaPercentage: pendingDeltaPercentage,
        hasProfit,
      });
      return [deltaStr, deltaPercentageStr];
    }
    if (!triggerPriceUsd || triggerPriceUsd.eq(0)) {
      return ["-", "-"];
    }

    const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
      triggerPriceUsd,
      position,
      fromAmount
    );

    const { deltaStr, deltaPercentageStr } = getDeltaStr({
      delta: pendingDelta,
      deltaPercentage: pendingDeltaPercentage,
      hasProfit,
    });
    return [deltaStr, deltaPercentageStr];
  }, [position, triggerPriceUsd, orderOption, fromAmount]);

  const getError = () => {
    if (hasOutdatedUi) {
      return "Page outdated, please refresh";
    }
    if (!fromAmount) {
      return "Enter an amount";
    }
    if (nextLeverage && nextLeverage.eq(0)) {
      return "Enter an amount";
    }
    if (orderOption === STOP) {
      if (!triggerPriceUsd || triggerPriceUsd.eq(0)) {
        return "Enter Price";
      }
      if (position.isLong && triggerPriceUsd.lte(liquidationPrice)) {
        return "Price below Liq. Price";
      }
      if (!position.isLong && triggerPriceUsd.gte(liquidationPrice)) {
        return "Price above Liq. Price";
      }

      if (profitPrice && nextDelta.eq(0) && nextHasProfit) {
        return "Invalid price, see warning";
      }
    }

    if (!isClosing && position && position.size && fromAmount) {
      if (position.size.sub(fromAmount).lt(expandDecimals(10, USD_DECIMALS))) {
        return "Leftover position below 10 USD";
      }
    }

    if (position && position.size && position.size.lt(fromAmount)) {
      return "Max close amount exceeded";
    }

    if (nextLeverage && nextLeverage.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return "Min leverage: 1.1x";
    }

    if (nextLeverage && nextLeverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return "Max leverage: 30.5x";
    }

    if (hasPendingProfit && orderOption !== STOP && !isProfitWarningAccepted) {
      return "Forfeit profit not checked";
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }
    if (needOrderBookApproval && isWaitingForPluginApproval) {
      return false;
    }
    if (isPluginApproving) {
      return false;
    }
    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return false;
    }
    if (isPositionRouterApproving) {
      return false;
    }

    return true;
  };

  const hasPendingProfit = MIN_PROFIT_TIME > 0 && position.delta.eq(0) && position.pendingDelta.gt(0);

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }

    if (orderOption === STOP) {
      if (isSubmitting) return "Creating Order...";

      if (needOrderBookApproval && isWaitingForPluginApproval) {
        return "Enabling Orders...";
      }
      if (isPluginApproving) {
        return "Enabling Orders...";
      }
      if (needOrderBookApproval) {
        return "Enable Orders";
      }

      return "Create Order";
    }

    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return "Enabling Leverage...";
    }

    if (isPositionRouterApproving) {
      return "Enabling Leverage...";
    }

    if (needPositionRouterApproval) {
      return "Enable Leverage";
    }

    if (hasPendingProfit) {
      return "Close without profit";
    }
    return isSubmitting ? "Closing..." : "Close";
  };

  const resetForm = () => {
    setFromValue("");
    setIsProfitWarningAccepted(false);
  };

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm();
    }
  }, [prevIsVisible, isVisible]);

  const onClickPrimary = async () => {
    if (needOrderBookApproval) {
      setOrdersToaOpen(true);
      return;
    }

    if (needPositionRouterApproval) {
      approvePositionRouter({
        sentMsg: "Enable leverage sent.",
        failMsg: "Enable leverage failed.",
      });
      return;
    }

    setIsSubmitting(true);

    const collateralTokenAddress = position.collateralToken.isNative
      ? nativeTokenAddress
      : position.collateralToken.address;
    const indexTokenAddress = position.indexToken.isNative ? nativeTokenAddress : position.indexToken.address;

    if (orderOption === STOP) {
      const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice);

      createDecreaseOrder(
        chainId,
        library,
        indexTokenAddress,
        sizeDelta,
        collateralTokenAddress,
        collateralDelta,
        position.isLong,
        triggerPriceUsd,
        triggerAboveThreshold,
        {
          sentMsg: "Order submitted!",
          successMsg: "Order created!",
          failMsg: "Order creation failed.",
          setPendingTxns,
        }
      )
        .then(() => {
          setFromValue("");
          setIsVisible(false);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
      return;
    }

    const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress;
    const priceBasisPoints = position.isLong
      ? BASIS_POINTS_DIVISOR - allowedSlippage
      : BASIS_POINTS_DIVISOR + allowedSlippage;
    const refPrice = position.isLong ? position.indexToken.minPrice : position.indexToken.maxPrice;
    let priceLimit = refPrice.mul(priceBasisPoints).div(BASIS_POINTS_DIVISOR);
    const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME;
    const minProfitTimeExpired = parseInt(Date.now() / 1000) > minProfitExpiration;
    if (nextHasProfit && !minProfitTimeExpired && !isProfitWarningAccepted) {
      if ((position.isLong && priceLimit.lt(profitPrice)) || (!position.isLong && priceLimit.gt(profitPrice))) {
        priceLimit = profitPrice;
      }
    }

    const withdrawETH = collateralTokenAddress === AddressZero || collateralTokenAddress === nativeTokenAddress;

    const params = [
      [tokenAddress0], // _path
      indexTokenAddress, // _indexToken
      collateralDelta, // _collateralDelta
      sizeDelta, // _sizeDelta
      position.isLong, // _isLong
      account, // _receiver
      priceLimit, // _acceptablePrice
      0, // _minOut
      minExecutionFee, // _executionFee
      withdrawETH, // _withdrawETH
    ];

    const successMsg = `Requested decrease of ${position.indexToken.symbol} ${
      position.isLong ? "Long" : "Short"
    } by ${formatAmount(sizeDelta, USD_DECIMALS, 2)} USD.`;

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());

    callContract(chainId, contract, "createDecreasePosition", params, {
      value: minExecutionFee,
      sentMsg: "Close submitted!",
      successMsg,
      failMsg: "Close failed.",
      setPendingTxns,
    })
      .then(async (res) => {
        setFromValue("");
        setIsVisible(false);

        let nextSize = position.size.sub(sizeDelta);

        pendingPositions[position.key] = {
          updatedAt: Date.now(),
          pendingChanges: {
            size: nextSize,
          },
        };

        setPendingPositions({ ...pendingPositions });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const renderExistingOrderWarning = useCallback(() => {
    if (!existingOrder) {
      return;
    }
    const indexToken = getTokenInfo(infoTokens, existingOrder.indexToken);
    const sizeInToken = formatAmount(
      existingOrder.sizeDelta.mul(PRECISION).div(existingOrder.triggerPrice),
      USD_DECIMALS,
      4,
      true
    );
    const prefix = existingOrder.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
    return (
      <div className="Confirmation-box-warning">
        You have an active order to decrease {existingOrder.isLong ? "Long" : "Short"} {sizeInToken} {indexToken.symbol}{" "}
        ($
        {formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true)}) at {prefix}{" "}
        {formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)}
      </div>
    );
  }, [existingOrder, infoTokens]);

  function renderMinProfitWarning() {
    if (MIN_PROFIT_TIME === 0) {
      return null;
    }

    if (profitPrice && nextDelta.eq(0) && nextHasProfit) {
      const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME;

      if (orderOption === MARKET) {
        return (
          <div className="Confirmation-box-warning">
            Reducing the position at the current price will forfeit a&nbsp;
            <a
              href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change"
              target="_blank"
              rel="noopener noreferrer"
            >
              pending profit
            </a>{" "}
            of {deltaStr}. <br />
            <br />
            Profit price: {position.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}. This rule
            applies for the next {getTimeRemaining(minProfitExpiration)}, until {formatDateTime(minProfitExpiration)}.
          </div>
        );
      }
      return (
        <div className="Confirmation-box-warning">
          This order will forfeit a&nbsp;
          <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
            profit
          </a>{" "}
          of {deltaStr}. <br />
          Profit price: {position.isLong ? ">" : "<"} ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}. This rule
          applies for the next {getTimeRemaining(minProfitExpiration)}, until {formatDateTime(minProfitExpiration)}.
        </div>
      );
    }
  }

  const DECREASE_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "DECREASE_ORDER_EXECUTION_GAS_FEE");
  function renderExecutionFee() {
    if (orderOption !== STOP) {
      return null;
    }
    return (
      <ExchangeInfoRow label="Execution Fees">
        {formatAmount(DECREASE_ORDER_EXECUTION_GAS_FEE, 18, 4)} {nativeTokenSymbol}
      </ExchangeInfoRow>
    );
  }

  const profitPrice = getProfitPrice(orderOption === MARKET ? position.markPrice : triggerPriceUsd, position);

  let triggerPricePrefix;
  if (triggerPriceUsd) {
    triggerPricePrefix = triggerPriceUsd.gt(position.markPrice) ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
  }

  const shouldShowExistingOrderWarning = false;

  return (
    <div className="PositionEditor">
      {position && (
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          {flagOrdersEnabled && (
            <Tab
              options={orderOptions}
              option={orderOption}
              optionLabels={orderOptionLabels}
              onChange={onOrderOptionChange}
            />
          )}
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">
                {convertedAmountFormatted && (
                  <div className="Exchange-swap-usd">
                    Close: {convertedAmountFormatted} {position.collateralToken.symbol}
                  </div>
                )}
                {!convertedAmountFormatted && "Close"}
              </div>
              {maxAmount && (
                <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>
                  Max: {maxAmountFormatted}
                </div>
              )}
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={fromValue}
                  onChange={(e) => setFromValue(e.target.value)}
                />
                {fromValue !== maxAmountFormattedFree && (
                  <div
                    className="Exchange-swap-max"
                    onClick={() => {
                      setFromValue(maxAmountFormattedFree);
                    }}
                  >
                    MAX
                  </div>
                )}
              </div>
              <div className="PositionEditor-token-symbol">USD</div>
            </div>
          </div>
          {orderOption === STOP && (
            <div className="Exchange-swap-section">
              <div className="Exchange-swap-section-top">
                <div className="muted">Price</div>
                <div
                  className="muted align-right clickable"
                  onClick={() => {
                    setTriggerPriceValue(formatAmountFree(position.markPrice, USD_DECIMALS, 2));
                  }}
                >
                  Mark: {formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                </div>
              </div>
              <div className="Exchange-swap-section-bottom">
                <div className="Exchange-swap-input-container">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    className="Exchange-swap-input"
                    value={triggerPriceValue}
                    onChange={onTriggerPriceChange}
                  />
                </div>
                <div className="PositionEditor-token-symbol">USD</div>
              </div>
            </div>
          )}
          {renderMinProfitWarning()}
          {shouldShowExistingOrderWarning && renderExistingOrderWarning()}
          <div className="PositionEditor-info-box">
            {hasPendingProfit && orderOption !== STOP && (
              <div className="PositionEditor-accept-profit-warning">
                <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                  <span className="muted">Forfeit profit</span>
                </Checkbox>
              </div>
            )}
            <div className="PositionEditor-keep-leverage-settings">
              <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                <span className="muted">Keep leverage at {formatAmount(position.leverage, 4, 2)}x</span>
              </Checkbox>
            </div>
            {orderOption === MARKET && (
              <div className="PositionEditor-allow-higher-slippage">
                <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                  <span className="muted">Allow up to 1% slippage</span>
                </Checkbox>
              </div>
            )}
            {orderOption === MARKET && (
              <div>
                <ExchangeInfoRow label="Allowed Slippage">
                  <Tooltip
                    handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          You can change this in the settings menu on the top right of the page.
                          <br />
                          <br />
                          Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices
                          are volatile.
                        </>
                      );
                    }}
                  />
                </ExchangeInfoRow>
              </div>
            )}
            {orderOption === STOP && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Trigger Price</div>
                <div className="align-right">
                  {!triggerPriceUsd && "-"}
                  {triggerPriceUsd && `${triggerPricePrefix} ${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}`}
                </div>
              </div>
            )}
            <div className="Exchange-info-row top-line">
              <div className="Exchange-info-label">Mark Price</div>
              <div className="align-right">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Entry Price</div>
              <div className="align-right">${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Liq. Price</div>
              <div className="align-right">
                {isClosing && orderOption !== STOP && "-"}
                {(!isClosing || orderOption === STOP) && (
                  <div>
                    {(!nextLiquidationPrice || nextLiquidationPrice.eq(liquidationPrice)) && (
                      <div>{`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
                    )}
                    {nextLiquidationPrice && !nextLiquidationPrice.eq(liquidationPrice) && (
                      <div>
                        <div className="inline-block muted">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row top-line">
              <div className="Exchange-info-label">Size</div>
              <div className="align-right">
                {position && position.size && fromAmount && (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(position.size.sub(fromAmount), USD_DECIMALS, 2, true)}
                  </div>
                )}
                {position && position.size && !fromAmount && (
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Collateral</div>
              <div className="align-right">
                {nextCollateral && !nextCollateral.eq(position.collateral) ? (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                  </div>
                ) : (
                  `$${formatAmount(position.collateral, USD_DECIMALS, 4, true)}`
                )}
              </div>
            </div>
            {!keepLeverage && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Leverage</div>
                <div className="align-right">
                  {isClosing && "-"}
                  {!isClosing && (
                    <div>
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted">
                            {formatAmount(position.leverage, 4, 2)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2)}x
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">PnL</div>
              <div className="align-right">
                {deltaStr} ({deltaPercentageStr})
              </div>
            </div>
            <div className="Exchange-info-row top-line">
              <div className="Exchange-info-label">Borrow Fee</div>
              <div className="align-right">${formatAmount(fundingFee, USD_DECIMALS, 2, true)}</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Closing Fee</div>
              <div className="align-right">
                {positionFee && `$${formatAmount(positionFee, USD_DECIMALS, 2, true)}`}
                {!positionFee && "-"}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Receive</div>
              <div className="align-right">
                {formatAmount(convertedReceiveAmount, position.collateralToken.decimals, 4, true)}{" "}
                {position.collateralToken.symbol} ($
                {formatAmount(receiveAmount, USD_DECIMALS, 2, true)})
              </div>
            </div>
            {renderExecutionFee()}
          </div>
          <div className="Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
