import { Trans, t } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { formatFee, getExecutionFee } from "domain/synthetics/fees";
import {
  AggregatedOrderData,
  OrderType,
  getToTokenFromSwapPath,
  isLimitOrder,
  isStopMarketOrder,
  isSwapOrder,
} from "domain/synthetics/orders";
import { formatTokenAmountWithUsd, formatUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, parseValue } from "lib/numbers";
import { useState } from "react";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { InfoRow } from "components/InfoRow/InfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import {
  AggregatedPositionData,
  AggregatedPositionsData,
  getPosition,
  getPositionKey,
} from "domain/synthetics/positions";

import "./OrderEditor.scss";
import { getNextTokenAmount, useSwapTriggerRatioState } from "../Trade/utils";
import { updateOrderTxn } from "domain/synthetics/orders/updateOrderTxn";
import { useWeb3React } from "@web3-react/core";

type Props = {
  positionsData: AggregatedPositionsData;
  order: AggregatedOrderData;
  onClose: () => void;
};

export function OrderEditor(p: Props) {
  const { chainId } = useChainId();
  const { library } = useWeb3React();

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);

  const executionFee = getExecutionFee(tokensData);

  const [sizeInputValue, setSizeInputValue] = useState("");
  const sizeDeltaUsd = parseValue(sizeInputValue || "0", USD_DECIMALS);

  const [triggerPirceInputValue, setTriggerPriceInputValue] = useState("");
  const triggerPrice = parseValue(triggerPirceInputValue || "0", USD_DECIMALS);

  // Swaps
  const isSwap = isSwapOrder(p.order.orderType);
  const fromToken = getTokenData(tokensData, p.order.initialCollateralTokenAddress);
  const toTokenAddress = getToTokenFromSwapPath(marketsData, p.order.initialCollateralTokenAddress, p.order.swapPath);
  const toToken = getTokenData(tokensData, toTokenAddress);
  const fromTokenPrice = fromToken?.prices?.maxPrice;
  const toTokenPrice = toToken?.prices?.minPrice;

  const swapRatio = useSwapTriggerRatioState({
    isAllowed: true,
    fromTokenPrice,
    toTokenPrice,
  });
  const minOutputAmount =
    isSwap && fromTokenPrice && toTokenPrice
      ? getNextTokenAmount({
          fromToken,
          toToken,
          fromTokenAmount: p.order.initialCollateralDeltaAmount,
          fromTokenPrice,
          toTokenPrice,
          swapTriggerRatio: swapRatio?.ratio,
          isInvertedTriggerRatio: swapRatio?.biggestSide === "to",
        })
      : undefined;

  const market = getMarket(marketsData, p.order.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const markPrice = p.order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const positionKey = getPositionKey(
    p.order.account,
    p.order.marketAddress,
    p.order.initialCollateralTokenAddress,
    p.order.isLong
  );

  const existingPosition = getPosition(p.positionsData, positionKey) as AggregatedPositionData | undefined;

  function getError() {
    if (isSwapOrder(p.order.orderType)) {
      if (!swapRatio?.ratio?.gt(0)) {
        return t`Enter a ratio`;
      }

      if (minOutputAmount?.eq(p.order.minOutputAmount)) {
        return t`Enter a new ratio`;
      }

      return;
    }

    if (isLimitOrder(p.order.orderType)) {
      if (!markPrice) {
        return t`Loading...`;
      }

      if (sizeDeltaUsd?.eq(p.order.sizeDeltaUsd || 0)) {
        return t`Enter a new size`;
      }

      if (triggerPrice?.eq(p.order.triggerPrice || 0)) {
        return t`Enter a new price`;
      }

      if (p.order.isLong) {
        if (triggerPrice?.gte(markPrice)) {
          return t`Price above Mark Price`;
        }
      } else {
        if (triggerPrice?.lte(markPrice)) {
          return t`Price below Mark Price`;
        }
      }
    }

    if (isStopMarketOrder(p.order.orderType)) {
      if (!markPrice) {
        return t`Loading...`;
      }

      if (sizeDeltaUsd?.eq(p.order.sizeDeltaUsd || 0)) {
        return t`Enter a new size`;
      }

      if (triggerPrice?.eq(p.order.triggerPrice || 0)) {
        return t`Enter a new price`;
      }

      if (existingPosition?.liqPrice) {
        if (existingPosition.isLong && triggerPrice?.lte(existingPosition?.liqPrice)) {
          return t`Price below Liq. Price`;
        }

        if (!existingPosition.isLong && triggerPrice?.gte(existingPosition?.liqPrice)) {
          return t`Price above Liq. Price`;
        }
      }

      if (p.order.isLong) {
        if (p.order.orderType === OrderType.LimitDecrease && triggerPrice?.lte(markPrice)) {
          return t`Price below Mark Price`;
        }

        if (p.order.orderType === OrderType.StopLossDecrease && triggerPrice?.gte(markPrice)) {
          return t`Price above Mark Price`;
        }
      } else {
        if (p.order.orderType === OrderType.LimitDecrease && triggerPrice?.gte(markPrice)) {
          return t`Price above Mark Price`;
        }

        if (p.order.orderType === OrderType.StopLossDecrease && triggerPrice?.lte(markPrice)) {
          return t`Price below Mark Price`;
        }
      }
    }
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getError();

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: "Update Order",
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!p.order.triggerPrice || !executionFee?.feeTokenAmount) return;

    updateOrderTxn(chainId, library, {
      order: p.order,
      executionFee: executionFee?.feeTokenAmount,
      sizeDeltaUsd,
      triggerPrice,
      minOutputAmount,
    }).then(() => p.onClose());
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={<Trans>Edit {p.order.title}</Trans>}
        allowContentTouchMove
      >
        {!isSwapOrder(p.order.orderType) && (
          <>
            <BuyInputSection
              topLeftLabel={isStopMarketOrder(p.order.orderType) ? t`Close` : t`Size`}
              inputValue={sizeInputValue}
              onInputValueChange={(e) => setSizeInputValue(e.target.value)}
            >
              USD
            </BuyInputSection>

            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightLabel={t`Mark:`}
              topRightValue={formatUsd(markPrice)}
              onClickTopRightLabel={() => setTriggerPriceInputValue(formatAmount(markPrice, USD_DECIMALS, 2))}
              inputValue={triggerPirceInputValue}
              onInputValueChange={(e) => setTriggerPriceInputValue(e.target.value)}
            >
              USD
            </BuyInputSection>
          </>
        )}

        {isSwapOrder(p.order.orderType) && (
          <>
            {swapRatio && (
              <BuyInputSection
                topLeftLabel={t`Price`}
                topRightValue={formatAmount(swapRatio.markRatio, USD_DECIMALS, 4)}
                onClickTopRightLabel={() => {
                  swapRatio.setInputValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 10));
                }}
                inputValue={swapRatio.inputValue}
                onInputValueChange={(e) => {
                  swapRatio.setInputValue(e.target.value);
                }}
              >
                {swapRatio.biggestSide === "from"
                  ? `${toToken?.symbol} per ${fromToken?.symbol}`
                  : `${fromToken?.symbol} per ${toToken?.symbol}`}
              </BuyInputSection>
            )}
          </>
        )}

        <div className="PositionEditor-info-box">
          {existingPosition?.liqPrice && <InfoRow label={t`Liq. Price`} value={formatUsd(existingPosition.liqPrice)} />}
          <InfoRow
            label={<Trans>Fees</Trans>}
            value={
              <Tooltip
                handle={formatFee(executionFee?.feeUsd)}
                position="right-top"
                renderContent={() => (
                  <div>
                    <StatsTooltipRow
                      label={t`Execution fee`}
                      value={
                        formatTokenAmountWithUsd(
                          executionFee?.feeTokenAmount,
                          executionFee?.feeUsd,
                          executionFee?.feeToken?.symbol,
                          executionFee?.feeToken?.decimals
                        ) || "..."
                      }
                      showDollar={false}
                    />
                  </div>
                )}
              />
            }
          />
        </div>

        <div className="Exchange-swap-button-container">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled} authRequired>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}
