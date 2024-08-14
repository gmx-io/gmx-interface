import { Trans, msg, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useKey, useLatest } from "react-use";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { convertTokenAddress } from "config/tokens";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  useClosingPositionKeyState,
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionSeller } from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import { useHasOutdatedUi } from "domain/legacy";
import { DecreasePositionSwapType, OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import { formatLiquidationPrice, getTriggerNameByOrderType } from "domain/synthetics/positions";
import { applySlippageToPrice } from "domain/synthetics/trade";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getCommonError, getDecreaseError } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, formatTokenAmountWithUsd, formatUsd, parseValue } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useDebouncedInputValue } from "lib/useDebouncedInputValue";
import useWallet from "lib/wallets/useWallet";
import { HighPriceImpactWarning } from "../HighPriceImpactWarning/HighPriceImpactWarning";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerExecutionPrice,
  selectPositionSellerFees,
  selectPositionSellerMarkPrice,
  selectPositionSellerMaxLiquidityPath,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
  selectPositionSellerReceiveToken,
  selectPositionSellerSetDefaultReceiveToken,
  selectPositionSellerShouldSwap,
  selectPositionSellerSwapAmounts,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Token } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useLocalizedMap } from "lib/i18n";
import { ExecutionPriceRow } from "../ExecutionPriceRow";
import { PositionSellerAdvancedRows } from "./PositionSellerAdvancedDisplayRows";

import { useMetrics } from "context/MetricsContext/MetricsContext";
import {
  getPositionOrderMetricId,
  getTxnErrorMetricsHandler,
  getTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "context/MetricsContext/utils";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { helperToast } from "lib/helperToast";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionSeller.scss";
import { DecreaseOrderMetricData } from "context/MetricsContext/types";

export type Props = {
  setPendingTxns: (txns: any) => void;
};

const ORDER_OPTION_LABELS = {
  [OrderOption.Market]: msg`Market`,
  [OrderOption.Trigger]: msg`TP/SL`,
};

export function PositionSeller(p: Props) {
  const { setPendingTxns } = p;
  const [, setClosingPositionKey] = useClosingPositionKeyState();

  const onClose = useCallback(() => {
    setClosingPositionKey(undefined);
  }, [setClosingPositionKey]);
  const availableTokensOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const tokensData = useTokensData();
  const metrics = useMetrics();
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const position = useSelector(selectPositionSellerPosition);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const { shouldDisableValidationForTesting } = useSettings();
  const localizedOrderOptionLabels = useLocalizedMap(ORDER_OPTION_LABELS);

  const isVisible = Boolean(position);

  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const setDefaultReceiveToken = useSelector(selectPositionSellerSetDefaultReceiveToken);
  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position?.marketInfo.indexTokenAddress));

  const {
    allowedSlippage,
    closeUsdInputValue: closeUsdInputValueRaw,
    defaultTriggerAcceptablePriceImpactBps,
    isSubmitting,
    orderOption,
    handleSetOrderOption,
    receiveTokenAddress,
    setCloseUsdInputValue: setCloseUsdInputValueRaw,
    setDefaultTriggerAcceptablePriceImpactBps,
    setIsSubmitting,
    setReceiveTokenAddress,
    setSelectedTriggerAcceptablePriceImpactBps,
    setTriggerPriceInputValue: setTriggerPriceInputValueRaw,
    triggerPriceInputValue: triggerPriceInputValueRaw,
    resetPositionSeller,
    setIsReceiveTokenChanged,
  } = usePositionSeller();

  const [closeUsdInputValue, setCloseUsdInputValue] = useDebouncedInputValue(
    closeUsdInputValueRaw,
    setCloseUsdInputValueRaw
  );
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useDebouncedInputValue(
    triggerPriceInputValueRaw,
    setTriggerPriceInputValueRaw
  );
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const isTrigger = orderOption === OrderOption.Trigger;

  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;
  const maxCloseSize = position?.sizeInUsd || 0n;

  const setReceiveTokenManually = useCallback(
    (token: Token) => {
      setIsReceiveTokenChanged(true);
      setReceiveTokenAddress(token.address);
    },
    [setReceiveTokenAddress, setIsReceiveTokenChanged]
  );

  const receiveToken = useSelector(selectPositionSellerReceiveToken);

  useEffect(() => {
    if (!isVisible) {
      // timeout to not disturb animation
      setTimeout(() => {
        resetPositionSeller();
      }, 200);
    }
  }, [isVisible, resetPositionSeller]);

  const markPrice = useSelector(selectPositionSellerMarkPrice);
  const { maxLiquidity: maxSwapLiquidity } = useSelector(selectPositionSellerMaxLiquidityPath);
  const decreaseAmounts = useSelector(selectPositionSellerDecreaseAmounts);

  useDebugExecutionPrice(chainId, {
    skip: true,
    marketInfo: position?.marketInfo,
    sizeInUsd: position?.sizeInUsd,
    sizeInTokens: position?.sizeInTokens,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd ? decreaseAmounts.sizeDeltaUsd * -1n : undefined,
    isLong: position?.isLong,
  });

  const shouldSwap = useSelector(selectPositionSellerShouldSwap);
  const swapAmounts = useSelector(selectPositionSellerSwapAmounts);

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount = swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const nextPositionValues = useSelector(selectPositionSellerNextPositionValuesForDecrease);

  const { fees, executionFee } = useSelector(selectPositionSellerFees);
  const executionPrice = useSelector(selectPositionSellerExecutionPrice);

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const priceImpactWarningState = usePriceImpactWarningState({
    positionPriceImpact: fees?.positionCollateralPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    place: "positionSeller",
    tradeFlags,
  });

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity < (receiveUsd ?? 0n) : false;
  const setIsHighPositionImpactAcceptedLatestRef = useLatest(priceImpactWarningState.setIsHighPositionImpactAccepted);
  const setIsHighSwapImpactAcceptedLatestRef = useLatest(priceImpactWarningState.setIsHighSwapImpactAccepted);

  useEffect(() => {
    if (isVisible) {
      setIsHighPositionImpactAcceptedLatestRef.current(false);
      setIsHighSwapImpactAcceptedLatestRef.current(false);
    }
  }, [setIsHighPositionImpactAcceptedLatestRef, setIsHighSwapImpactAcceptedLatestRef, isVisible, orderOption]);

  const error = useMemo(() => {
    if (!position) {
      return undefined;
    }

    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const decreaseError = getDecreaseError({
      marketInfo: position.marketInfo,
      inputSizeUsd: closeSizeUsd,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      receiveToken,
      isTrigger,
      triggerPrice,
      fixedTriggerThresholdType: undefined,
      existingPosition: position,
      markPrice,
      nextPositionValues,
      isLong: position.isLong,
      isContractAccount: false,
      minCollateralUsd,
      priceImpactWarning: priceImpactWarningState,
      isNotEnoughReceiveTokenLiquidity,
    });

    if (commonError[0] || decreaseError[0]) {
      return commonError[0] || decreaseError[0];
    }

    if (isHighFeeConsentError) {
      return [t`High Network Fee not yet acknowledged`];
    }

    if (isSubmitting) {
      return t`Creating Order...`;
    }
  }, [
    account,
    chainId,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    hasOutdatedUi,
    isHighFeeConsentError,
    isNotEnoughReceiveTokenLiquidity,
    isSubmitting,
    isTrigger,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    priceImpactWarningState,
    receiveToken,
    triggerPrice,
  ]);

  const subaccount = useSubaccount(executionFee?.feeTokenAmount ?? null);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    const orderType = isTrigger ? decreaseAmounts?.triggerOrderType : OrderType.MarketDecrease;

    let metricType;
    if (orderType === OrderType.LimitDecrease) {
      metricType = "takeProfitOrder";
    } else if (orderType === OrderType.StopLossDecrease) {
      metricType = "stopLossOrder";
    } else {
      metricType = "decreasePosition";
    }

    const metricData: DecreaseOrderMetricData = {
      metricType,
      hasExistingPosition: true,
      isFullClose: decreaseAmounts?.isFullClose,
      place: "positionSeller",
      account,
      marketAddress: position?.marketInfo?.marketTokenAddress,
      initialCollateralTokenAddress: position?.collateralToken?.address,
      initialCollateralDeltaAmount: decreaseAmounts?.collateralDeltaAmount,
      swapPath: [],
      triggerPrice: decreaseAmounts?.triggerPrice,
      acceptablePrice: decreaseAmounts?.acceptablePrice,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts?.sizeDeltaInTokens,
      orderType,
      isLong: position?.isLong,
      executionFee: executionFee?.feeTokenAmount,
      referralCodeForTxn: userReferralInfo?.referralCodeForTxn,
    };

    const metricId = getPositionOrderMetricId(metricData);
    metrics.setCachedMetricData(metricId, metricData);

    sendOrderSubmittedMetric(metrics, metricId, metricType);

    if (
      !tokensData ||
      !position ||
      executionFee?.feeTokenAmount == undefined ||
      !receiveToken?.address ||
      receiveUsd === undefined ||
      decreaseAmounts?.acceptablePrice === undefined ||
      !signer ||
      !orderType
    ) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metrics, metricId, metricType);
      return;
    }

    setIsSubmitting(true);

    // TODO findSwapPath considering decreasePositionSwapType?
    const swapPath =
      decreaseAmounts.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken
        ? []
        : swapAmounts?.swapPathStats?.swapPath || [];

    const txnPromise = createDecreaseOrderTxn(
      chainId,
      signer,
      subaccount,
      {
        account,
        marketAddress: position.marketAddress,
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount ?? 0n,
        receiveTokenAddress: receiveToken.address,
        swapPath,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        isLong: position.isLong,
        acceptablePrice: decreaseAmounts.acceptablePrice,
        triggerPrice: isTrigger ? triggerPrice : undefined,
        minOutputUsd: 0n,
        decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
        orderType,
        referralCode: userReferralInfo?.referralCodeForTxn,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: orderOption === OrderOption.Trigger || shouldDisableValidationForTesting,
      },
      {
        setPendingOrder,
        setPendingTxns,
        setPendingPosition,
      },
      metricId
    )
      .then(getTxnSentMetricsHandler(metrics, metricId, metricType))
      .catch(getTxnErrorMetricsHandler(metrics, metricId, metricType));

    if (subaccount) {
      onClose();
      setIsSubmitting(false);
      setDefaultReceiveToken(receiveToken.address);
      return;
    }

    txnPromise.then(onClose).finally(() => {
      setIsSubmitting(false);
      setDefaultReceiveToken(receiveToken.address);
    });
  }

  useKey(
    "Enter",
    () => {
      if (isVisible && !error) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onSubmit();
      }
    },
    {},
    [isVisible, error]
  );

  useEffect(
    function initReceiveToken() {
      if (!receiveTokenAddress && position?.collateralToken?.address) {
        const convertedAddress = convertTokenAddress(chainId, position?.collateralToken.address, "native");
        setReceiveTokenAddress(convertedAddress);
      }
    },
    [chainId, position?.collateralToken, receiveTokenAddress, setReceiveTokenAddress]
  );

  useEffect(() => {
    if (isTrigger && decreaseAmounts) {
      if (
        defaultTriggerAcceptablePriceImpactBps === undefined ||
        defaultTriggerAcceptablePriceImpactBps !== bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps)
      ) {
        setDefaultTriggerAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
        setSelectedTriggerAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
      }
    }
  }, [
    decreaseAmounts,
    defaultTriggerAcceptablePriceImpactBps,
    isTrigger,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedTriggerAcceptablePriceImpactBps,
  ]);

  const toToken = position?.indexToken;

  const executionPriceFlags = useMemo(
    () => ({
      isLimit: false,
      isMarket: orderOption === OrderOption.Market,
      isIncrease: false,
      isLong: !!position?.isLong,
      isShort: !position?.isLong,
      isSwap: false,
      isPosition: true,
      isTrigger: orderOption === OrderOption.Trigger,
    }),
    [position?.isLong, orderOption]
  );

  const shouldApplySlippage = orderOption === OrderOption.Market;
  const acceptablePrice =
    shouldApplySlippage && decreaseAmounts?.acceptablePrice && position
      ? applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, false, position.isLong)
      : decreaseAmounts?.acceptablePrice;

  const limitPriceRow = (
    <ExecutionPriceRow
      tradeFlags={executionPriceFlags}
      fees={fees}
      displayDecimals={marketDecimals ?? toToken?.priceDecimals}
      executionPrice={executionPrice ?? undefined}
      acceptablePrice={acceptablePrice}
      triggerOrderType={decreaseAmounts?.triggerOrderType}
    />
  );

  const triggerPriceRow = (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Trigger Price`}
      value={`${decreaseAmounts?.triggerThresholdType || ""} ${
        formatUsd(decreaseAmounts?.triggerPrice, {
          displayDecimals: marketDecimals ?? toToken?.priceDecimals,
        }) || "-"
      }`}
    />
  );

  const liqPriceRow = position && (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Liq. Price`}
      value={
        <ValueTransition
          from={
            formatLiquidationPrice(position.liquidationPrice, {
              displayDecimals: marketDecimals,
            })!
          }
          to={
            decreaseAmounts?.isFullClose
              ? "-"
              : decreaseAmounts?.sizeDeltaUsd
                ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: marketDecimals,
                  })
                : undefined
          }
        />
      }
    />
  );

  const receiveTokenRow = isTrigger ? (
    <ExchangeInfoRow
      className="SwapBox-info-row"
      label={t`Receive`}
      value={formatTokenAmountWithUsd(
        decreaseAmounts?.receiveTokenAmount,
        decreaseAmounts?.receiveUsd,
        position?.collateralToken?.symbol,
        position?.collateralToken?.decimals
      )}
    />
  ) : (
    <ExchangeInfoRow
      label={t`Receive`}
      className="Exchange-info-row PositionSeller-receive-row "
      value={
        receiveToken && (
          <TokenSelector
            label={t`Receive`}
            className={cx("PositionSeller-token-selector", {
              warning: isNotEnoughReceiveTokenLiquidity,
            })}
            chainId={chainId}
            showBalances={false}
            infoTokens={availableTokensOptions?.infoTokens}
            tokenAddress={receiveToken.address}
            onSelectToken={setReceiveTokenManually}
            tokens={availableTokensOptions?.swapTokens || EMPTY_ARRAY}
            showTokenImgInDropdown={true}
            selectedTokenLabel={
              <span className="PositionSelector-selected-receive-token">
                {formatTokenAmountWithUsd(
                  receiveTokenAmount,
                  receiveUsd,
                  receiveToken?.symbol,
                  receiveToken?.decimals,
                  {
                    fallbackToZero: true,
                  }
                )}
              </span>
            }
            extendedSortSequence={availableTokensOptions?.sortedLongAndShortTokens}
          />
        )
      }
    />
  );

  return (
    <div className="PositionEditor PositionSeller">
      <Modal
        className="PositionSeller-modal"
        isVisible={isVisible}
        setIsVisible={onClose}
        label={
          <Trans>
            Close {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
          </Trans>
        }
        qa="position-close-modal"
      >
        <Tab
          options={Object.values(OrderOption)}
          option={orderOption}
          optionLabels={localizedOrderOptionLabels}
          onChange={handleSetOrderOption}
          qa="operation-tabs"
        />

        {position && (
          <>
            <div className="relative">
              <BuyInputSection
                topLeftLabel={t`Close`}
                topRightLabel={t`Max`}
                topRightValue={formatUsd(maxCloseSize)}
                inputValue={closeUsdInputValue}
                onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
                showMaxButton={maxCloseSize > 0 && closeSizeUsd !== maxCloseSize}
                onClickMax={() => setCloseUsdInputValueRaw(formatAmountFree(maxCloseSize, USD_DECIMALS))}
                showPercentSelector={true}
                onPercentChange={(percentage) => {
                  const formattedAmount = formatAmountFree((maxCloseSize * BigInt(percentage)) / 100n, USD_DECIMALS, 2);
                  setCloseUsdInputValueRaw(formattedAmount);
                }}
                qa="amount-input"
              >
                USD
              </BuyInputSection>
            </div>
            {isTrigger && (
              <BuyInputSection
                topLeftLabel={t`Price`}
                topRightLabel={t`Mark`}
                topRightValue={formatUsd(markPrice, {
                  displayDecimals: marketDecimals,
                })}
                onClickTopRightLabel={() => {
                  setTriggerPriceInputValueRaw(formatAmount(markPrice, USD_DECIMALS, toToken?.priceDecimals || 2));
                }}
                inputValue={triggerPriceInputValue}
                onInputValueChange={(e) => {
                  setTriggerPriceInputValue(e.target.value);
                }}
                qa="trigger-input"
              >
                USD
              </BuyInputSection>
            )}

            <ExchangeInfo className="PositionEditor-info-box">
              <ExchangeInfo.Group>
                {isTrigger && triggerPriceRow}
                {limitPriceRow}
                {liqPriceRow}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <PositionSellerAdvancedRows triggerPriceInputValue={triggerPriceInputValue} />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <TradeFeesRow {...fees} feesType="decrease" />
                <NetworkFeeRow executionFee={executionFee} />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>{receiveTokenRow}</ExchangeInfo.Group>

              {(priceImpactWarningState.shouldShowWarning || highExecutionFeeAcknowledgement) && (
                <ExchangeInfo.Group>
                  <div className="PositionSeller-price-impact-warning">
                    {priceImpactWarningState.shouldShowWarning && (
                      <HighPriceImpactWarning priceImpactWarningState={priceImpactWarningState} />
                    )}

                    {highExecutionFeeAcknowledgement}
                  </div>
                </ExchangeInfo.Group>
              )}
            </ExchangeInfo>
            <div className="Exchange-swap-button-container">
              <Button
                className="w-full"
                variant="primary-action"
                disabled={Boolean(error) && !shouldDisableValidationForTesting}
                onClick={onSubmit}
                buttonRef={submitButtonRef}
                qa="confirm-button"
              >
                {error ||
                  (isTrigger
                    ? t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`
                    : t`Close`)}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
