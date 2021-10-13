import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'

import { BsArrowRight } from 'react-icons/bs'

import {
	formatAmount,
	bigNumberify,
  DEFAULT_SLIPPAGE_AMOUNT,
	USD_DECIMALS,
	DUST_USD,
	BASIS_POINTS_DIVISOR,
	USDG_ADDRESS,
  DECREASE_ORDER_EXECUTION_GAS_FEE,
  SLIPPAGE_BPS_KEY,
  TRIGGER_PREFIX_BELOW,
  TRIGGER_PREFIX_ABOVE,
	usePrevious,
	formatAmountFree,
	parseValue,
	expandDecimals,
	getTokenInfo,
	getLiquidationPrice,
	getLeverage,
	getPositionFee,
	FUNDING_RATE_PRECISION,
	PRECISION,
	MARKET,
	STOP,
  LONG,
  PROFIT_THRESHOLD_BASIS_POINTS,
  useLocalStorageSerializeKey,
  calculatePositionDelta,
  getDeltaStr
} from "../../Helpers"
import { createDecreaseOrder, callContract } from "../../Api"
import { getContract } from "../../Addresses"
import Router from "../../abis/Router.json"
import Checkbox from "../Checkbox/Checkbox"
import Tab from "../Tab/Tab"
import Modal from "../Modal/Modal"
import ExchangeInfoRow from './ExchangeInfoRow'
import { getTokenBySymbol } from '../../data/Tokens'

const { AddressZero } = ethers.constants

const orderOptionLabels = {
  [MARKET]: "Market",
  [STOP]: "Trigger"
}

function getFundingFee(data) {
  let { entryFundingRate, cumulativeFundingRate, size } = data
  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
  }
  return
}

function getTokenAmount(usdAmount, tokenAddress, max, infoTokens) {
  if (!usdAmount) { return }
  if (tokenAddress === USDG_ADDRESS) {
    return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION)
  }
  const info = getTokenInfo(infoTokens, tokenAddress)
  if (!info) { return }
  if (max && !info.maxPrice) { return }
  if (!max && !info.minPrice) { return }

  return usdAmount.mul(expandDecimals(1, info.decimals)).div(max ? info.minPrice : info.maxPrice)
}

export default function PositionSeller(props) {
  const {
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
    approveOrderBook
  } = props
  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT)
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, "Exchange-keep-leverage"], true)
  const position = (positionsMap && positionKey) ? positionsMap[positionKey] : undefined
  const [fromValue, setFromValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prevIsVisible = usePrevious(isVisible)
  const routerAddress = getContract(chainId, "Router")

  const orderTypes = [MARKET, STOP];
  let [orderType, setOrderType] = useState(MARKET);
  if (!flagOrdersEnabled) {
    orderType = MARKET;
  }
  const onOrderOptionChange = option => {
    setOrderType(option);
  }

  const onTriggerPriceChange = evt => {
    setTriggerPriceValue(evt.target.value || '');
  }
  const [triggerPriceValue, setTriggerPriceValue] = useState('');
  const triggerPriceUsd = orderType === MARKET ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const [deltaStr, deltaPercentageStr] = useMemo(() => {
    if (!position) {
      return ["-", "-"]
    }
    if (orderType !== STOP) {
      return [position.deltaStr, position.deltaPercentageStr]
    }
    if (!triggerPriceUsd) {
      return ["-", "-"]
    }

    const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta({
      price: triggerPriceUsd,
      ...position
    })

    const { deltaStr, deltaPercentageStr } = getDeltaStr({
      delta: pendingDelta,
      deltaPercentage: pendingDeltaPercentage,
      hasProfit
  })
    return [deltaStr, deltaPercentageStr]
  }, [position, triggerPriceUsd, orderType])

  const [nextDelta, nextHasProfit, nextDeltaPercentage = bigNumberify(0)] = useMemo(() => {
    if (!position) {
      return [bigNumberify(0), false]
    }

    if (orderType !== STOP) {
      return [position.delta, position.hasProfit, position.deltaPercentage]
    }

    if (!triggerPriceUsd) {
      return [bigNumberify(0), false]
    }

    const { delta, hasProfit, deltaPercentage } = calculatePositionDelta({
      price: triggerPriceUsd,
      ...position
    })
    return [delta, hasProfit, deltaPercentage]
  }, [position, orderType, triggerPriceUsd])

  const existingOrder = useMemo(() => {
    if (orderType === STOP && (!triggerPriceUsd || triggerPriceUsd.eq(0))) {
      return null
    }
    if (!orders) {
      return null
    }
    const WETH = getTokenBySymbol(chainId, "WETH")
    for (const order of orders) {
      // only Stop orders can't be executed without corresponding opened position
      if (order.orderType !== STOP) continue

      // if user creates Stop-Loss we need only Stop-Loss orders and vice versa
      if (orderType === STOP) {
        const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice)
        if (triggerAboveThreshold !== order.triggerAboveThreshold) continue
      }

      const sameToken = order.indexToken === WETH.address
        ? position.indexToken.isNative
        : order.indexToken === position.indexToken.address
      if ((order.swapOption === LONG) === position.isLong && sameToken) {
        return order
      }
    }
  }, [position, orders, triggerPriceUsd, chainId, orderType])

  const needOrderBookApproval = orderType === STOP && !orderBookApproved

  let collateralToken
  let maxAmount
  let maxAmountFormatted
  let maxAmountFormattedFree
  let fromAmount

  let convertedAmount
  let convertedAmountFormatted

  let nextLeverage
  let liquidationPrice
  let nextLiquidationPrice
  let isClosing
  let sizeDelta

  let nextCollateral
  let collateralDelta = bigNumberify(0)
  let receiveAmount = bigNumberify(0)
  let convertedReceiveAmount = bigNumberify(0)
  let adjustedDelta = bigNumberify(0)

  let title
  let fundingFee
  let positionFee
  let totalFees
  if (position) {
    fundingFee = getFundingFee(position)
    fromAmount = parseValue(fromValue, USD_DECIMALS)
    sizeDelta = fromAmount

    title = `Close ${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol}`
    collateralToken = position.collateralToken
    liquidationPrice = getLiquidationPrice(position)

    if (fromAmount) {
      isClosing = position.size.sub(fromAmount).lt(DUST_USD)
      positionFee = getPositionFee(fromAmount)
    }

    if (isClosing) {
      sizeDelta = position.size
      receiveAmount = position.collateral
    }

    if (sizeDelta) {
      adjustedDelta = nextDelta.mul(sizeDelta).div(position.size)
    }

    if (nextHasProfit) {
      receiveAmount = receiveAmount.add(adjustedDelta)
    } else {
      if (receiveAmount.gt(adjustedDelta)) {
        receiveAmount = receiveAmount.sub(adjustedDelta)
      } else {
        receiveAmount = bigNumberify(0)
      }
    }

    if (keepLeverage && sizeDelta && !isClosing) {
      collateralDelta = sizeDelta.mul(position.collateral).div(position.size)
    }

    receiveAmount = receiveAmount.add(collateralDelta)

    if (sizeDelta) {
      totalFees = positionFee.add(fundingFee)
      if (receiveAmount.gt(totalFees)) {
        receiveAmount = receiveAmount.sub(totalFees)
      } else {
        receiveAmount = bigNumberify(0)
      }
    }

    if (collateralDelta && totalFees && collateralDelta.gt(totalFees)) {
      collateralDelta = collateralDelta.sub(totalFees)
    }

    convertedReceiveAmount = getTokenAmount(receiveAmount, collateralToken.address, false, infoTokens)

    if (isClosing) {
      nextCollateral = bigNumberify(0)
    } else {
      if (position.collateral && collateralDelta) {
        nextCollateral = position.collateral.sub(collateralDelta)
      }
    }

    maxAmount = position.size
    maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true)
    maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2)
    if (fromAmount && collateralToken.maxPrice) {
      convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice)
      convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true)
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
          includeDelta: savedIsPnlInLeverage
        })
        nextLiquidationPrice = getLiquidationPrice({
          isLong: position.isLong,
          size: position.size,
          sizeDelta,
          collateral: position.collateral,
          averagePrice: position.averagePrice,
          entryFundingRate: position.entryFundingRate,
          cumulativeFundingRate: position.cumulativeFundingRate
        })
      }
    }
  }

  const getError = () => {
    if (!fromAmount) { return "Enter an amount" }
    if (nextLeverage && nextLeverage.eq(0)) { return "Enter an amount" }
    if (orderType === STOP && !triggerPriceUsd) { return "Enter Price" }

    if (!isClosing && position && position.size && fromAmount) {
      if (position.size.sub(fromAmount).lt(expandDecimals(10, USD_DECIMALS))) {
        return "Leftover position below 10 USD"
      }
    }

    if (position && position.size && position.size.lt(fromAmount)) {
      return "Max close amount exceeded"
    }

    if (nextLeverage && nextLeverage.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return "Min leverage: 1.1x"
    }

    if (nextLeverage && nextLeverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return "Max leverage: 30.5x"
    }
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) { return false }
    if (isSubmitting) { return false }

    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }
    if (orderType === STOP) {
      if (isSubmitting) return "Creating Order...";
      if (nextHasProfit && nextDelta.eq(0)) return "Create Order without profit"

      if (needOrderBookApproval && isWaitingForPluginApproval) { return "Waiting for Approval" }
      if (isPluginApproving) { return "Enabling Orders..." }
      if (needOrderBookApproval) { return "Enable Orders" }

      return "Create Order"
    }
    if (position.delta.eq(0) && position.pendingDelta.gt(0)) {
      return "Close without profit"
    }
    return isSubmitting ? "Closing..." : "Close"
  }

  const resetForm = () => {
    setFromValue("")
  }

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm()
    }
  }, [prevIsVisible, isVisible])

  const onClickPrimary = async () => {
    if (needOrderBookApproval) {
      approveOrderBook();
      return
    }

    setIsSubmitting(true)

    const collateralTokenAddress = position.collateralToken.isNative ? nativeTokenAddress : position.collateralToken.address
    const indexTokenAddress = position.indexToken.isNative ? nativeTokenAddress : position.indexToken.address

    let params;
    let method;
    let contractAddress;
    let abi;
    let value;

    if (orderType === STOP) {
      const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice)

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
          sentMsg: "Trigger Order submitted!",
          successMsg: "Trigger Order created!",
          failMsg: "Order creation failed",
          setPendingTxns
        },
      ).then(() => {
        setFromValue("")
        setIsVisible(false)
      }).finally(() => {
        setIsSubmitting(false)
      })
      return
    }

    const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress
    const priceBasisPoints = position.isLong ? (BASIS_POINTS_DIVISOR - savedSlippageAmount) : (BASIS_POINTS_DIVISOR + savedSlippageAmount)
    const refPrice = position.isLong ? position.indexToken.minPrice : position.indexToken.maxPrice
    const priceLimit = refPrice.mul(priceBasisPoints).div(10000)

    params = [tokenAddress0, indexTokenAddress, collateralDelta, sizeDelta, position.isLong, account, priceLimit]
    method = collateralTokenAddress === AddressZero ? "decreasePositionETH" : "decreasePosition"
    contractAddress = routerAddress;

    const successMsg = `Decreased ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"} by ${formatAmount(sizeDelta, USD_DECIMALS, 2)} USD.`
    abi = Router.abi;

    const contract = new ethers.Contract(contractAddress, abi, library.getSigner())

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: "Close submitted!",
      successMsg,
      failMsg: "Close failed.",
      setPendingTxns
    })
    .then(async (res) => {
      setFromValue("")
      setIsVisible(false)
    })
    .finally(() => {
      setIsSubmitting(false)
    })
  }

  const renderExistingOrderWarning = useCallback(() => {
    if (!existingOrder) {
      return
    }
    const indexToken = getTokenInfo(infoTokens, existingOrder.indexToken)
    const sizeInToken = formatAmount(existingOrder.sizeDelta.mul(PRECISION).div(existingOrder.triggerPrice), USD_DECIMALS, 4, true)
    const prefix = existingOrder.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
    return (
      <div className="Confirmation-box-warning">
        NOTE: You have an active Trigger Order to Decrease {existingOrder.swapOption} {sizeInToken} {indexToken.symbol} (${formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true)}) at Price {prefix} {formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)}
      </div>
    );
  }, [existingOrder, infoTokens])

  function renderPnlWarning() {
    if (orderType === MARKET) {
      return null;
    }
    if (nextHasProfit || nextDeltaPercentage.lt(BASIS_POINTS_DIVISOR)) {
      return null
    }

    return (
      <div className="Confirmation-box-warning">
        WARNING: The position will be liquidated before reaching the Price
      </div>
    );
  }

  function renderExecutionFee() {
    if (orderType !== STOP) {
      return null;
    }
    return (
      <ExchangeInfoRow label="Execution Fees">
        {formatAmount(DECREASE_ORDER_EXECUTION_GAS_FEE, 18, 4)} ETH
      </ExchangeInfoRow>
    );
  }

  let priceMovementPercentage
  let profitPrice
  if (position && position.markPrice && position.averagePrice) {
    if (orderType === MARKET || triggerPriceUsd) {
      const closePrice = orderType === MARKET ? position.markPrice : triggerPriceUsd
      const priceDelta = closePrice.gt(position.averagePrice) ? closePrice.sub(position.averagePrice) : position.averagePrice.sub(closePrice)
      priceMovementPercentage = priceDelta.mul(BASIS_POINTS_DIVISOR).div(position.averagePrice)
      profitPrice = position.isLong
        ? position.averagePrice.mul(BASIS_POINTS_DIVISOR + PROFIT_THRESHOLD_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
        : position.averagePrice.mul(BASIS_POINTS_DIVISOR - PROFIT_THRESHOLD_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    }
  }

  let triggerPricePrefix
  if (triggerPriceUsd) {
    triggerPricePrefix = triggerPriceUsd.gt(position.markPrice) ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW
  }

  return (
    <div className="PositionEditor">
      {(position) &&
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          {(profitPrice && nextDelta.eq(0) && nextHasProfit) &&
            <div className="Confirmation-box-warning">
              WARNING: You {orderType === MARKET ? "have" : "will have"} a&nbsp;
              <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
                pending profit
              </a> of {deltaStr}. <br/>
              Profit price: ${formatAmount(profitPrice, USD_DECIMALS, 2, true)}.
              Current movement: {formatAmount(priceMovementPercentage, 2, 2, true)}%.
              {orderType === STOP && " In case order will be executed in less than 24 hours after position was opened you will lose profit."}
            </div>
          }
          {renderPnlWarning()}

          {flagOrdersEnabled &&
            <Tab options={orderTypes} className="Confirmation-box-tabs" option={orderType} optionLabels={orderOptionLabels} onChange={onOrderOptionChange} type="inline" />
          }
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">
                {convertedAmountFormatted &&
                  <div className="Exchange-swap-usd">
                    Close: {convertedAmountFormatted} {position.collateralToken.symbol}
                  </div>
                }
                {!convertedAmountFormatted && "Close"}
              </div>
              {maxAmount &&
                <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>Max: {maxAmountFormatted}</div>
              }
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={fromValue} onChange={(e) => setFromValue(e.target.value)} />
                {fromValue !== maxAmountFormattedFree &&
                  <div className="Exchange-swap-max" onClick={() => {setFromValue(maxAmountFormattedFree)}}>
                    MAX
                  </div>
                }
              </div>
              <div className="PositionEditor-token-symbol">
                USD
              </div>
            </div>
          </div>
          {orderType === STOP &&
	          <div className="Exchange-swap-section">
	            <div className="Exchange-swap-section-top">
	              <div className="muted">
	                Price
	              </div>
	              <div
	                className="muted align-right clickable"
	                onClick={() => {setTriggerPriceValue(formatAmountFree(position.markPrice, USD_DECIMALS, 2))}}
	              >
	                Mark: {formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
	              </div>
	            </div>
	            <div className="Exchange-swap-section-bottom">
	              <div className="Exchange-swap-input-container">
	                <input type="number" min="0" placeholder="0.0" className="Exchange-swap-input" value={triggerPriceValue} onChange={onTriggerPriceChange} />
	              </div>
	              <div className="PositionEditor-token-symbol">
	                USD
	              </div>
	            </div>
	          </div>
          }
          {renderExistingOrderWarning()}
          <div className="PositionEditor-info-box">
            <div className="PositionEditor-keep-leverage-settings">
							<Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
								<span className="muted">Keep leverage at {formatAmount(position.leverage, 4, 2)}x</span>
							</Checkbox>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Size</div>
              <div className="align-right">
                {position && position.size && fromAmount && <div>
                  <div className="inline-block muted">
                    ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                    <BsArrowRight className="transition-arrow" />
                  </div>
                  ${formatAmount(position.size.sub(fromAmount), USD_DECIMALS, 2, true)}
                </div>}
                {position && position.size && !fromAmount && <div>
                  ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                </div>}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Collateral</div>
              <div className="align-right">
                {nextCollateral && <div>
                  <div className="inline-block muted">
                    ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                    <BsArrowRight className="transition-arrow" />
                  </div>
                  ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                </div>}
                {!nextCollateral && `$${formatAmount(position.collateral, USD_DECIMALS, 4, true)}`}
              </div>
            </div>
            {!keepLeverage && <div className="Exchange-info-row">
              <div className="Exchange-info-label">Leverage</div>
              <div className="align-right">
                {isClosing && "-"}
                {!isClosing && <div>
                  {!nextLeverage && <div>
                    {formatAmount(position.leverage, 4, 2)}x
                  </div>}
                  {nextLeverage && <div>
                    <div className="inline-block muted">
                      {formatAmount(position.leverage, 4, 2)}x
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    {formatAmount(nextLeverage, 4, 2)}x
                  </div>}
                </div>}
              </div>
            </div>}
            {orderType === STOP && <div className="Exchange-info-row">
              <div className="Exchange-info-label">Trigger Price</div>
              <div className="align-right">
                {!triggerPriceUsd && '-'}
                {triggerPriceUsd &&
                  `${triggerPricePrefix} ${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}`
                }
              </div>
            </div>}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Mark Price</div>
              <div className="align-right">
                ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Liq. Price</div>
              <div className="align-right">
                {(isClosing && orderType !== STOP) && "-"}
                {(!isClosing || orderType === STOP) && <div>
                  {!nextLiquidationPrice && <div>
                    {`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
                  </div>}
                  {nextLiquidationPrice && <div>
                    <div className="inline-block muted">
                      ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                  </div>}
                </div>}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">PnL</div>
              <div className="align-right">
                {deltaStr} ({deltaPercentageStr})
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Borrow Fee</div>
              <div className="align-right">
                ${formatAmount(fundingFee, USD_DECIMALS, 2, true)}
              </div>
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
                {formatAmount(convertedReceiveAmount, position.collateralToken.decimals, 4,true)} {position.collateralToken.symbol} (${formatAmount(receiveAmount, USD_DECIMALS, 2, true)})
              </div>
            </div>
            {renderExecutionFee()}
          </div>
          <div className="Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </Modal>
      }
    </div>
  )
}
