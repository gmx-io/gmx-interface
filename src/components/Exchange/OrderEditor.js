import React, { useState, useMemo } from "react";
import { BsArrowRight } from "react-icons/bs";

import {
  PRECISION,
  USD_DECIMALS,
  SWAP,
  DECREASE,
  INCREASE,
  isTriggerRatioInverted,
  getNextToAmount,
  getExchangeRate,
  getExchangeRateDisplay,
  calculatePositionDelta,
} from "lib/legacy";
import { updateSwapOrder, updateIncreaseOrder, updateDecreaseOrder } from "domain/legacy";
import Modal from "../Modal/Modal";
import ExchangeInfoRow from "./ExchangeInfoRow";
import { getContract } from "config/contracts";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { getTokenInfo } from "domain/tokens/utils";
import { bigNumberify, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useChainId } from "lib/chains";
import { t, Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { getPriceDecimals, getToken } from "config/tokens";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";

export default function OrderEditor(props) {
  const {
    account,
    order,
    setEditingOrder,
    infoTokens,
    pendingTxns,
    setPendingTxns,
    library,
    totalTokenWeights,
    usdgSupply,
    getPositionForOrder,
    positionsMap,
    savedShouldDisableValidationForTesting,
  } = props;

  const { chainId } = useChainId();

  const position = order.type !== SWAP ? getPositionForOrder(account, order, positionsMap) : null;

  const liquidationPrice =
    order.type === DECREASE && position
      ? getLiquidationPrice({
          size: position.size,
          collateral: position.collateral,
          fundingFee: position.fundingFee,
          isLong: position.isLong,
          averagePrice: position.averagePrice,
        })
      : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const fromTokenInfo = order.type === SWAP ? getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress) : null;
  const toTokenInfo =
    order.type === SWAP
      ? getTokenInfo(infoTokens, order.path[order.path.length - 1], order.shouldUnwrap, nativeTokenAddress)
      : null;

  const triggerRatioInverted = useMemo(() => {
    if (order.type !== SWAP) {
      return null;
    }

    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo, order.type]);

  let initialRatio = 0;
  if (order.triggerRatio) {
    initialRatio = triggerRatioInverted ? PRECISION.mul(PRECISION).div(order.triggerRatio) : order.triggerRatio;
  }
  const [triggerRatioValue, setTriggerRatioValue] = useState(formatAmountFree(initialRatio, USD_DECIMALS, 6));

  const [triggerPriceValue, setTriggerPriceValue] = useState(formatAmountFree(order.triggerPrice, USD_DECIMALS, 4));
  const triggerPrice = useMemo(() => {
    return triggerPriceValue ? parseValue(triggerPriceValue, USD_DECIMALS) : 0;
  }, [triggerPriceValue]);

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return bigNumberify(0);
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (triggerRatioInverted) {
      ratio = PRECISION.mul(PRECISION).div(ratio);
    }
    return ratio;
  }, [triggerRatioValue, triggerRatioInverted]);

  const indexTokenMarkPrice = useMemo(() => {
    if (order.type === SWAP) {
      return;
    }
    const toTokenInfo = getTokenInfo(infoTokens, order.indexToken);
    return order.isLong ? toTokenInfo.maxPrice : toTokenInfo.minPrice;
  }, [infoTokens, order]);

  let toAmount;
  if (order.type === SWAP) {
    const { amount } = getNextToAmount(
      chainId,
      order.amountIn,
      order.path[0],
      order.path[order.path.length - 1],
      infoTokens,
      undefined,
      triggerRatio,
      usdgSupply,
      totalTokenWeights
    );
    toAmount = amount;
  }

  const onClickPrimary = () => {
    setIsSubmitting(true);

    let func;
    let params;

    if (order.type === SWAP) {
      func = updateSwapOrder;
      params = [chainId, library, order.index, toAmount, triggerRatio, order.triggerAboveThreshold];
    } else if (order.type === DECREASE) {
      func = updateDecreaseOrder;
      params = [
        chainId,
        library,
        order.index,
        order.collateralDelta,
        order.sizeDelta,
        triggerPrice,
        order.triggerAboveThreshold,
      ];
    } else if (order.type === INCREASE) {
      func = updateIncreaseOrder;
      params = [chainId, library, order.index, order.sizeDelta, triggerPrice, order.triggerAboveThreshold];
    }

    params.push({
      successMsg: t`Order updated!`,
      failMsg: t`Order update failed.`,
      sentMsg: t`Order update submitted!`,
      pendingTxns,
      setPendingTxns,
    });

    return func(...params)
      .then(() => {
        setEditingOrder(null);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onTriggerRatioChange = (evt) => {
    setTriggerRatioValue(evt.target.value || "");
  };

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const getError = () => {
    if ((!triggerRatio || triggerRatio.eq(0)) && (!triggerPrice || triggerPrice.eq(0))) {
      return t`Enter Price`;
    }
    if (order.type === SWAP && triggerRatio.eq(order.triggerRatio)) {
      return t`Enter new Price`;
    }
    if (order.type !== SWAP && triggerPrice.eq(order.triggerPrice)) {
      return t`Enter new Price`;
    }
    if (position) {
      if (order.type === DECREASE) {
        if (position.isLong && triggerPrice.lte(liquidationPrice)) {
          return t`Price below Liq. Price`;
        }
        if (!position.isLong && triggerPrice.gte(liquidationPrice)) {
          return t`Price above Liq. Price`;
        }
      }

      const { delta, hasProfit } = calculatePositionDelta(triggerPrice, position);
      if (hasProfit && delta.eq(0)) {
        return t`Invalid price, see warning`;
      }
    }

    if (order.type !== SWAP && indexTokenMarkPrice && !savedShouldDisableValidationForTesting) {
      if (order.triggerAboveThreshold && indexTokenMarkPrice.gt(triggerPrice)) {
        return t`Price below Mark Price`;
      }
      if (!order.triggerAboveThreshold && indexTokenMarkPrice.lt(triggerPrice)) {
        return t`Price above Mark Price`;
      }
    }

    if (order.type === SWAP) {
      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && !currentRate.gte(triggerRatio)) {
        return triggerRatioInverted ? t`Price is below Mark Price` : t`Price is above Mark Price`;
      }
    }
  };

  const isPrimaryEnabled = () => {
    if (isSubmitting) {
      return false;
    }
    const error = getError();
    if (error) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }

    if (isSubmitting) {
      return t`Updating Order...`;
    }
    return t`Update Order`;
  };

  if (order.type !== SWAP) {
    const triggerPricePrefix = order.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
    const indexTokenInfo = getToken(chainId, order.indexToken);
    const orderPriceDecimal = getPriceDecimals(chainId, indexTokenInfo.symbol);
    return (
      <Modal
        isVisible={true}
        className="Exchange-list-modal"
        setIsVisible={() => setEditingOrder(null)}
        label={t`Edit order`}
      >
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <Trans>Price</Trans>
            </div>
            <div
              className="muted align-right clickable"
              onClick={() => {
                setTriggerPriceValue(formatAmountFree(indexTokenMarkPrice, USD_DECIMALS, orderPriceDecimal));
              }}
            >
              <Trans>Mark: {formatAmount(indexTokenMarkPrice, USD_DECIMALS, orderPriceDecimal)}</Trans>
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
        <ExchangeInfoRow label={t`Price`}>
          {triggerPrice && !triggerPrice.eq(order.triggerPrice) ? (
            <>
              <span className="muted">
                {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </span>
              &nbsp;
              <BsArrowRight />
              &nbsp;
              {triggerPricePrefix} {formatAmount(triggerPrice, USD_DECIMALS, 2, true)}
            </>
          ) : (
            <span>
              {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
            </span>
          )}
        </ExchangeInfoRow>
        {liquidationPrice && (
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">
              <Trans>Liq. Price</Trans>
            </div>
            <div className="align-right">{`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isVisible={true}
      className="Exchange-list-modal"
      setIsVisible={() => setEditingOrder(null)}
      label={t`Edit order`}
    >
      <div className="Exchange-swap-section">
        <div className="Exchange-swap-section-top">
          <div className="muted">
            <Trans>Price</Trans>
          </div>
          {fromTokenInfo && toTokenInfo && (
            <div
              className="muted align-right clickable"
              onClick={() => {
                setTriggerRatioValue(
                  formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10)
                );
              }}
            >
              <Trans>Mark Price: </Trans>
              {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 2)}
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
              value={triggerRatioValue}
              onChange={onTriggerRatioChange}
            />
          </div>
          {(() => {
            if (!toTokenInfo) return;
            if (!fromTokenInfo) return;
            const [tokenA, tokenB] = triggerRatioInverted ? [toTokenInfo, fromTokenInfo] : [fromTokenInfo, toTokenInfo];
            return (
              <div className="PositionEditor-token-symbol Order-editor-tokens">
                <TokenWithIcon className="Order-editor-icon" symbol={tokenA.symbol} displaySize={20} />
                &nbsp;/&nbsp;
                <TokenWithIcon className="Order-editor-icon" symbol={tokenB.symbol} displaySize={20} />
              </div>
            );
          })()}
        </div>
      </div>
      <ExchangeInfoRow label={t`Minimum received`}>
        {triggerRatio && !triggerRatio.eq(order.triggerRatio) ? (
          <>
            <span className="muted">{formatAmount(order.minOut, toTokenInfo.decimals, 4, true)}</span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {formatAmount(toAmount, toTokenInfo.decimals, 4, true)}
          </>
        ) : (
          formatAmount(order.minOut, toTokenInfo.decimals, 4, true)
        )}
        &nbsp;{toTokenInfo.symbol}
      </ExchangeInfoRow>
      <ExchangeInfoRow label={t`Price`}>
        {triggerRatio && !triggerRatio.eq(0) && !triggerRatio.eq(order.triggerRatio) ? (
          <>
            <span className="muted">
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
                omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
              })}
            </span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
          </>
        ) : (
          getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
            omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
          })
        )}
      </ExchangeInfoRow>
      {fromTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>{fromTokenInfo.symbol} price</Trans>
          </div>
          <div className="align-right">{formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      {toTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>{toTokenInfo.symbol} price</Trans>
          </div>
          <div className="align-right">{formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      <div className="Exchange-swap-button-container">
        <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
          {getPrimaryText()}
        </Button>
      </div>
    </Modal>
  );
}
