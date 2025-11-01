import { Trans, t } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useKey } from "react-use";
import { zeroAddress } from "viem";

import { BASIS_POINTS_DIVISOR, DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS, USD_DECIMALS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants, useUserReferralInfo } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  useOrderEditorIsSubmittingState,
  useOrderEditorSizeInputValueState,
  useOrderEditorTriggerPriceInputValueState,
  useOrderEditorTriggerRatioInputValueState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectOrderEditorAcceptablePrice,
  selectOrderEditorAcceptablePriceImpactBps,
  selectOrderEditorDecreaseAmounts,
  selectOrderEditorDefaultAllowedSwapSlippageBps,
  selectOrderEditorExecutionFee,
  selectOrderEditorExistingPosition,
  selectOrderEditorFindSwapPath,
  selectOrderEditorFromToken,
  selectOrderEditorIncreaseAmounts,
  selectOrderEditorInitialAcceptablePriceImpactBps,
  selectOrderEditorIsRatioInverted,
  selectOrderEditorMarkRatio,
  selectOrderEditorMaxAllowedLeverage,
  selectOrderEditorMinOutputAmount,
  selectOrderEditorNextPositionValuesForIncrease,
  selectOrderEditorNextPositionValuesWithoutPnlForIncrease,
  selectOrderEditorPositionOrderError,
  selectOrderEditorPriceImpactFeeBps,
  selectOrderEditorSelectedAllowedSwapSlippageBps,
  selectOrderEditorSetAcceptablePriceImpactBps,
  selectOrderEditorSetDefaultAllowedSwapSlippageBps,
  selectOrderEditorSetSelectedAllowedSwapSlippageBps,
  selectOrderEditorSizeDeltaUsd,
  selectOrderEditorTotalSwapImpactBps,
  selectOrderEditorTriggerPrice,
  selectOrderEditorTriggerRatio,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  EditingOrderSource,
  OrderInfo,
  PositionOrderInfo,
  SwapOrderInfo,
  isLimitIncreaseOrderType,
  isLimitSwapOrderType,
  isStopIncreaseOrderType,
  isStopLossOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getNameByOrderType,
  substractMaxLeverageSlippage,
} from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { getIncreasePositionAmounts, getNextPositionValuesForIncreaseTrade } from "domain/synthetics/trade";
import { getExpressError, getIsMaxLeverageExceeded } from "domain/synthetics/trade/utils/validation";
import { TokensRatioAndSlippage } from "domain/tokens";
import { numericBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatBalanceAmount,
  formatDeltaUsd,
  formatTokenAmountWithUsd,
  formatUsd,
  formatUsdPrice,
  parseValue,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { sendEditOrderEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";
import { BatchOrderTxnParams, buildUpdateOrderPayload } from "sdk/utils/orderTransactions";

import { AcceptablePriceImpactInputRow } from "components/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AllowedSwapSlippageInputRow } from "../AllowedSwapSlippageInputRowImpl/AllowedSwapSlippageInputRowImpl";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { ExpressTradingWarningCard } from "../TradeBox/ExpressTradingWarningCard";

import "./OrderEditor.scss";

type Props = {
  order: OrderInfo;
  source: EditingOrderSource;
  onClose: () => void;
};

export function OrderEditor(p: Props) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const tokensData = useSelector(selectTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const [isSubmitting, setIsSubmitting] = useOrderEditorIsSubmittingState();

  const [sizeInputValue, setSizeInputValue] = useOrderEditorSizeInputValueState();
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useOrderEditorTriggerPriceInputValueState();
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useOrderEditorTriggerRatioInputValueState();
  const [isInited, setIsInited] = useState(false);

  const calcSelector = useCalcSelector();

  const sizeDeltaUsd = useSelector(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = useSelector(selectOrderEditorTriggerPrice);
  const fromToken = useSelector(selectOrderEditorFromToken);
  const markRatio = useSelector(selectOrderEditorMarkRatio);
  const isRatioInverted = useSelector(selectOrderEditorIsRatioInverted);
  const triggerRatio = useSelector(selectOrderEditorTriggerRatio);
  const minOutputAmount = useSelector(selectOrderEditorMinOutputAmount);

  const market = useMarketInfo(p.order.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const markPrice = p.order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;
  const existingPosition = useSelector(selectOrderEditorExistingPosition);

  const executionFee = useSelector(selectOrderEditorExecutionFee);

  const additionalExecutionFee = useMemo(() => {
    if (!executionFee || p.order.executionFee >= executionFee.feeTokenAmount) {
      return undefined;
    }

    const feeTokenData = getTokenData(tokensData, executionFee.feeToken.address);
    const additionalTokenAmount = executionFee.feeTokenAmount - p.order.executionFee;

    return {
      feeUsd: convertToUsd(additionalTokenAmount, executionFee.feeToken.decimals, feeTokenData?.prices.minPrice),
      feeTokenAmount: additionalTokenAmount,
      feeToken: executionFee.feeToken,
    };
  }, [executionFee, tokensData, p.order.executionFee]);

  const positionOrder = p.order as PositionOrderInfo | undefined;
  const positionIndexToken = positionOrder?.indexToken;
  const indexTokenAmount = useMemo(
    () =>
      positionIndexToken ? convertToTokenAmount(sizeDeltaUsd, positionIndexToken.decimals, triggerPrice) : undefined,
    [positionIndexToken, sizeDeltaUsd, triggerPrice]
  );
  const nextPositionValuesForIncrease = useSelector(selectOrderEditorNextPositionValuesForIncrease);
  const nextPositionValuesWithoutPnlForIncrease = useSelector(selectOrderEditorNextPositionValuesWithoutPnlForIncrease);

  const findSwapPath = useSelector(selectOrderEditorFindSwapPath);

  const userReferralInfo = useUserReferralInfo();
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);

  const acceptablePrice = useSelector(selectOrderEditorAcceptablePrice);
  const acceptablePriceImpactBps = useSelector(selectOrderEditorAcceptablePriceImpactBps);
  const initialAcceptablePriceImpactBps = useSelector(selectOrderEditorInitialAcceptablePriceImpactBps);
  const setAcceptablePriceImpactBps = useSelector(selectOrderEditorSetAcceptablePriceImpactBps);
  const increaseAmounts = useSelector(selectOrderEditorIncreaseAmounts);
  const maxAllowedLeverage = useSelector(selectOrderEditorMaxAllowedLeverage);

  const defaultAllowedSwapSlippageBps = useSelector(selectOrderEditorDefaultAllowedSwapSlippageBps);
  const setDefaultAllowedSwapSlippageBps = useSelector(selectOrderEditorSetDefaultAllowedSwapSlippageBps);
  const selectedAllowedSwapSlippageBps = useSelector(selectOrderEditorSelectedAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectOrderEditorSetSelectedAllowedSwapSlippageBps);
  const swapImpactBps = useSelector(selectOrderEditorTotalSwapImpactBps);

  const decreaseAmounts = useSelector(selectOrderEditorDecreaseAmounts);
  const { minCollateralUsd } = usePositionsConstants();

  const recommendedAcceptablePriceImpactBps =
    isLimitIncreaseOrderType(p.order.orderType) && increaseAmounts?.acceptablePrice !== undefined
      ? increaseAmounts.recommendedAcceptablePriceDeltaBps
      : decreaseAmounts?.recommendedAcceptablePriceDeltaBps !== undefined
        ? bigMath.abs(decreaseAmounts?.recommendedAcceptablePriceDeltaBps)
        : undefined;

  const priceImpactFeeBps = useSelector(selectOrderEditorPriceImpactFeeBps);

  function getIsMaxLeverageError() {
    if (isLimitIncreaseOrderType(p.order.orderType) && sizeDeltaUsd !== undefined) {
      if (nextPositionValuesWithoutPnlForIncrease?.nextLeverage === undefined) {
        return false;
      }

      const positionOrder = p.order as PositionOrderInfo;
      return getIsMaxLeverageExceeded(
        nextPositionValuesWithoutPnlForIncrease?.nextLeverage,
        positionOrder.marketInfo,
        positionOrder.isLong,
        sizeDeltaUsd
      );
    }
    return false;
  }

  const { savedAcceptablePriceImpactBuffer, isSetAcceptablePriceImpactEnabled } = useSettings();

  function detectAndSetAvailableMaxLeverage() {
    const positionOrder = p.order as PositionOrderInfo;
    const marketInfo = positionOrder.marketInfo;
    const collateralToken = positionOrder.targetCollateralToken;

    if (!positionIndexToken || !fromToken || minCollateralUsd === undefined) return;

    const { returnValue: newSizeDeltaUsd } = numericBinarySearch<bigint | undefined>(
      1,
      // "10 *" means we do 1..50 search but with 0.1x step
      (10 * maxAllowedLeverage) / BASIS_POINTS_DIVISOR,
      (lev) => {
        const leverage = BigInt((lev / 10) * BASIS_POINTS_DIVISOR);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath,
          indexToken: positionIndexToken,
          indexTokenAmount,
          initialCollateralAmount: positionOrder.initialCollateralDeltaAmount,
          initialCollateralToken: fromToken,
          isLong: positionOrder.isLong,
          marketInfo: positionOrder.marketInfo,
          position: existingPosition,
          strategy: "leverageByCollateral",
          uiFeeFactor,
          userReferralInfo,
          acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
          fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
          externalSwapQuote: undefined,
          leverage,
          triggerPrice,
          marketsInfoData,
          chainId,
          externalSwapQuoteParams: undefined,
          isSetAcceptablePriceImpactEnabled,
        });

        const nextPositionValues = getNextPositionValuesForIncreaseTrade({
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralToken,
          existingPosition,
          indexPrice: increaseAmounts.indexPrice,
          isLong: positionOrder.isLong,
          marketInfo,
          minCollateralUsd,
          showPnlInLeverage: false,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
          userReferralInfo,
        });

        if (nextPositionValues.nextLeverage !== undefined) {
          const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
            nextPositionValues.nextLeverage,
            marketInfo,
            positionOrder.isLong,
            increaseAmounts.sizeDeltaUsd
          );

          return {
            isValid: !isMaxLeverageExceeded,
            returnValue: increaseAmounts.sizeDeltaUsd,
          };
        }

        return {
          isValid: false,
          returnValue: increaseAmounts.sizeDeltaUsd,
        };
      }
    );

    if (newSizeDeltaUsd !== undefined) {
      setSizeInputValue(formatAmountFree(substractMaxLeverageSlippage(newSizeDeltaUsd), USD_DECIMALS, 2));
    } else {
      helperToast.error(t`No available leverage found`);
    }
  }

  const batchParams: BatchOrderTxnParams | undefined = useMemo(() => {
    if (!signer || !tokensData || !marketsInfoData) {
      return undefined;
    }

    const positionOrder = p.order as PositionOrderInfo;

    const orderTriggerPrice = isSwapOrderType(p.order.orderType)
      ? triggerRatio?.ratio ?? triggerPrice ?? positionOrder.triggerPrice
      : triggerPrice ?? positionOrder.triggerPrice;

    const updateOrderParams = buildUpdateOrderPayload({
      chainId,
      indexTokenAddress: isSwapOrderType(p.order.orderType) ? zeroAddress : positionOrder.indexToken.address,
      orderKey: p.order.key,
      orderType: p.order.orderType,
      sizeDeltaUsd: sizeDeltaUsd ?? positionOrder.sizeDeltaUsd,
      triggerPrice: orderTriggerPrice,
      acceptablePrice: acceptablePrice ?? positionOrder.acceptablePrice,
      minOutputAmount: minOutputAmount ?? positionOrder.minOutputAmount,
      autoCancel: positionOrder.autoCancel,
      validFromTime: 0n,
      executionFeeTopUp: additionalExecutionFee?.feeTokenAmount ?? 0n,
    });

    return {
      createOrderParams: [],
      updateOrderParams: [updateOrderParams],
      cancelOrderParams: [],
    };
  }, [
    signer,
    tokensData,
    marketsInfoData,
    p.order,
    triggerRatio?.ratio,
    triggerPrice,
    chainId,
    sizeDeltaUsd,
    acceptablePrice,
    minOutputAmount,
    additionalExecutionFee?.feeTokenAmount,
  ]);

  const { expressParams, expressParamsPromise } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "Order Editor",
    isGmxAccount: srcChainId !== undefined,
  });

  const networkFee = useMemo(() => {
    if (!additionalExecutionFee) {
      return undefined;
    }

    let feeToken = additionalExecutionFee?.feeToken;
    let feeTokenAmount = additionalExecutionFee?.feeTokenAmount;
    let feeUsd = additionalExecutionFee?.feeUsd;

    const gasPaymentToken = getByKey(tokensData, expressParams?.gasPaymentParams.gasPaymentTokenAddress);

    if (gasPaymentToken && expressParams?.gasPaymentParams.gasPaymentTokenAmount !== undefined) {
      feeToken = gasPaymentToken;
      feeTokenAmount = expressParams?.gasPaymentParams.gasPaymentTokenAmount;
      feeUsd = convertToUsd(feeTokenAmount, feeToken.decimals, gasPaymentToken.prices.minPrice);
    }

    return {
      feeToken,
      feeTokenAmount,
      feeUsd,
    };
  }, [additionalExecutionFee, expressParams, tokensData]);

  function getError() {
    if (isSubmitting) {
      return t`Updating order...`;
    }

    if (isSwapOrderType(p.order.orderType)) {
      if (triggerRatio?.ratio === undefined || triggerRatio?.ratio < 0 || minOutputAmount <= 0) {
        return t`Enter a ratio`;
      }

      if (minOutputAmount === p.order.minOutputAmount) {
        return t`Enter a new ratio or allowed slippage`;
      }

      if (triggerRatio && !isRatioInverted && markRatio && markRatio.ratio < triggerRatio.ratio) {
        return t`Limit price above mark price`;
      }

      if (triggerRatio && isRatioInverted && markRatio && markRatio.ratio > triggerRatio.ratio) {
        return t`Limit price below mark price`;
      }

      const expressError = getExpressError({
        chainId,
        expressParams,
        tokensData,
      });

      if (expressError[0]) {
        return expressError[0];
      }

      return;
    }

    return calcSelector(selectOrderEditorPositionOrderError);
  }

  function getSubmitButtonState(): { text: ReactNode; disabled?: boolean; tooltip?: ReactNode; onClick?: () => void } {
    const error = getError();
    const isMaxLeverageError = getIsMaxLeverageError();

    if (isMaxLeverageError) {
      return {
        text: t`Max. Leverage Exceeded`,
        tooltip: (
          <>
            <Trans>Decrease the size to match the max. allowed leverage:</Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
            <br />
            <br />
            <span onClick={detectAndSetAvailableMaxLeverage} className="Tradebox-handle">
              <Trans>Set Max Leverage</Trans>
            </span>
          </>
        ),
        disabled: true,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    const orderTypeName = getNameByOrderType(p.order.orderType, p.order.isTwap);

    return {
      text: `Update ${orderTypeName} Order`,
      disabled: false,
      onClick: onSubmit,
    };
  }

  async function onSubmit() {
    if (!batchParams || !signer || !tokensData || !marketsInfoData || !provider) {
      return;
    }

    setIsSubmitting(true);

    const fulfilledExpressParams = await expressParamsPromise;

    const txnPromise = sendBatchOrderTxn({
      chainId,
      signer,
      batchParams,
      expressParams:
        fulfilledExpressParams && getIsValidExpressParams(fulfilledExpressParams) ? fulfilledExpressParams : undefined,
      simulationParams: undefined,
      callback: makeOrderTxnCallback({}),
      provider,
      isGmxAccount: srcChainId !== undefined,
    });

    if (expressParams?.subaccount) {
      p.onClose();
      setIsSubmitting(false);
      if (market) {
        sendEditOrderEvent({ order: p.order, source: p.source, marketInfo: market });
      }
      return;
    }

    txnPromise
      .then(() => {
        p.onClose();
        if (market) {
          sendEditOrderEvent({ order: p.order, source: p.source, marketInfo: market });
        }
      })
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
        const ratio = (p.order as SwapOrderInfo).triggerRatio as TokensRatioAndSlippage;

        if (ratio) {
          setTriggerRatioInputValue(formatAmount(ratio.ratio, USD_DECIMALS, 2));
        }

        if (isLimitSwapOrderType(p.order.orderType)) {
          const totalSwapImpactBps = swapImpactBps >= 0n ? 0n : bigMath.abs(swapImpactBps);
          const defaultSwapImpactBuffer = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS + totalSwapImpactBps;

          setDefaultAllowedSwapSlippageBps(bigMath.abs(defaultSwapImpactBuffer));
          setSelectedAllowedSwapSlippageBps(ratio?.allowedSwapSlippageBps, false);
        }
      } else {
        const positionOrder = p.order as PositionOrderInfo;

        setSizeInputValue(formatAmountFree(positionOrder.sizeDeltaUsd ?? 0n, USD_DECIMALS));
        const price = positionOrder.triggerPrice ?? 0n;
        const decimals = calculateDisplayDecimals(price, USD_DECIMALS, indexToken?.visualMultiplier);

        if (triggerPriceInputValue === "") {
          setTriggerPriceInputValue(
            formatAmount(price, USD_DECIMALS, decimals, undefined, undefined, indexToken?.visualMultiplier)
          );
        }
      }

      setIsInited(true);
    },
    [
      indexToken?.visualMultiplier,
      isInited,
      p.order,
      setDefaultAllowedSwapSlippageBps,
      setSelectedAllowedSwapSlippageBps,
      setSizeInputValue,
      setTriggerPriceInputValue,
      setTriggerRatioInputValue,
      swapImpactBps,
      triggerPriceInputValue,
    ]
  );

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={submitButtonState.onClick}
      disabled={submitButtonState.disabled}
    >
      {submitButtonState.text}
    </Button>
  );

  const button = submitButtonState.tooltip ? (
    <TooltipWithPortal
      position="top"
      handleClassName="w-full"
      tooltipClassName="PositionEditor-tooltip"
      handle={buttonContent}
      isHandlerDisabled
      renderContent={() => submitButtonState.tooltip}
    />
  ) : (
    buttonContent
  );

  const priceLabel = isTriggerDecreaseOrderType(p.order.orderType)
    ? t`Trigger Price`
    : isStopIncreaseOrderType(p.order.orderType)
      ? t`Stop Price`
      : t`Limit Price`;

  const positionSize = existingPosition?.sizeInUsd;

  const sizeUsd = parseValue(sizeInputValue || "0", USD_DECIMALS)!;

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={<Trans>Edit {p.order.title}</Trans>}
      >
        <div className="mb-14 flex flex-col gap-2">
          {!isSwapOrderType(p.order.orderType) && (
            <>
              <BuyInputSection
                topLeftLabel={isTriggerDecreaseOrderType(p.order.orderType) ? t`Close` : t`Size`}
                inputValue={sizeInputValue}
                onInputValueChange={(e) => setSizeInputValue(e.target.value)}
                bottomLeftValue={isTriggerDecreaseOrderType(p.order.orderType) ? formatUsd(sizeUsd) : undefined}
                bottomRightLabel={
                  isTriggerDecreaseOrderType(p.order.orderType) && positionSize !== undefined ? t`Max` : undefined
                }
                bottomRightValue={
                  isTriggerDecreaseOrderType(p.order.orderType) ? formatUsdPrice(positionSize) : undefined
                }
                onClickMax={
                  isTriggerDecreaseOrderType(p.order.orderType) &&
                  positionSize !== undefined &&
                  positionSize > 0 &&
                  sizeUsd !== positionSize
                    ? () => setSizeInputValue(formatAmountFree(positionSize, USD_DECIMALS))
                    : undefined
                }
              >
                USD
              </BuyInputSection>

              <BuyInputSection
                topLeftLabel={priceLabel}
                topRightLabel={t`Mark`}
                topRightValue={formatUsdPrice(markPrice, {
                  visualMultiplier: indexToken?.visualMultiplier,
                })}
                onClickTopRightLabel={() =>
                  setTriggerPriceInputValue(
                    formatAmount(
                      markPrice,
                      USD_DECIMALS,
                      calculateDisplayDecimals(markPrice, USD_DECIMALS, indexToken?.visualMultiplier),
                      undefined,
                      undefined,
                      indexToken?.visualMultiplier
                    )
                  )
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
                  topLeftLabel={t`Limit Price`}
                  topRightLabel={t`Mark`}
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
        </div>

        <div className="flex flex-col gap-14">
          {button}

          <ExpressTradingWarningCard
            expressParams={expressParams}
            payTokenAddress={undefined}
            isWrapOrUnwrap={false}
            isGmxAccount={srcChainId !== undefined}
          />

          {(isLimitIncreaseOrderType(p.order.orderType) || isStopIncreaseOrderType(p.order.orderType)) && (
            <SyntheticsInfoRow
              label={t`Leverage`}
              value={
                <ValueTransition
                  from={formatLeverage(existingPosition?.leverage)}
                  to={formatLeverage(nextPositionValuesForIncrease?.nextLeverage) ?? "-"}
                />
              }
            />
          )}

          {!isSwapOrderType(p.order.orderType) &&
            !isStopLossOrderType(p.order.orderType) &&
            !isStopIncreaseOrderType(p.order.orderType) &&
            isSetAcceptablePriceImpactEnabled && (
              <AcceptablePriceImpactInputRow
                acceptablePriceImpactBps={acceptablePriceImpactBps}
                initialPriceImpactFeeBps={initialAcceptablePriceImpactBps}
                recommendedAcceptablePriceImpactBps={recommendedAcceptablePriceImpactBps}
                setAcceptablePriceImpactBps={setAcceptablePriceImpactBps}
                priceImpactFeeBps={priceImpactFeeBps}
              />
            )}
          {!isSwapOrderType(p.order.orderType) && (
            <>
              {isSetAcceptablePriceImpactEnabled && (
                <SyntheticsInfoRow
                  label={t`Acceptable Price`}
                  value={formatAcceptablePrice(acceptablePrice, {
                    visualMultiplier: indexToken?.visualMultiplier,
                  })}
                />
              )}

              {existingPosition && (
                <SyntheticsInfoRow
                  label={t`Liq. Price`}
                  value={formatLiquidationPrice(existingPosition.liquidationPrice, {
                    visualMultiplier: indexToken?.visualMultiplier,
                  })}
                />
              )}
            </>
          )}

          {networkFee && (
            <SyntheticsInfoRow
              label={t`Fees`}
              value={
                <TooltipWithPortal
                  position="top-end"
                  tooltipClassName="PositionEditor-fees-tooltip"
                  handle={formatDeltaUsd(networkFee.feeUsd === undefined ? undefined : networkFee.feeUsd * -1n)}
                  renderContent={() => (
                    <>
                      <StatsTooltipRow
                        label={<div className="text-typography-primary">{t`Network Fee`}:</div>}
                        value={formatTokenAmountWithUsd(
                          networkFee.feeTokenAmount * -1n,
                          networkFee.feeUsd === undefined ? undefined : networkFee.feeUsd * -1n,
                          networkFee.feeToken.symbol,
                          networkFee.feeToken.decimals,
                          {
                            displayDecimals: 5,
                            isStable: networkFee.feeToken.isStable,
                          }
                        )}
                        showDollar={false}
                      />
                      <br />
                      <div className="text-typography-primary">
                        <Trans>As network fees have increased, an additional network fee is needed.</Trans>
                      </div>
                    </>
                  )}
                />
              }
            />
          )}

          {isSwapOrderType(p.order.orderType) && (
            <>
              <AllowedSwapSlippageInputRow
                notAvailable={false}
                totalSwapImpactBps={swapImpactBps}
                allowedSwapSlippageBps={selectedAllowedSwapSlippageBps}
                recommendedAllowedSwapSlippageBps={defaultAllowedSwapSlippageBps}
                setAllowedSwapSlippageBps={setSelectedAllowedSwapSlippageBps}
              />
              <div className="h-1 bg-slate-600" />
              <SyntheticsInfoRow
                label={t`Min. Receive`}
                value={formatBalanceAmount(
                  minOutputAmount,
                  p.order.targetCollateralToken.decimals,
                  p.order.targetCollateralToken.symbol,
                  { isStable: p.order.targetCollateralToken.isStable }
                )}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
