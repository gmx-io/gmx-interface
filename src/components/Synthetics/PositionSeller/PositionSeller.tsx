import { Trans, msg, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKey, useLatest } from "react-use";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { USD_DECIMALS } from "config/factors";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  useClosingPositionKeyState,
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionSeller,
  usePositionSellerKeepLeverage,
  usePositionSellerLeverageDisabledByCollateral,
} from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import { DecreasePositionSwapType, OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import { formatLeverage, formatLiquidationPrice, getTriggerNameByOrderType } from "domain/synthetics/positions";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getCommonError, getDecreaseError } from "domain/synthetics/trade/utils/validation";
import { useChainId } from "lib/chains";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatTokenAmountWithUsd,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useDebouncedInputValue } from "lib/useDebouncedInputValue";
import useWallet from "lib/wallets/useWallet";
import { convertTokenAddress, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectBlockTimestampData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionSellerAvailableReceiveTokens,
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerFees,
  selectPositionSellerMarkPrice,
  selectPositionSellerMaxLiquidityPath,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
  selectPositionSellerReceiveToken,
  selectPositionSellerSetDefaultReceiveToken,
  selectPositionSellerShouldSwap,
  selectPositionSellerSwapAmounts,
  selectPositionSellerTriggerPrice,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Token } from "domain/tokens";
import { useLocalizedMap } from "lib/i18n";
import { bigMath } from "sdk/utils/bigmath";
import { PositionSellerAdvancedRows } from "./PositionSellerAdvancedDisplayRows";

import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { helperToast } from "lib/helperToast";
import {
  initDecreaseOrderMetricData,
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import "./PositionSeller.scss";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import ExternalLink from "components/ExternalLink/ExternalLink";

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
  const availableReceiveTokens = useSelector(selectPositionSellerAvailableReceiveTokens);
  const tokensData = useTokensData();
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const hasOutdatedUi = useHasOutdatedUi();
  const position = useSelector(selectPositionSellerPosition);
  const toToken = position?.indexToken;
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const { shouldDisableValidationForTesting } = useSettings();
  const localizedOrderOptionLabels = useLocalizedMap(ORDER_OPTION_LABELS);
  const blockTimestampData = useSelector(selectBlockTimestampData);

  const isVisible = Boolean(position);

  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const setDefaultReceiveToken = useSelector(selectPositionSellerSetDefaultReceiveToken);
  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(position?.market.indexTokenAddress));

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
    setKeepLeverage,
  } = usePositionSeller();

  const [closeUsdInputValue, setCloseUsdInputValue] = useDebouncedInputValue(
    closeUsdInputValueRaw,
    setCloseUsdInputValueRaw
  );
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useDebouncedInputValue(
    triggerPriceInputValueRaw,
    setTriggerPriceInputValueRaw
  );

  const [isWaitingForDebounceBeforeSubmit, setIsWaitingForDebounceBeforeSubmit] = useState(false);

  const triggerPrice = useSelector(selectPositionSellerTriggerPrice);

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

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    tradeFlags,
  });

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity < (receiveUsd ?? 0n) : false;
  const setIsDismissedLatestRef = useLatest(priceImpactWarningState.setIsDismissed);

  useEffect(() => {
    if (isVisible) {
      setIsDismissedLatestRef.current(false);
    }
  }, [setIsDismissedLatestRef, isVisible, orderOption]);

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
      triggerThresholdType: undefined,
      existingPosition: position,
      markPrice,
      nextPositionValues,
      isLong: position.isLong,
      isContractAccount: false,
      minCollateralUsd,
      isNotEnoughReceiveTokenLiquidity,
    });

    if (commonError[0] || decreaseError[0]) {
      return commonError[0] || decreaseError[0];
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
    isNotEnoughReceiveTokenLiquidity,
    isSubmitting,
    isTrigger,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    receiveToken,
    triggerPrice,
  ]);

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: position?.key });

  const subaccount = useSubaccount(executionFee?.feeTokenAmount ?? null);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    const orderType = isTrigger ? decreaseAmounts?.triggerOrderType : OrderType.MarketDecrease;
    // TODO findSwapPath considering decreasePositionSwapType?
    const swapPath =
      decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken
        ? []
        : swapAmounts?.swapPathStats?.swapPath || [];

    const metricData = initDecreaseOrderMetricData({
      collateralToken: position?.collateralToken,
      decreaseAmounts,
      hasExistingPosition: true,
      swapPath,
      executionFee,
      orderType: orderType,
      hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
      subaccount,
      triggerPrice,
      marketInfo: position?.marketInfo,
      allowedSlippage,
      isLong: position?.isLong,
      place: "positionSeller",
      interactionId: undefined,
      priceImpactDeltaUsd: undefined,
      priceImpactPercentage: undefined,
      netRate1h: undefined,
    });

    sendOrderSubmittedMetric(metricData.metricId);

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
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    setIsSubmitting(true);

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
        executionGasLimit: executionFee.gasLimit,
        allowedSlippage,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: orderOption === OrderOption.Trigger || shouldDisableValidationForTesting,
        autoCancel: orderOption === OrderOption.Trigger ? autoCancelOrdersLimit > 0 : false,
      },
      {
        setPendingOrder,
        setPendingTxns,
        setPendingPosition,
      },
      blockTimestampData,
      metricData.metricId
    )
      .then(makeTxnSentMetricsHandler(metricData.metricId))
      .catch(makeTxnErrorMetricsHandler(metricData.metricId));

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

  const latestOnSubmit = useLatest(onSubmit);

  useKey(
    "Enter",
    () => {
      if (isVisible && !error) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        if (closeUsdInputValue === closeUsdInputValueRaw && triggerPriceInputValue === triggerPriceInputValueRaw) {
          latestOnSubmit.current();
        } else {
          setIsWaitingForDebounceBeforeSubmit(true);
        }
      }
    },
    {},
    [
      isVisible,
      error,
      closeUsdInputValue,
      triggerPriceInputValue,
      closeUsdInputValueRaw,
      triggerPriceInputValueRaw,
      latestOnSubmit,
    ]
  );

  useEffect(() => {
    if (
      isWaitingForDebounceBeforeSubmit &&
      closeUsdInputValue === closeUsdInputValueRaw &&
      triggerPriceInputValue === triggerPriceInputValueRaw
    ) {
      setIsWaitingForDebounceBeforeSubmit(false);
      latestOnSubmit.current();
    }
  }, [
    isWaitingForDebounceBeforeSubmit,
    latestOnSubmit,
    closeUsdInputValue,
    triggerPriceInputValue,
    closeUsdInputValueRaw,
    triggerPriceInputValueRaw,
  ]);

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

  const liqPriceRow = position && (
    <SyntheticsInfoRow
      label={t`Liquidation Price`}
      value={
        <ValueTransition
          from={
            formatLiquidationPrice(position.liquidationPrice, {
              displayDecimals: marketDecimals,
              visualMultiplier: toToken?.visualMultiplier,
            })!
          }
          to={
            decreaseAmounts?.isFullClose
              ? "-"
              : decreaseAmounts?.sizeDeltaUsd
                ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: marketDecimals,
                    visualMultiplier: toToken?.visualMultiplier,
                  })
                : undefined
          }
        />
      }
    />
  );

  const receiveTokenRow = isTrigger ? (
    <SyntheticsInfoRow
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
    <SyntheticsInfoRow
      label={t`Receive`}
      className=""
      value={
        receiveToken && (
          <TokenSelector
            label={t`Receive`}
            className={cx({
              "*:!text-yellow-500 hover:!text-yellow-500": isNotEnoughReceiveTokenLiquidity,
            })}
            chainId={chainId}
            showBalances={false}
            infoTokens={availableTokensOptions?.infoTokens}
            tokenAddress={receiveToken.address}
            onSelectToken={setReceiveTokenManually}
            tokens={availableReceiveTokens}
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

  let formattedTriggerPrice = "-";

  if (decreaseAmounts && decreaseAmounts.triggerPrice !== undefined && decreaseAmounts.triggerPrice !== 0n) {
    formattedTriggerPrice = `${decreaseAmounts.triggerThresholdType || ""} ${formatUsd(decreaseAmounts.triggerPrice, {
      displayDecimals: marketDecimals ?? toToken?.priceDecimals,
      visualMultiplier: toToken?.visualMultiplier,
    })}`;
  }

  const { warning: maxAutoCancelOrdersWarning } = useMaxAutoCancelOrdersState({
    positionKey: position?.key,
    isCreatingNewAutoCancel: isTrigger,
  });
  const leverageCheckboxDisabledByCollateral = usePositionSellerLeverageDisabledByCollateral();
  const keepLeverage = usePositionSellerKeepLeverage();
  const keepLeverageChecked = decreaseAmounts?.isFullClose ? false : keepLeverage ?? false;

  let keepLeverageAtValue: string | undefined = "...";
  if (position?.leverage && !decreaseAmounts?.isFullClose) {
    keepLeverageAtValue = formatLeverage(position.leverage);
  }

  const keepLeverageText = <Trans>Keep leverage at {keepLeverageAtValue}</Trans>;

  const keepLeverageTextElem = leverageCheckboxDisabledByCollateral ? (
    <TooltipWithPortal
      handle={keepLeverageText}
      content={
        <Trans>
          Keep leverage is not available as Position exceeds max. allowed leverage.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
        </Trans>
      }
    />
  ) : (
    keepLeverageText
  );

  return (
    <div className="text-body-medium">
      <Modal
        isVisible={isVisible}
        setIsVisible={onClose}
        label={
          <Trans>
            Close {position?.isLong ? t`Long` : t`Short`}{" "}
            {position?.indexToken && getTokenVisualMultiplier(position.indexToken)}
            {position?.indexToken?.symbol}
          </Trans>
        }
        qa="position-close-modal"
        contentClassName="w-[380px]"
      >
        <Tab
          className="mb-[10.5px]"
          options={Object.values(OrderOption)}
          option={orderOption}
          type="inline"
          optionLabels={localizedOrderOptionLabels}
          onChange={handleSetOrderOption}
          qa="operation-tabs"
        />

        {position && (
          <>
            <div className="flex flex-col gap-2">
              <BuyInputSection
                topLeftLabel={t`Close`}
                inputValue={closeUsdInputValue}
                onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
                bottomLeftValue={formatUsd(closeSizeUsd)}
                isBottomLeftValueMuted={closeSizeUsd === 0n}
                bottomRightLabel={t`Max`}
                bottomRightValue={formatUsd(maxCloseSize)}
                onClickMax={
                  maxCloseSize > 0 && closeSizeUsd !== maxCloseSize
                    ? () => setCloseUsdInputValueRaw(formatAmountFree(maxCloseSize, USD_DECIMALS))
                    : undefined
                }
                showPercentSelector
                onPercentChange={(percentage) => {
                  const formattedAmount = formatAmountFree((maxCloseSize * BigInt(percentage)) / 100n, USD_DECIMALS, 2);
                  setCloseUsdInputValueRaw(formattedAmount);
                }}
                qa="amount-input"
              >
                USD
              </BuyInputSection>
              {isTrigger && (
                <BuyInputSection
                  topLeftLabel={t`Trigger Price`}
                  topRightLabel={t`Mark`}
                  topRightValue={formatUsd(markPrice, {
                    displayDecimals: marketDecimals,
                    visualMultiplier: toToken?.visualMultiplier,
                  })}
                  onClickTopRightLabel={() => {
                    setTriggerPriceInputValueRaw(
                      formatAmount(
                        markPrice,
                        USD_DECIMALS,
                        calculateDisplayDecimals(markPrice, USD_DECIMALS, toToken?.visualMultiplier),
                        undefined,
                        undefined,
                        toToken?.visualMultiplier
                      )
                    );
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
            </div>

            <div className="flex flex-col gap-14 pt-14">
              {isTrigger && maxAutoCancelOrdersWarning}
              <HighPriceImpactOrFeesWarningCard
                priceImpactWarningState={priceImpactWarningState}
                collateralImpact={fees?.positionCollateralPriceImpact}
                positionImpact={fees?.positionPriceImpact}
                swapPriceImpact={fees?.swapPriceImpact}
                swapProfitFee={fees?.swapProfitFee}
                executionFeeUsd={executionFee?.feeUsd}
              />
              <ToggleSwitch
                textClassName="text-slate-100"
                isChecked={leverageCheckboxDisabledByCollateral ? false : keepLeverageChecked}
                setIsChecked={setKeepLeverage}
                disabled={leverageCheckboxDisabledByCollateral ?? decreaseAmounts?.isFullClose}
              >
                {keepLeverageTextElem}
              </ToggleSwitch>

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

              <div className="h-1 bg-stroke-primary" />
              {receiveTokenRow}
              {isTrigger && <SyntheticsInfoRow label={t`Trigger Price`} value={formattedTriggerPrice} />}
              {liqPriceRow}

              <PositionSellerAdvancedRows triggerPriceInputValue={triggerPriceInputValue} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
