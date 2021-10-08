import React, { useCallback, useMemo } from 'react'
import {
	USD_DECIMALS,
	PRECISION,
	BASIS_POINTS_DIVISOR,
  MARKET,
  LIMIT,
  LONG,
  SWAP_ORDER_EXECUTION_GAS_FEE,
  INCREASE_ORDER_EXECUTION_GAS_FEE,
	expandDecimals,
  getExchangeRate,
  formatAmount,
  useLocalStorageSerializeKey,
  getExchangeRateDisplay,
  DEFAULT_SLIPPAGE_AMOUNT,
  SLIPPAGE_BPS_KEY
} from '../../Helpers'

import { BsArrowRight } from 'react-icons/bs'
import Modal from '../Modal/Modal'
import ExchangeInfoRow from './ExchangeInfoRow'
import { getToken, getTokenBySymbol } from '../../data/Tokens'

const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS).div(100); // 1%;

function getSpread(fromTokenInfo, toTokenInfo) {
  if (fromTokenInfo && fromTokenInfo.maxPrice && toTokenInfo && toTokenInfo.minPrice) {
    const fromDiff = fromTokenInfo.maxPrice.sub(fromTokenInfo.minPrice)
    const fromSpread = fromDiff.mul(PRECISION).div(fromTokenInfo.maxPrice);
    const toDiff = toTokenInfo.maxPrice.sub(toTokenInfo.minPrice)
    const toSpread = toDiff.mul(PRECISION).div(toTokenInfo.maxPrice);
    const value = fromSpread.add(toSpread);
    return {
      value,
      isHigh: value.gt(HIGH_SPREAD_THRESHOLD)
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
    orderType,
    isShort,
    toAmount,
    fromAmount,
    onConfirmationClick,
    setIsConfirming,
    shortCollateralAddress,
    hasExistingPosition,
    leverage,
    existingPosition,
    existingLiquidationPrice,
    displayLiquidationPrice,
    entryMarkPrice,
    shortCollateralToken,
    isPendingConfirmation,
    triggerPriceUsd,
    triggerRatio,
    fees,
    feesUsd,
    isSubmitting,
    fromUsdMin,
    toUsdMax,
    triggerRatioInverted,
    nextAveragePrice,
    collateralTokenAddress,
    feeBps,
    chainId,
    orders
  } = props;

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT)

  let minOut;
  let fromTokenUsd;
  let toTokenUsd;

  if (isSwap) {
    minOut = toAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    fromTokenUsd = fromTokenInfo ? formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true) : 0;
    toTokenUsd = toTokenInfo ? formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true) : 0;
  }

  const getTitle = () => {
    if (!isMarketOrder) { return "Confirm Limit Order" }
    if (isSwap) { return "Confirm Swap" }
    return isLong ? "Confirm Long" : "Confirm Short";
  }
  const title = getTitle();

  const existingOrder = useMemo(() => {
    const WETH = getTokenBySymbol(chainId, "WETH")
    for (const order of orders) {
      if (order.orderType !== LIMIT) continue
      const sameToken = order.indexToken === WETH.address
        ? toToken.isNative 
        : order.indexToken === toToken.address
      if ((order.swapOption === LONG) === isLong
        && sameToken) {
        return order
      }
    }
  }, [orders, chainId, isLong, toToken.address, toToken.isNative])

  const getPrimaryText = () => {
    if (!isPendingConfirmation) {
      if (isSwap) {
        return title
      }
      const action = isMarketOrder
        ? (isLong ? "Long" : "Short")
        : "Create Order"

      if (hasExistingPosition && existingPosition.delta.eq(0) && existingPosition.pendingDelta.gt(0)) {
        return isLong ? `Accept reduction and ${action}` : `Accept reduction and Short`
      }

      return isLong ? `Accept minimum and ${action}` : `Accept minimum and ${action}`
    }

    if (!isMarketOrder) { return "Creating Order..." }
    if (isSwap) { return "Swapping..." }
    if (isLong) { return "Longing..." }
    return "Shorting..."
  }

  const isPrimaryEnabled = () => {
    return !isPendingConfirmation && !isSubmitting;
  }

  const spread = getSpread(fromTokenInfo, toTokenInfo);
  // it's meaningless for limit/stop orders to show spread based on current prices
  const showSpread = isMarketOrder && !!spread;

  const renderSpreadWarning = useCallback(() => {
    if (!isMarketOrder) { return null }

    if (spread && spread.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          WARNING: the spread is > 1%, please ensure the trade details are acceptable before comfirming
        </div>
      );
    }
  }, [isMarketOrder, spread])

  const renderTriggerRatioWarning = useCallback(() => {
    if (!isSwap || !triggerRatio) {
      return null;
    }
    const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
    if (orderType === LIMIT && currentRate && !currentRate.gt(triggerRatio)) {
      return (
        <div className="Confirmation-box-warning">
          WARNING: Price is {triggerRatioInverted ? "lower": "higher"} then Mark Price, the order will be executed immediatelly at Mark Price
        </div>
      );
    }
  }, [isSwap, fromTokenInfo, toTokenInfo, orderType, triggerRatio, triggerRatioInverted])

  const renderTriggerPriceWarning = useCallback(() => {
    if (isSwap || orderType === MARKET || !entryMarkPrice || !triggerPriceUsd) {
      return null;
    }
    if ((isLong && entryMarkPrice.gte(triggerPriceUsd))
      || (!isLong && entryMarkPrice.lte(triggerPriceUsd))
    ) {
      return null;
    }

    return (
      <div className="Confirmation-box-warning">
        WARNING: Price is {isLong ? "higher" : "lower"} then Mark Price, the order will be executed immediatelly
      </div>
    );
  }, [isLong, isSwap, orderType, entryMarkPrice, triggerPriceUsd])

  const renderFeeWarning = useCallback(() => {
    if (orderType === LIMIT || !feeBps || feeBps < 80) {
      return null
    }

    if (isSwap) {
      return (
        <div className="Confirmation-box-warning">
          WARNING: Fees are high to swap from {fromToken.symbol} to {toToken.symbol}.
        </div>
      )
    }

    if (!collateralTokenAddress) {
      return null
    }

    const collateralToken = getToken(chainId, collateralTokenAddress)
    return (
      <div className="Confirmation-box-warning">
        WARNING: Fees are high to swap from {fromToken.symbol} to {collateralToken.symbol}. <br/>
        {collateralToken.symbol} is needed for collateral.
      </div>
    )
  }, [feeBps, isSwap, collateralTokenAddress, chainId, fromToken.symbol, toToken.symbol, orderType])

  const renderMinProfitWarning = useCallback(() => {
    if (!isSwap) {
      if (hasExistingPosition && existingPosition.delta.eq(0) && existingPosition.pendingDelta.gt(0)) {
        return (
          <div className="Confirmation-box-warning">
            WARNING: You have a&nbsp;
            <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
              pending profit
            </a> of {existingPosition.deltaStr}, this will be reduced to zero if you increase your position now.
          </div>
        );
      }
      return (
        <div className="Confirmation-box-warning">
          NOTE: A minimum price change of&nbsp;
          <a href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change" target="_blank" rel="noopener noreferrer">
            1.5%
          </a> is required for a position to be in profit.
        </div>
      );
    }
  }, [isSwap, hasExistingPosition, existingPosition])

  const renderExistingOrderWarning = useCallback(() => {
    if (isSwap || !existingOrder) {
      return
    }
    const indexToken = getToken(chainId, existingOrder.indexToken)
    const sizeInToken = formatAmount(existingOrder.sizeDelta.mul(PRECISION).div(existingOrder.triggerPrice), USD_DECIMALS, 4, true)
    return (
      <div className="Confirmation-box-warning">
        NOTE: You have an active Limit Order to Increase {existingOrder.swapOption} {sizeInToken} {indexToken.symbol} (${formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true)}) at price ${formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)}
      </div>
    );
  }, [existingOrder, isSwap, chainId])

  // TODO handle unaprproved order plugin (very unlikely case)
  const renderMain = useCallback(() => {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            Pay&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} (${formatAmount(fromUsdMin, USD_DECIMALS, 2, true)})
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            Receive&nbsp;{formatAmount(toAmount, toToken.decimals, 4, true)} {toToken.symbol} (${formatAmount(toUsdMax, USD_DECIMALS, 2, true)})
          </div>
        </div>
      );
    }

    return (
      <div className="Confirmation-box-main">
        <span>Pay&nbsp;{formatAmount(fromAmount, fromToken.decimals, 4, true)} {fromToken.symbol} </span>
        <div className="Confirmation-box-main-icon"></div>
        <div>
          {isLong ? 'Long' : 'Short'}&nbsp;
          {formatAmount(toAmount, toToken.decimals, 4, true)} {toToken.symbol}
        </div>
      </div>
    );
  }, [isSwap, fromAmount, fromToken, toToken, fromUsdMin, toUsdMax, isLong, toAmount])

  const renderExecutionFee = useCallback(() => {
    if (isMarketOrder) {
      return null;
    }
    const fee = isSwap ? SWAP_ORDER_EXECUTION_GAS_FEE : INCREASE_ORDER_EXECUTION_GAS_FEE
    return (
      <ExchangeInfoRow label="Execution Fee">
        {formatAmount(fee, 18, 4)} ETH
      </ExchangeInfoRow>
    );
  }, [isMarketOrder, isSwap])
  const renderMarginSection = useCallback(() => {
    return <>
      <div className="Confirmation-box-info">
        {renderMain()}
        {renderTriggerPriceWarning()}
        {renderFeeWarning()}
        {renderMinProfitWarning()}
        {renderExistingOrderWarning()}
        {(isShort) &&
          <ExchangeInfoRow label="Profits In">
              {getToken(chainId, shortCollateralAddress).symbol}
          </ExchangeInfoRow>
        }
        {(isLong) &&
          <ExchangeInfoRow label="Profits In" value={toTokenInfo.symbol} />
        }
        <ExchangeInfoRow label="Leverage">
          {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
            {formatAmount(existingPosition.leverage, 4, 2)}x
            <BsArrowRight className="transition-arrow" />
          </div>}
          {(toAmount && leverage && leverage.gt(0)) && `${formatAmount(leverage, 4, 2)}x`}
          {(!toAmount && leverage && leverage.gt(0)) && `-`}
          {(leverage && leverage.eq(0)) && `-`}
        </ExchangeInfoRow>
        <ExchangeInfoRow label="Liq. Price">
          {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
            ${formatAmount(existingLiquidationPrice, USD_DECIMALS, 2, true)}
            <BsArrowRight className="transition-arrow" />
          </div>}
          {toAmount && displayLiquidationPrice && `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, 2, true)}`}
          {!toAmount && displayLiquidationPrice && `-`}
          {!displayLiquidationPrice && `-`}
        </ExchangeInfoRow>
        <ExchangeInfoRow label="Fees">
          {formatAmount(feesUsd, USD_DECIMALS, 2, true)} USD
        </ExchangeInfoRow>
        {showSpread &&
          <ExchangeInfoRow label="Spread" isWarning={spread.isHigh} isTop={true}>
            {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
          </ExchangeInfoRow>
        }
        {isMarketOrder &&
          <ExchangeInfoRow label="Entry Price">
            {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
              ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, 2, true)}
              <BsArrowRight className="transition-arrow" />
            </div>}
            {nextAveragePrice && `$${formatAmount(nextAveragePrice, USD_DECIMALS, 2, true)}`}
            {!nextAveragePrice && `-`}
          </ExchangeInfoRow>
        }
        {!isMarketOrder &&
          <ExchangeInfoRow label="Limit Price" isTop={true}>
            ${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}
          </ExchangeInfoRow>
        }
        <ExchangeInfoRow label="Borrow Fee">
          {(isLong && toTokenInfo) && formatAmount(toTokenInfo.fundingRate, 4, 4)}
          {(isShort && shortCollateralToken) && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
          {((isLong && toTokenInfo && toTokenInfo.fundingRate) || (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) && "% / 1h"}
        </ExchangeInfoRow>
        {renderExecutionFee()}
      </div>
    </>
  }, [renderMain, renderTriggerPriceWarning, renderMinProfitWarning, shortCollateralAddress,
      isShort, isLong, toTokenInfo, nextAveragePrice, toAmount, hasExistingPosition, existingPosition,
      isMarketOrder, triggerPriceUsd, showSpread, spread, displayLiquidationPrice, existingLiquidationPrice,
      feesUsd, leverage, renderExecutionFee, shortCollateralToken, renderExistingOrderWarning, chainId, renderFeeWarning])

  const renderSwapSection = useCallback(() => {
    return <>
      <div className="Confirmation-box-info">
        {renderMain()}
        {renderFeeWarning()}
        {renderTriggerRatioWarning()}
        {renderSpreadWarning()}
        <ExchangeInfoRow label="Min. Receive">
          {formatAmount(minOut, toTokenInfo.decimals, 4, true)} {toTokenInfo.symbol}
        </ExchangeInfoRow>
        <ExchangeInfoRow label="Price">
          {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromTokenInfo, toTokenInfo)}
        </ExchangeInfoRow>
        {!isMarketOrder &&
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Limit Price</div>
            <div className="align-right">
              {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
            </div>
          </div>
        }
        {showSpread &&
          <ExchangeInfoRow label="Spread" isWarning={spread.isHigh}>
            {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
          </ExchangeInfoRow>
        }
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">Fees</div>
          <div className="align-right">
            {formatAmount(feeBps, 2, 2, true)}%
            ({formatAmount(fees, fromTokenInfo.decimals, 4, true)} {fromTokenInfo.symbol}: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)})
          </div>
        </div>
        {renderExecutionFee()}
        {fromTokenUsd &&
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{fromTokenInfo.symbol} Price</div>
            <div className="align-right">{fromTokenUsd} USD</div>
          </div>
        }
        {toTokenUsd &&
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{toTokenInfo.symbol} Price</div>
            <div className="align-right">{toTokenUsd} USD</div>
          </div>
        }
      </div>
    </>
  }, [renderMain, renderTriggerRatioWarning, renderSpreadWarning, fromTokenInfo, toTokenInfo,
      showSpread, spread, feesUsd, feeBps, renderExecutionFee, fromTokenUsd, toTokenUsd,
      triggerRatio, fees, isMarketOrder, minOut, renderFeeWarning])

  return <div className="Confirmation-box">
    <Modal isVisible={true} setIsVisible={() => setIsConfirming(false)} label={title}>
      {isSwap && renderSwapSection()}
      {!isSwap && renderMarginSection()}
      <div className="Confirmation-box-row">
        <button
          onClick={onConfirmationClick}
          className="App-cta Confirmation-box-button"
          disabled={!isPrimaryEnabled()}
        >{getPrimaryText()}</button>
      </div>
    </Modal>
  </div>;
}
