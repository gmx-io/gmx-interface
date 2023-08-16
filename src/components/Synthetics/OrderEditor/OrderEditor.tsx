import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { MarketsInfoData } from "domain/synthetics/markets";
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import {
  PositionsInfoData,
  formatAcceptablePrice,
  formatLiquidationPrice,
  getPositionKey,
} from "domain/synthetics/positions";
import {
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  getAmountByRatio,
  getTokenData,
  getTokensRatioByPrice,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import {
  bigNumberify,
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatTokenAmount,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/factors";
import { SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY } from "config/localStorage";
import { getWrappedToken } from "config/tokens";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { updateOrderTxn } from "domain/synthetics/orders/updateOrderTxn";
import { getAcceptablePrice, getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import "./OrderEditor.scss";
import useWallet from "lib/wallets/useWallet";

type Props = {
  positionsData?: PositionsInfoData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  order: OrderInfo;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function OrderEditor(p: Props) {
  const { marketsInfoData, tokensData } = p;
  const { chainId } = useChainId();
  const { signer } = useWallet();

  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const [savedAcceptablePriceImpactBps] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY],
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS
  );
  const acceptablePriceImpactBps = bigNumberify(savedAcceptablePriceImpactBps!);

  const [isInited, setIsInited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizeInputValue, setSizeInputValue] = useState("");
  const sizeDeltaUsd = parseValue(sizeInputValue || "0", USD_DECIMALS);

  const [triggerPirceInputValue, setTriggerPriceInputValue] = useState("");
  const triggerPrice = parseValue(triggerPirceInputValue || "0", USD_DECIMALS)!;

  let { acceptablePrice } = getAcceptablePrice({
    isIncrease: isIncreaseOrderType(p.order.orderType),
    isLong: p.order.isLong,
    indexPrice: triggerPrice,
    acceptablePriceImpactBps: acceptablePriceImpactBps,
    sizeDeltaUsd: p.order.sizeDeltaUsd,
  });

  // For SL orders Acceptable Price is not applicable and set to 0 or MaxUnit256
  if (p.order.orderType === OrderType.StopLossDecrease) {
    acceptablePrice = (p.order as PositionOrderInfo).acceptablePrice;
  }

  // Swaps
  const fromToken = getTokenData(tokensData, p.order.initialCollateralTokenAddress);

  const swapPathInfo = marketsInfoData
    ? getSwapPathOutputAddresses({
        marketsInfoData: marketsInfoData,
        initialCollateralAddress: p.order.initialCollateralTokenAddress,
        swapPath: p.order.swapPath,
        wrappedNativeTokenAddress: getWrappedToken(chainId).address,
        shouldUnwrapNativeToken: p.order.shouldUnwrapNativeToken,
      })
    : undefined;

  const toTokenAddress = swapPathInfo?.outTokenAddress;

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

  const isRatioInverted = markRatio?.largestToken.address === fromToken?.address;

  const triggerRatio = useMemo(() => {
    if (!markRatio) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio?.gt(0) ? ratio : markRatio.ratio,
      largestToken: markRatio.largestToken,
      smallestToken: markRatio.smallestToken,
    } as TokensRatio;
  }, [markRatio, triggerRatioInputValue]);

  let minOutputAmount = p.order.minOutputAmount;

  if (fromToken && toToken && triggerRatio) {
    minOutputAmount = getAmountByRatio({
      fromToken,
      toToken,
      fromTokenAmount: p.order.initialCollateralDeltaAmount,
      ratio: triggerRatio?.ratio,
      shouldInvertRatio: !isRatioInverted,
    });

    const priceImpactAmount = convertToTokenAmount(
      p.order.swapPathStats?.totalSwapPriceImpactDeltaUsd,
      p.order.targetCollateralToken.decimals,
      p.order.targetCollateralToken.prices.minPrice
    );

    const swapFeeAmount = convertToTokenAmount(
      p.order.swapPathStats?.totalSwapFeeUsd,
      p.order.targetCollateralToken.decimals,
      p.order.targetCollateralToken.prices.minPrice
    );

    minOutputAmount = minOutputAmount.add(priceImpactAmount || 0).sub(swapFeeAmount || 0);
  }

  const market = getByKey(marketsInfoData, p.order.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const indexPriceDecimals = indexToken?.priceDecimals;
  const markPrice = p.order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;

  const positionKey = getPositionKey(
    p.order.account,
    p.order.marketAddress,
    p.order.initialCollateralTokenAddress,
    p.order.isLong
  );

  const existingPosition = getByKey(p.positionsData, positionKey);

  const executionFee = useMemo(() => {
    if (!p.order.isFrozen || !gasLimits || !gasPrice || !tokensData) return undefined;

    let estimatedGas: BigNumber | undefined;

    if (isSwapOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (isIncreaseOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (isDecreaseOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapPath: p.order.swapPath,
      });
    }

    if (!estimatedGas) return undefined;

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, p.order.isFrozen, p.order.orderType, p.order.swapPath, tokensData]);

  function getError() {
    if (isSubmitting) {
      return t`Updating Order...`;
    }

    if (isSwapOrderType(p.order.orderType)) {
      if (!triggerRatio?.ratio?.gt(0) || !minOutputAmount.gt(0)) {
        return t`Enter a ratio`;
      }

      if (minOutputAmount.eq(p.order.minOutputAmount)) {
        return t`Enter a new ratio`;
      }

      if (triggerRatio && !isRatioInverted && markRatio?.ratio.lt(triggerRatio.ratio)) {
        return t`Price above Mark Price`;
      }

      if (triggerRatio && isRatioInverted && markRatio?.ratio.gt(triggerRatio.ratio)) {
        return t`Price below Mark Price`;
      }

      return;
    }

    const positionOrder = p.order as PositionOrderInfo;

    if (!markPrice) {
      return t`Loading...`;
    }

    if (!sizeDeltaUsd?.gt(0)) {
      return t`Enter an amount`;
    }

    if (!triggerPrice?.gt(0)) {
      return t`Enter a price`;
    }

    if (sizeDeltaUsd?.eq(positionOrder.sizeDeltaUsd) && triggerPrice?.eq(positionOrder.triggerPrice!)) {
      return t`Enter new amount or price`;
    }

    if (isLimitOrderType(p.order.orderType)) {
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

    if (isTriggerDecreaseOrderType(p.order.orderType)) {
      if (!markPrice) {
        return t`Loading...`;
      }

      if (sizeDeltaUsd?.eq(p.order.sizeDeltaUsd || 0) && triggerPrice?.eq(positionOrder.triggerPrice || 0)) {
        return t`Enter a new size or price`;
      }

      if (existingPosition?.liquidationPrice) {
        if (existingPosition.isLong && triggerPrice?.lte(existingPosition?.liquidationPrice)) {
          return t`Price below Liq. Price`;
        }

        if (!existingPosition.isLong && triggerPrice?.gte(existingPosition?.liquidationPrice)) {
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
    if (!signer) return;
    const positionOrder = p.order as PositionOrderInfo;

    setIsSubmitting(true);

    updateOrderTxn(chainId, signer, {
      orderKey: p.order.key,
      sizeDeltaUsd: sizeDeltaUsd || positionOrder.sizeDeltaUsd,
      triggerPrice: triggerPrice || positionOrder.triggerPrice,
      acceptablePrice: acceptablePrice || positionOrder.acceptablePrice,
      minOutputAmount: minOutputAmount || p.order.minOutputAmount,
      executionFee: executionFee?.feeTokenAmount,
      indexToken: indexToken,
      setPendingTxns: p.setPendingTxns,
    })
      .then(() => p.onClose())
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const submitButtonState = getSubmitButtonState();

  useEffect(
    function initValues() {
      if (isInited) return;

      if (isSwapOrderType(p.order.orderType)) {
        const ratio = (p.order as SwapOrderInfo).triggerRatio;

        if (ratio) {
          setTriggerRatioInputValue(formatAmount(ratio.ratio, USD_DECIMALS, 2));
        }
      } else {
        const positionOrder = p.order as PositionOrderInfo;

        setSizeInputValue(formatAmountFree(positionOrder.sizeDeltaUsd || 0, USD_DECIMALS));
        setTriggerPriceInputValue(formatAmount(positionOrder.triggerPrice || 0, USD_DECIMALS, indexPriceDecimals || 2));
      }

      setIsInited(true);
    },
    [fromToken, indexPriceDecimals, isInited, p.order, sizeInputValue, toToken]
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
        {!isSwapOrderType(p.order.orderType) && (
          <>
            <BuyInputSection
              topLeftLabel={isTriggerDecreaseOrderType(p.order.orderType) ? t`Close` : t`Size`}
              inputValue={sizeInputValue}
              onInputValueChange={(e) => setSizeInputValue(e.target.value)}
            >
              USD
            </BuyInputSection>

            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightLabel={t`Mark`}
              topRightValue={formatUsd(markPrice, { displayDecimals: indexPriceDecimals })}
              onClickTopRightLabel={() =>
                setTriggerPriceInputValue(formatAmount(markPrice, USD_DECIMALS, indexPriceDecimals || 2))
              }
              inputValue={triggerPirceInputValue}
              onInputValueChange={(e) => setTriggerPriceInputValue(e.target.value)}
            >
              USD
            </BuyInputSection>
          </>
        )}

        {isSwapOrderType(p.order.orderType) && (
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
                {`${triggerRatio.smallestToken.symbol} per ${triggerRatio.largestToken.symbol}`}
              </BuyInputSection>
            )}
          </>
        )}

        <div className="PositionEditor-info-box">
          {!isSwapOrderType(p.order.orderType) && (
            <>
              <ExchangeInfoRow
                label={t`Acceptable Price`}
                value={formatAcceptablePrice(acceptablePrice, { displayDecimals: indexPriceDecimals })}
              />

              {existingPosition && (
                <ExchangeInfoRow
                  label={t`Liq. Price`}
                  value={formatLiquidationPrice(existingPosition.liquidationPrice, {
                    displayDecimals: indexPriceDecimals,
                  })}
                />
              )}
            </>
          )}

          {isSwapOrderType(p.order.orderType) && (
            <>
              <ExchangeInfoRow
                label={t`Swap Price Impact`}
                value={
                  <span
                    className={cx({
                      positive: p.order.swapPathStats?.totalSwapPriceImpactDeltaUsd?.gt(0),
                    })}
                  >
                    {formatDeltaUsd(p.order.swapPathStats?.totalSwapPriceImpactDeltaUsd)}
                  </span>
                }
              />

              <ExchangeInfoRow label={t`Swap Fees`} value={formatUsd(p.order.swapPathStats?.totalSwapFeeUsd)} />

              <ExchangeInfoRow
                label={t`Min. Receive`}
                value={formatTokenAmount(
                  minOutputAmount,
                  p.order.targetCollateralToken.decimals,
                  p.order.targetCollateralToken.symbol
                )}
              />
            </>
          )}

          {executionFee?.feeTokenAmount.gt(0) && (
            <ExchangeInfoRow label={t`Max Execution Fee`}>
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
          <Button
            className="w-full"
            variant="primary-action"
            onClick={submitButtonState.onClick}
            disabled={submitButtonState.disabled}
          >
            {submitButtonState.text}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
