import { t, Trans } from "@lingui/macro";
import React, { useState, useMemo } from "react";
import { BsArrowRight } from "react-icons/bs";

import { getContract } from "config/contracts";
import { USD_DECIMALS } from "config/factors";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { updateSwapOrder, updateIncreaseOrder, updateDecreaseOrder } from "domain/legacy";
import { getTokenInfo } from "domain/tokens/utils";
import { useChainId } from "lib/chains";
import {
  SWAP,
  DECREASE,
  INCREASE,
  isTriggerRatioInverted,
  getNextToAmount,
  getExchangeRate,
  getExchangeRateDisplay,
  calculatePositionDelta,
} from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue, PRECISION } from "lib/numbers";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { getPriceDecimals, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";

import ExchangeInfoRow from "./ExchangeInfoRow";
import Modal from "../Modal/Modal";

export default function OrderEditor(props) {
  const {
    account,
    order,
    setEditingOrder,
    infoTokens,
    pendingTxns,
    setPendingTxns,
    signer,
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
    initialRatio = triggerRatioInverted ? bigMath.mulDiv(PRECISION, PRECISION, order.triggerRatio) : order.triggerRatio;
  }
  const [triggerRatioValue, setTriggerRatioValue] = useState(formatAmountFree(initialRatio, USD_DECIMALS, 6));

  const [triggerPriceValue, setTriggerPriceValue] = useState(formatAmountFree(order.triggerPrice, USD_DECIMALS, 4));
  const triggerPrice = useMemo(() => {
    return triggerPriceValue ? parseValue(triggerPriceValue, USD_DECIMALS) : 0;
  }, [triggerPriceValue]);

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return 0n;
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (triggerRatioInverted) {
      ratio = bigMath.mulDiv(PRECISION, PRECISION, ratio);
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
      params = [chainId, signer, order.index, toAmount, triggerRatio, order.triggerAboveThreshold];
    } else if (order.type === DECREASE) {
      func = updateDecreaseOrder;
      params = [
        chainId,
        signer,
        order.index,
        order.collateralDelta,
        order.sizeDelta,
        triggerPrice,
        order.triggerAboveThreshold,
      ];
    } else if (order.type === INCREASE) {
      func = updateIncreaseOrder;
      params = [chainId, signer, order.index, order.sizeDelta, triggerPrice, order.triggerAboveThreshold];
    }

    params.push({
      successMsg: t`Order updated.`,
      failMsg: t`Order update failed.`,
      sentMsg: t`Order update submitted.`,
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
    if (triggerRatio === undefined && !triggerPrice) {
      return t`Enter price`;
    }
    if (order.type === SWAP && triggerRatio == order.triggerRatio) {
      return t`Enter new price`;
    }
    if (order.type !== SWAP && triggerPrice == order.triggerPrice) {
      return t`Enter new price`;
    }
    if (position) {
      if (order.type === DECREASE) {
        if (position.isLong && triggerPrice <= liquidationPrice) {
          return t`Price below liq. price`;
        }
        if (!position.isLong && triggerPrice >= liquidationPrice) {
          return t`Price above liq. price`;
        }
      }

      const { delta, hasProfit } = calculatePositionDelta(triggerPrice, position);
      if (hasProfit && delta == 0n) {
        return t`Invalid price, see warning`;
      }
    }

    if (order.type !== SWAP && indexTokenMarkPrice !== undefined && !savedShouldDisableValidationForTesting) {
      if (order.triggerAboveThreshold && indexTokenMarkPrice > triggerPrice) {
        return t`Price below mark price`;
      }
      if (!order.triggerAboveThreshold && indexTokenMarkPrice < triggerPrice) {
        return t`Price above mark price`;
      }
    }

    if (order.type === SWAP) {
      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate !== undefined && currentRate < triggerRatio) {
        return triggerRatioInverted ? t`Price is below mark price` : t`Price is above mark price`;
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
      return t`Updating order`;
    }
    return t`Update order`;
  };

  const TokensLabel = () => {
    if (!toTokenInfo || !fromTokenInfo) {
      return;
    }
    const [tokenA, tokenB] = triggerRatioInverted ? [toTokenInfo, fromTokenInfo] : [fromTokenInfo, toTokenInfo];
    return (
      <div className="PositionEditor-token-symbol Order-editor-tokens">
        <TokenWithIcon className="Order-editor-icon" symbol={tokenA.symbol} displaySize={20} />
        &nbsp;/&nbsp;
        <TokenWithIcon className="Order-editor-icon" symbol={tokenB.symbol} displaySize={20} />
      </div>
    );
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
        <div className="mb-12">
          <BuyInputSection
            inputValue={triggerPriceValue}
            onInputValueChange={onTriggerPriceChange}
            topLeftLabel={t`Price`}
            topRightLabel={t`Mark`}
            topRightValue={
              indexTokenMarkPrice !== undefined
                ? formatAmount(indexTokenMarkPrice, USD_DECIMALS, orderPriceDecimal)
                : undefined
            }
            onClickTopRightLabel={() =>
              indexTokenMarkPrice !== undefined &&
              setTriggerPriceValue(formatAmountFree(indexTokenMarkPrice, USD_DECIMALS, orderPriceDecimal))
            }
          >
            USD
          </BuyInputSection>
        </div>
        <ExchangeInfoRow label={t`Price`}>
          {triggerPrice && triggerPrice != order.triggerPrice ? (
            <>
              <span className="muted">
                {triggerPricePrefix} {formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}
              </span>
              &nbsp;
              <BsArrowRight className="inline-block" />
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
            <div className="align-right">{`$\u200a\u200d${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
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
      <div className="mb-12">
        <BuyInputSection
          inputValue={triggerRatioValue}
          onInputValueChange={onTriggerRatioChange}
          topLeftLabel={t`Price`}
          topRightLabel={t`Mark`}
          topRightValue={formatAmount(
            getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted),
            USD_DECIMALS,
            2
          )}
          onClickTopRightLabel={() =>
            getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted) !== undefined &&
            setTriggerRatioValue(
              formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10)
            )
          }
        >
          <TokensLabel />
        </BuyInputSection>
      </div>
      <ExchangeInfoRow label={t`Minimum received`}>
        {triggerRatio !== undefined && triggerRatio != order.triggerRatio ? (
          <>
            <span className="muted">{formatAmount(order.minOut, toTokenInfo.decimals, 4, true)}</span>
            &nbsp;
            <BsArrowRight className="inline-block" />
            &nbsp;
            {formatAmount(toAmount, toTokenInfo.decimals, 4, true)}
          </>
        ) : (
          formatAmount(order.minOut, toTokenInfo.decimals, 4, true)
        )}
        &nbsp;{toTokenInfo.symbol}
      </ExchangeInfoRow>
      <ExchangeInfoRow label={t`Price`}>
        {triggerRatio !== undefined && triggerRatio !== 0n && triggerRatio != order.triggerRatio ? (
          <>
            <span className="muted">
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
                omitSymbols: triggerRatio != order.triggerRatio,
              })}
            </span>
            &nbsp;
            <BsArrowRight className="inline-block" />
            &nbsp;
            {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
          </>
        ) : (
          getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
            omitSymbols: triggerRatio === undefined || triggerRatio != order.triggerRatio,
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
