import { Trans, t } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { useMarketsInfo } from "domain/synthetics/markets";
import {
  AggregatedOrderData,
  OrderType,
  getAcceptablePrice,
  getToTokenFromSwapPath,
  isDecreaseOrder,
  isIncreaseOrder,
  isLimitOrder,
  isSwapOrder,
  isTriggerDecreaseOrder,
} from "domain/synthetics/orders";
import { PositionInfo, PositionsInfoData, getPosition, getPositionKey } from "domain/synthetics/positions";
import {
  TokensRatio,
  getTokenData,
  getTokensRatioByPrice,
  getTokensRatioByAmounts,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { bigNumberify, formatAmount, formatAmountFree, formatTokenAmount, formatUsd, parseValue } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import { useWeb3React } from "@web3-react/core";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY } from "config/localStorage";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasPrice,
} from "domain/synthetics/fees";
import { useGasLimits } from "domain/synthetics/fees";
import { updateOrderTxn } from "domain/synthetics/orders/updateOrderTxn";
import { BigNumber } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { getNextTokenAmount } from "../Trade/utils";
import "./OrderEditor.scss";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/factors";

type Props = {
  positionsData: PositionsInfoData;
  order: AggregatedOrderData;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function OrderEditor(p: Props) {
  const { chainId } = useChainId();
  const { library } = useWeb3React();

  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const [savedAcceptablePriceImpactBps] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY],
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS
  );
  const acceptablePriceImpactBps = bigNumberify(savedAcceptablePriceImpactBps!);

  const [isInited, setIsInited] = useState(false);

  const [sizeInputValue, setSizeInputValue] = useState("");
  const sizeDeltaUsd = parseValue(sizeInputValue || "0", USD_DECIMALS);

  const [triggerPirceInputValue, setTriggerPriceInputValue] = useState("");
  const triggerPrice = parseValue(triggerPirceInputValue || "0", USD_DECIMALS);

  const { acceptablePrice } = getAcceptablePrice({
    isIncrease: isIncreaseOrder(p.order.orderType),
    isLong: p.order.isLong,
    indexPrice: triggerPrice,
    acceptablePriceImpactBps: acceptablePriceImpactBps,
  });

  // Swaps
  const isSwap = isSwapOrder(p.order.orderType);
  const fromToken = getTokenData(tokensData, p.order.initialCollateralTokenAddress);
  const toTokenAddress = getToTokenFromSwapPath(
    marketsInfoData || {},
    p.order.initialCollateralTokenAddress,
    p.order.swapPath
  );
  const toToken = getTokenData(tokensData, toTokenAddress);
  const fromTokenPrice = fromToken?.prices?.maxPrice;
  const toTokenPrice = toToken?.prices?.minPrice;
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  const markRatio =
    fromToken &&
    toToken &&
    fromTokenPrice &&
    toTokenPrice &&
    getTokensRatioByPrice({
      fromToken,
      toToken,
      fromPrice: fromTokenPrice,
      toPrice: toTokenPrice,
    });

  const triggerRatio = useMemo(() => {
    if (!markRatio) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio?.gt(0) ? ratio : markRatio.ratio,
      largestAddress: markRatio.largestAddress,
      smallestAddress: markRatio.smallestAddress,
    } as TokensRatio;
  }, [markRatio, triggerRatioInputValue]);

  const minOutputAmount =
    isSwap && fromTokenPrice && toTokenPrice
      ? getNextTokenAmount({
          fromToken,
          toToken,
          fromTokenAmount: p.order.initialCollateralDeltaAmount,
          fromTokenPrice,
          toTokenPrice,
          swapTriggerRatio: triggerRatio?.ratio,
          isInvertedTriggerRatio: triggerRatio?.largestAddress === "to",
        })
      : undefined;

  const market = getByKey(marketsInfoData, p.order.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const markPrice = p.order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const positionKey = getPositionKey(
    p.order.account,
    p.order.marketAddress,
    p.order.initialCollateralTokenAddress,
    p.order.isLong
  );

  const existingPosition = getPosition(p.positionsData, positionKey) as PositionInfo | undefined;

  const executionFee = useMemo(() => {
    if (!p.order.isFrozen || !gasLimits || !gasPrice || !tokensData) return undefined;

    let estimatedGas: BigNumber | undefined;

    if (isSwapOrder(p.order.orderType)) {
      estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (isIncreaseOrder(p.order.orderType)) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (isDecreaseOrder(p.order.orderType)) {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (!estimatedGas) return undefined;

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, p.order.isFrozen, p.order.orderType, p.order.swapPath, tokensData]);

  function getError() {
    if (isSwapOrder(p.order.orderType)) {
      if (!triggerRatio?.ratio?.gt(0)) {
        return t`Enter a ratio`;
      }

      if (minOutputAmount?.eq(p.order.minOutputAmount)) {
        return t`Enter a new ratio`;
      }

      return;
    }

    if (!markPrice) {
      return t`Loading...`;
    }

    if (!sizeDeltaUsd?.gt(0)) {
      return t`Enter a size`;
    }

    if (!triggerPrice?.gt(0)) {
      return t`Enter a price`;
    }

    if (sizeDeltaUsd?.eq(p.order.sizeDeltaUsd) && triggerPrice?.eq(p.order.triggerPrice!)) {
      return t`Enter a new size or price`;
    }

    if (isLimitOrder(p.order.orderType)) {
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

    if (isTriggerDecreaseOrder(p.order.orderType)) {
      if (!markPrice) {
        return t`Loading...`;
      }

      if (sizeDeltaUsd?.eq(p.order.sizeDeltaUsd || 0) && triggerPrice?.eq(p.order.triggerPrice || 0)) {
        return t`Enter a new size or price`;
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
    updateOrderTxn(chainId, library, {
      orderKey: p.order.key,
      sizeDeltaUsd: sizeDeltaUsd || p.order.sizeDeltaUsd,
      triggerPrice: triggerPrice || p.order.triggerPrice!,
      acceptablePrice: acceptablePrice || p.order.acceptablePrice!,
      minOutputAmount: minOutputAmount || p.order.minOutputAmount,
      executionFee: executionFee?.feeTokenAmount,
      indexToken: indexToken,
      setPendingTxns: p.setPendingTxns,
    }).then(() => p.onClose());
  }

  const submitButtonState = getSubmitButtonState();

  useEffect(
    function initValues() {
      if (isInited) return;

      if (isSwapOrder(p.order.orderType)) {
        const ratio =
          fromToken &&
          toToken &&
          getTokensRatioByAmounts({
            fromToken,
            toToken,
            fromTokenAmount: p.order.initialCollateralDeltaAmount,
            toTokenAmount: p.order.minOutputAmount,
          });

        if (ratio) {
          setTriggerRatioInputValue(formatAmount(ratio.ratio, USD_DECIMALS, 2));
        }
      } else {
        setSizeInputValue(formatAmountFree(p.order.sizeDeltaUsd || 0, USD_DECIMALS));
        setTriggerPriceInputValue(formatAmount(p.order.triggerPrice || 0, USD_DECIMALS, 2));
      }

      setIsInited(true);
    },
    [fromToken, isInited, p.order, sizeInputValue, toToken]
  );

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
              topLeftLabel={isTriggerDecreaseOrder(p.order.orderType) ? t`Close` : t`Size`}
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
            {triggerRatio && (
              <BuyInputSection
                topLeftLabel={t`Price`}
                topRightValue={formatAmount(markRatio?.ratio, USD_DECIMALS, 4)}
                onClickTopRightLabel={() => {
                  setTriggerRatioInputValue(formatAmount(markRatio?.ratio, USD_DECIMALS, 10));
                }}
                inputValue={triggerRatioInputValue}
                onInputValueChange={(e) => {
                  setTriggerRatioInputValue(e.target.value);
                }}
              >
                {triggerRatio.largestAddress === fromToken?.address
                  ? `${toToken?.symbol} per ${fromToken?.symbol}`
                  : `${fromToken?.symbol} per ${toToken?.symbol}`}
              </BuyInputSection>
            )}
          </>
        )}

        <div className="PositionEditor-info-box">
          {!isSwapOrder(p.order.orderType) && (
            <>
              <ExchangeInfoRow label={t`Acceptable Price`} value={formatUsd(acceptablePrice)} />
              {existingPosition?.liqPrice && (
                <ExchangeInfoRow label={t`Liq. Price`} value={formatUsd(existingPosition.liqPrice)} />
              )}
            </>
          )}

          {executionFee?.feeTokenAmount.gt(0) && (
            <ExchangeInfoRow label={t`Execution Fee`}>
              {formatTokenAmount(
                executionFee?.feeTokenAmount,
                executionFee?.feeToken.decimals,
                executionFee?.feeToken.symbol,
                { displayDecimals: 5 }
              )}
            </ExchangeInfoRow>
          )}
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
