import { Trans, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { UserReferralInfo } from "domain/referrals";
import useUiFeeFactor from "domain/synthetics/fees/utils/useUiFeeFactor";
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
import { updateOrderTxn } from "domain/synthetics/orders/updateOrderTxn";
import {
  PositionInfo,
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getPositionKey,
  getTriggerNameByOrderType,
} from "domain/synthetics/positions";
import {
  TokensRatio,
  convertToTokenAmount,
  convertToUsd,
  getAmountByRatio,
  getTokenData,
  getTokensRatioByPrice,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import {
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  getBasisPoints,
  parseValue,
} from "lib/numbers";

import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { SubaccountNavigationButton } from "components/SubaccountNavigationButton/SubaccountNavigationButton";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";
import { getWrappedToken } from "config/tokens";
import {
  TradeMode,
  TradeType,
  applySlippageToPrice,
  getAcceptablePriceInfo,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getSwapPathOutputAddresses,
} from "domain/synthetics/trade";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { getTradeFlagsForOrder } from "domain/synthetics/trade/utils/common";
import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getKeepLeverageKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import {
  useMarketsInfoData,
  usePositionsConstants,
  usePositionsInfoData,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useNextPositionValuesForIncrease, useSwapRoutes } from "context/SyntheticsStateContext/hooks/tradeHooks";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";

import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";

import "./OrderEditor.scss";
import { useKey } from "react-use";

type Props = {
  order: OrderInfo;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function OrderEditor(p: Props) {
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const tokensData = useTokensData();
  const marketsInfoData = useMarketsInfoData();
  const positionsData = usePositionsInfoData();

  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);

  const [isInited, setIsInited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizeInputValue, setSizeInputValue] = useState("");
  const sizeDeltaUsd = parseValue(sizeInputValue || "0", USD_DECIMALS);

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const triggerPrice = parseValue(triggerPriceInputValue || "0", USD_DECIMALS)!;

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
    if (!markRatio || !isSwapOrderType(p.order.orderType)) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio?.gt(0) ? ratio : markRatio.ratio,
      largestToken: markRatio.largestToken,
      smallestToken: markRatio.smallestToken,
    } as TokensRatio;
  }, [markRatio, p.order.orderType, triggerRatioInputValue]);

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
    p.order.targetCollateralToken.address,
    p.order.isLong
  );

  const existingPosition = getByKey(positionsData, positionKey);

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData) return undefined;

    let estimatedGas: BigNumber | undefined;

    if (isSwapOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapsCount: p.order.swapPath.length,
      });
    }

    if (isIncreaseOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapsCount: p.order.swapPath.length,
      });
    }

    if (isDecreaseOrderType(p.order.orderType)) {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapsCount: p.order.swapPath.length,
      });
    }

    if (!estimatedGas) return undefined;

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, p.order.orderType, p.order.swapPath, tokensData]);

  const additionalExecutionFee = useMemo(() => {
    if (!executionFee || p.order.executionFee?.gte(executionFee.feeTokenAmount)) {
      return undefined;
    }

    const feeTokenData = getTokenData(tokensData, executionFee.feeToken.address);
    const additionalTokenAmount = executionFee.feeTokenAmount.sub(p.order.executionFee ?? 0);

    return {
      feeUsd: convertToUsd(additionalTokenAmount, executionFee.feeToken.decimals, feeTokenData?.prices.minPrice),
      feeTokenAmount: additionalTokenAmount,
      feeToken: executionFee.feeToken,
    };
  }, [executionFee, tokensData, p.order.executionFee]);

  const subaccount = useSubaccount(additionalExecutionFee?.feeTokenAmount ?? null);

  const isLimitIncreaseOrder = p.order.orderType === OrderType.LimitIncrease;

  const positionOrder = p.order as PositionOrderInfo | undefined;
  const positionIndexToken = positionOrder?.indexToken;
  const indexTokenAmount = useMemo(
    () =>
      positionIndexToken ? convertToTokenAmount(sizeDeltaUsd, positionIndexToken.decimals, triggerPrice) : undefined,
    [positionIndexToken, sizeDeltaUsd, triggerPrice]
  );
  const nextPositionValuesForIncrease = useNextPositionValuesForIncrease({
    collateralTokenAddress: positionOrder?.targetCollateralToken.address,
    fixedAcceptablePriceImpactBps: undefined,
    indexTokenAddress: positionIndexToken?.address,
    indexTokenAmount,
    initialCollateralAmount: positionOrder?.initialCollateralDeltaAmount ?? BigNumber.from(0),
    initialCollateralTokenAddress: fromToken?.address,
    leverage: existingPosition?.leverage,
    marketAddress: positionOrder?.marketAddress,
    positionKey: existingPosition?.key,
    strategy: "independent",
    tradeMode: isLimitOrderType(p.order.orderType) ? TradeMode.Limit : TradeMode.Trigger,
    tradeType: positionOrder?.isLong ? TradeType.Long : TradeType.Short,
    triggerPrice: isLimitOrderType(p.order.orderType) ? triggerPrice : undefined,
    tokenTypeForSwapRoute: existingPosition ? "collateralToken" : "indexToken",
  });

  const swapRoute = useSwapRoutes(p.order.initialCollateralTokenAddress, toTokenAddress);

  const userReferralInfo = useUserReferralInfo();
  const uiFeeFactor = useUiFeeFactor(chainId);

  const { acceptablePrice, acceptablePriceImpactBps, initialAcceptablePriceImpactBps, setAcceptablePriceImpactBps } =
    useAcceptablePrice(p.order, triggerPrice);

  const increaseAmounts = useMemo(() => {
    if (!isLimitIncreaseOrder || !toToken || !fromToken || !market || !triggerPrice?.gt(0)) {
      return undefined;
    }
    const positionOrder = p.order as PositionOrderInfo;
    const indexTokenAmount = convertToTokenAmount(sizeDeltaUsd, positionOrder.indexToken.decimals, triggerPrice);
    return getIncreasePositionAmounts({
      marketInfo: market,
      indexToken: positionOrder.indexToken,
      initialCollateralToken: fromToken,
      collateralToken: p.order.targetCollateralToken,
      isLong: p.order.isLong,
      initialCollateralAmount: p.order.initialCollateralDeltaAmount,
      indexTokenAmount,
      leverage: existingPosition?.leverage,
      triggerPrice: isLimitOrderType(p.order.orderType) ? triggerPrice : undefined,
      position: existingPosition,
      findSwapPath: swapRoute.findSwapPath,
      userReferralInfo,
      uiFeeFactor,
      strategy: "independent",
    });
  }, [
    isLimitIncreaseOrder,
    existingPosition,
    fromToken,
    market,
    sizeDeltaUsd,
    p.order,
    swapRoute,
    toToken,
    triggerPrice,
    uiFeeFactor,
    userReferralInfo,
  ]);

  const decreaseAmounts = useDecreaseAmounts({
    order: p.order,
    sizeDeltaUsd,
    existingPosition,
    triggerPrice,
    acceptablePriceImpactBps,
    userReferralInfo,
    uiFeeFactor,
  });

  const recommendedAcceptablePriceImpactBps =
    isLimitIncreaseOrder && increaseAmounts?.acceptablePrice
      ? increaseAmounts?.acceptablePriceDeltaBps.abs()
      : decreaseAmounts?.recommendedAcceptablePriceDeltaBps.abs();

  const priceImpactFeeBps =
    market &&
    getFeeItem(
      getAcceptablePriceInfo({
        indexPrice: markPrice!,
        isIncrease: isIncreaseOrderType(p.order.orderType),
        isLong: p.order.isLong,
        marketInfo: market,
        sizeDeltaUsd: sizeDeltaUsd!,
      }).priceImpactDeltaUsd,
      sizeDeltaUsd
    )?.bps;

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

    if (
      sizeDeltaUsd?.eq(positionOrder.sizeDeltaUsd) &&
      triggerPrice?.eq(positionOrder.triggerPrice!) &&
      acceptablePrice.eq(positionOrder.acceptablePrice)
    ) {
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

      if (
        sizeDeltaUsd?.eq(p.order.sizeDeltaUsd || 0) &&
        triggerPrice?.eq(positionOrder.triggerPrice || 0) &&
        acceptablePrice.eq(positionOrder.acceptablePrice)
      ) {
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

    if (isLimitIncreaseOrder) {
      if (nextPositionValuesForIncrease?.nextLeverage?.gt(MAX_ALLOWED_LEVERAGE)) {
        return t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
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

    const orderTypeName =
      p.order.orderType === OrderType.LimitIncrease ? t`Limit` : getTriggerNameByOrderType(p.order.orderType);

    return {
      text: `Update ${orderTypeName} Order`,
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!signer) return;
    const positionOrder = p.order as PositionOrderInfo;

    setIsSubmitting(true);

    const txnPromise = updateOrderTxn(chainId, signer, subaccount, {
      orderKey: p.order.key,
      sizeDeltaUsd: sizeDeltaUsd || positionOrder.sizeDeltaUsd,
      triggerPrice: triggerPrice || positionOrder.triggerPrice,
      acceptablePrice: acceptablePrice || positionOrder.acceptablePrice,
      minOutputAmount: minOutputAmount || p.order.minOutputAmount,
      executionFee: additionalExecutionFee?.feeTokenAmount,
      indexToken: indexToken,
      setPendingTxns: p.setPendingTxns,
    });

    if (subaccount) {
      p.onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise
      .then(() => p.onClose())
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const submitButtonState = getSubmitButtonState();

  useKey(
    "Enter",
    () => {
      if (!submitButtonState.disabled) {
        onSubmit();
      }
    },
    {},
    [submitButtonState.disabled]
  );

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

  const tradeFlags = useMemo(() => getTradeFlagsForOrder(p.order), [p.order]);

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={<Trans>Edit {p.order.title}</Trans>}
      >
        <SubaccountNavigationButton
          className="PositionEditor-subaccount-button"
          executionFee={executionFee?.feeTokenAmount}
          closeConfirmationBox={p.onClose}
          tradeFlags={tradeFlags}
        />
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
              inputValue={triggerPriceInputValue}
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

        <ExchangeInfo className="PositionEditor-info-box">
          <ExchangeInfo.Group>
            {isLimitIncreaseOrder && (
              <ExchangeInfoRow
                label={t`Leverage`}
                value={
                  <ValueTransition
                    from={formatLeverage(existingPosition?.leverage)}
                    to={formatLeverage(nextPositionValuesForIncrease?.nextLeverage) ?? "-"}
                  />
                }
              />
            )}
          </ExchangeInfo.Group>
          <ExchangeInfo.Group>
            {!isSwapOrderType(p.order.orderType) && (
              <>
                {p.order.orderType !== OrderType.StopLossDecrease && (
                  <>
                    <AcceptablePriceImpactInputRow
                      acceptablePriceImpactBps={acceptablePriceImpactBps}
                      initialPriceImpactFeeBps={initialAcceptablePriceImpactBps}
                      recommendedAcceptablePriceImpactBps={recommendedAcceptablePriceImpactBps}
                      setAcceptablePriceImpactBps={setAcceptablePriceImpactBps}
                      priceImpactFeeBps={priceImpactFeeBps}
                    />

                    <div className="line-divider" />
                  </>
                )}

                <ExchangeInfoRow label={t`Acceptable Price`} value={formatAcceptablePrice(acceptablePrice)} />

                {existingPosition && (
                  <ExchangeInfoRow
                    label={t`Liq. Price`}
                    value={formatLiquidationPrice(existingPosition.liquidationPrice)}
                  />
                )}
              </>
            )}
          </ExchangeInfo.Group>
          <ExchangeInfo.Group>
            {additionalExecutionFee && (
              <ExchangeInfoRow
                label={t`Fees`}
                value={
                  <TooltipWithPortal
                    position="top-end"
                    portalClassName="PositionEditor-fees-tooltip"
                    handle={formatDeltaUsd(additionalExecutionFee.feeUsd?.mul(-1))}
                    renderContent={() => (
                      <>
                        <StatsTooltipRow
                          label={<div className="text-white">{t`Execution Fee`}:</div>}
                          value={formatTokenAmountWithUsd(
                            additionalExecutionFee.feeTokenAmount.mul(-1),
                            additionalExecutionFee.feeUsd?.mul(-1),
                            additionalExecutionFee.feeToken.symbol,
                            additionalExecutionFee.feeToken.decimals,
                            {
                              displayDecimals: 5,
                            }
                          )}
                          showDollar={false}
                        />
                        <br />
                        <div className="text-white">
                          <Trans>As network fees have increased, an additional execution fee is needed.</Trans>
                        </div>
                      </>
                    )}
                  />
                }
              />
            )}

            {isSwapOrderType(p.order.orderType) && (
              <>
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
          </ExchangeInfo.Group>
        </ExchangeInfo>

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

function useAcceptablePrice(
  order: OrderInfo,
  triggerPrice: BigNumber
): {
  acceptablePrice: BigNumber;
  initialAcceptablePriceImpactBps: BigNumber;
  acceptablePriceImpactBps: BigNumber;
  setAcceptablePriceImpactBps: (bps: BigNumber) => void;
} {
  const isSwapOrder = isSwapOrderType(order.orderType);

  let initialAcceptablePriceImpactBps = BigNumber.from(0);
  if (!isSwapOrder) {
    const positionOrder = order as PositionOrderInfo;
    const initialAcceptablePrice = positionOrder.acceptablePrice;
    const initialTriggerPrice = positionOrder.triggerPrice;
    const initialPriceDelta = initialAcceptablePrice?.sub(initialTriggerPrice || 0).abs() || 0;
    initialAcceptablePriceImpactBps = getBasisPoints(initialPriceDelta, initialTriggerPrice);
  }

  const [acceptablePriceImpactBps, setAcceptablePriceImpactBps] = useState(initialAcceptablePriceImpactBps);

  useEffect(() => {
    if (initialAcceptablePriceImpactBps.eq(acceptablePriceImpactBps)) {
      return;
    }

    setAcceptablePriceImpactBps(initialAcceptablePriceImpactBps);
    // Safety: when user opens edit modal while the request is still in progress
    // we want to force set value when the request is finished
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(order as PositionOrderInfo).acceptablePrice?.toString()]);

  let acceptablePrice = BigNumber.from(0);
  if (isSwapOrder) {
    acceptablePrice = BigNumber.from(0);
  } else if (order.orderType === OrderType.StopLossDecrease) {
    // For SL orders Acceptable Price is not applicable and set to 0 or MaxUnit256
    acceptablePrice = (order as PositionOrderInfo).acceptablePrice;
  } else {
    const initialTriggerPrice = (order as PositionOrderInfo).triggerPrice;
    acceptablePrice = applySlippageToPrice(
      acceptablePriceImpactBps.toNumber(),
      triggerPrice || initialTriggerPrice,
      order.isLong,
      isIncreaseOrderType(order.orderType)
    );
  }

  return {
    acceptablePrice,
    acceptablePriceImpactBps,
    initialAcceptablePriceImpactBps,
    setAcceptablePriceImpactBps,
  };
}

function useDecreaseAmounts({
  order,
  sizeDeltaUsd,
  existingPosition,
  triggerPrice,
  acceptablePriceImpactBps,
  userReferralInfo,
  uiFeeFactor,
}: {
  order: OrderInfo;
  sizeDeltaUsd?: BigNumber;
  existingPosition?: PositionInfo;
  triggerPrice: BigNumber;
  acceptablePriceImpactBps: BigNumber;
  userReferralInfo?: UserReferralInfo;
  uiFeeFactor: BigNumber;
}) {
  const { chainId } = useChainId();
  const [keepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const marketsInfoData = useMarketsInfoData();
  const { savedAcceptablePriceImpactBuffer } = useSettings();

  const market = getByKey(marketsInfoData, order.marketAddress);

  const decreaseAmounts = useMemo(() => {
    if (!market || !sizeDeltaUsd || !minCollateralUsd || !minPositionSizeUsd) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: market,
      collateralToken: order.targetCollateralToken,
      isLong: order.isLong,
      position: existingPosition,
      closeSizeUsd: sizeDeltaUsd,
      keepLeverage: keepLeverage!,
      triggerPrice,
      fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
      acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      triggerOrderType: order.orderType as OrderType.LimitDecrease | OrderType.StopLossDecrease | undefined,
    });
  }, [
    acceptablePriceImpactBps,
    existingPosition,
    keepLeverage,
    market,
    minCollateralUsd,
    minPositionSizeUsd,
    order.isLong,
    order.orderType,
    order.targetCollateralToken,
    savedAcceptablePriceImpactBuffer,
    sizeDeltaUsd,
    triggerPrice,
    uiFeeFactor,
    userReferralInfo,
  ]);

  return decreaseAmounts;
}
