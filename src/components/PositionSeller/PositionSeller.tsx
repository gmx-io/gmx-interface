import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useKey, useLatest } from "react-use";

import { USD_DECIMALS } from "config/factors";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
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
import {
  selectBlockTimestampData,
  selectGasPaymentTokenAllowance,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
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
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { selectExecutionFeeBufferBps } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { selectTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { formatLeverage, formatLiquidationPrice } from "domain/synthetics/positions";
import { getApprovalRequirements } from "domain/synthetics/tokens";
import { getPositionSellerTradeFlags } from "domain/synthetics/trade";
import { getTwapRecommendation } from "domain/synthetics/trade/twapRecommendation";
import { TradeType } from "domain/synthetics/trade/types";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";
import { ORDER_OPTION_TO_TRADE_MODE, OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getCommonError, getDecreaseError, getExpressError } from "domain/synthetics/trade/utils/validation";
import { Token } from "domain/tokens";
import { useApproveToken } from "domain/tokens/useApproveTokens";
import { useChainId } from "lib/chains";
import { useDebouncedInputValue } from "lib/debounce/useDebouncedInputValue";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { initDecreaseOrderMetricData, sendOrderSubmittedMetric, sendTxnValidationErrorMetric } from "lib/metrics/utils";
import { expandDecimals, formatAmountFree, formatDeltaUsd, formatPercentage, parseValue } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { convertTokenAddress, getToken, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { getMaxNegativeImpactBps } from "sdk/utils/fees/priceImpact";
import {
  BatchOrderTxnParams,
  buildDecreaseOrderPayload,
  buildTwapOrdersPayloads,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
} from "sdk/utils/orderTransactions";
import { getIsValidTwapParams } from "sdk/utils/twap";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { MarginPercentageSlider } from "components/TradeboxMarginFields/MarginPercentageSlider";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import InfoCircleIcon from "img/ic_info_circle_stroke.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { PositionSellerAdvancedRows } from "./PositionSellerAdvancedDisplayRows";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { ExpressTradingWarningCard } from "../TradeBox/ExpressTradingWarningCard";
import { tradeModeLabels, tradeTypeLabels } from "../TradeBox/tradeboxConstants";
import TwapRows from "../TwapRows/TwapRows";
import { PositionSellerPriceImpactFeesRow } from "./rows/PositionSellerPriceImpactFeesRow";

import "./PositionSeller.scss";

const PNL_TOOLTIP_THRESHOLD = expandDecimals(10000, USD_DECIMALS);

export function PositionSeller() {
  const [, setClosingPositionKey] = useClosingPositionKeyState();
  const [isApproving, setIsApproving] = useState(false);

  const onClose = useCallback(() => {
    setClosingPositionKey(undefined);
  }, [setClosingPositionKey]);
  const availableTokensOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const availableReceiveTokens = useSelector(selectPositionSellerAvailableReceiveTokens);
  const tokensData = useTokensData();
  const { chainId, srcChainId } = useChainId();
  const { signer, account } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const { openConnectModal } = useConnectModal();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const hasOutdatedUi = useHasOutdatedUi();
  const position = useSelector(selectPositionSellerPosition);
  const toToken = position?.indexToken;
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const { shouldDisableValidationForTesting } = useSettings();
  const localizedTradeModeLabels = useLocalizedMap(tradeModeLabels);
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);
  const { approveToken } = useApproveToken();
  const executionFeeBufferBps = useSelector(selectExecutionFeeBufferBps);

  const isVisible = Boolean(position);

  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

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
    triggerPriceInputValue,
    resetPositionSeller,
    setIsReceiveTokenChanged,
    setKeepLeverage,
    duration,
    numberOfParts,
    setDuration,
    setNumberOfParts,
  } = usePositionSeller();
  const tradeMode = ORDER_OPTION_TO_TRADE_MODE[orderOption];
  const tradeType = position ? (position.isLong ? TradeType.Long : TradeType.Short) : undefined;

  const [closeUsdInputValue, setCloseUsdInputValue] = useDebouncedInputValue(
    closeUsdInputValueRaw,
    setCloseUsdInputValueRaw
  );

  const [isWaitingForDebounceBeforeSubmit, setIsWaitingForDebounceBeforeSubmit] = useState(false);

  const isMarket = orderOption === OrderOption.Market;
  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS) ?? 0n;
  const maxCloseSize = position?.sizeInUsd || 0n;

  const closePercentage = useMemo(() => {
    if (maxCloseSize === 0n) return 0;
    const percentage = Number((closeSizeUsd * 100n) / maxCloseSize);
    return Math.min(100, Math.max(0, percentage));
  }, [closeSizeUsd, maxCloseSize]);

  const handleClosePercentageChange = useCallback(
    (percentage: number) => {
      const formattedAmount = formatAmountFree((maxCloseSize * BigInt(percentage)) / 100n, USD_DECIMALS, 2);
      setCloseUsdInputValueRaw(formattedAmount);
    },
    [maxCloseSize, setCloseUsdInputValueRaw]
  );

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

  const twapRecommendation = getTwapRecommendation({
    enabled: orderOption !== OrderOption.Twap && Boolean(position),
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
    priceImpactPrecise: fees?.decreasePositionPriceImpact?.precisePercentage,
  });

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralNetPriceImpact: fees?.collateralNetPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    tradeFlags: getPositionSellerTradeFlags(position?.isLong, orderOption),
    payUsd: closeSizeUsd,
  });

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity < (receiveUsd ?? 0n) : false;
  const setIsDismissedLatestRef = useLatest(priceImpactWarningState.setIsDismissed);

  const slippageInputId = useId();

  const isTwap = orderOption === OrderOption.Twap;

  useEffect(() => {
    if (isVisible) {
      setIsDismissedLatestRef.current(false);
    }
  }, [setIsDismissedLatestRef, isVisible, orderOption]);

  const batchParams: BatchOrderTxnParams | undefined = useMemo(() => {
    const orderType = isTwap ? OrderType.LimitDecrease : OrderType.MarketDecrease;

    // TODO findSwapPath considering decreasePositionSwapType?
    const swapPath =
      decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken
        ? []
        : swapAmounts?.swapStrategy.swapPathStats?.swapPath || [];

    if (
      !account ||
      !tokensData ||
      !marketsInfoData ||
      !position ||
      executionFee?.feeTokenAmount == undefined ||
      !receiveToken?.address ||
      receiveUsd === undefined ||
      decreaseAmounts?.acceptablePrice === undefined ||
      !signer ||
      !orderType
    ) {
      return undefined;
    }

    const decreaseOrderParams: DecreasePositionOrderParams = {
      receiver: account,
      chainId,
      executionFeeAmount: executionFee.feeTokenAmount,
      executionGasLimit: executionFee.gasLimit,
      referralCode: userReferralInfo?.referralCodeForTxn,
      allowedSlippage: isMarket ? allowedSlippage : 0,
      autoCancel: false,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
      orderType,
      marketAddress: position.marketAddress,
      indexTokenAddress: position.indexToken.address,
      collateralTokenAddress: position.collateralTokenAddress,
      collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount ?? 0n,
      receiveTokenAddress: receiveToken.address,
      swapPath,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      triggerPrice: undefined,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
      externalSwapQuote: undefined,
      isLong: position.isLong,
      minOutputUsd: 0n,
      validFromTime: 0n,
    };

    let createOrderParams: CreateOrderTxnParams<DecreasePositionOrderParams>[] = [];

    if (isTwap && getIsValidTwapParams(duration, numberOfParts)) {
      createOrderParams = buildTwapOrdersPayloads(decreaseOrderParams, { duration, numberOfParts });
    } else {
      createOrderParams = [buildDecreaseOrderPayload(decreaseOrderParams)];
    }

    return {
      createOrderParams,
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [
    account,
    allowedSlippage,
    chainId,
    decreaseAmounts?.acceptablePrice,
    decreaseAmounts?.collateralDeltaAmount,
    decreaseAmounts?.decreaseSwapType,
    decreaseAmounts?.sizeDeltaInTokens,
    decreaseAmounts?.sizeDeltaUsd,
    duration,
    executionFee?.feeTokenAmount,
    executionFee?.gasLimit,
    isMarket,
    isTwap,
    marketsInfoData,
    numberOfParts,
    position,
    receiveToken?.address,
    receiveUsd,
    signer,
    swapAmounts?.swapStrategy.swapPathStats?.swapPath,
    tokensData,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const {
    expressParams,
    isLoading: isExpressLoading,
    expressParamsPromise,
    fastExpressParams,
    asyncExpressParams,
  } = useExpressOrdersParams({
    label: "Position Seller",
    orderParams: batchParams,
    isGmxAccount: srcChainId !== undefined,
  });

  const { tokensToApprove, isAllowanceLoaded } = useMemo(() => {
    if (srcChainId) {
      return { tokensToApprove: [], isAllowanceLoaded: true };
    }

    if (!batchParams) {
      return { tokensToApprove: [], isAllowanceLoaded: false };
    }

    const approvalRequirements = getApprovalRequirements({
      chainId,
      payTokenParamsList: [],
      gasPaymentTokenParams: expressParams?.gasPaymentParams
        ? {
            tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
            amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
            allowanceData: gasPaymentTokenAllowance?.tokensAllowanceData,
            isAllowanceLoaded: gasPaymentTokenAllowance?.isLoaded,
          }
        : undefined,
      permits: expressParams && tokenPermits ? tokenPermits : [],
    });

    return approvalRequirements;
  }, [
    batchParams,
    chainId,
    expressParams,
    gasPaymentTokenAllowance?.isLoaded,
    gasPaymentTokenAllowance?.tokensAllowanceData,
    srcChainId,
    tokenPermits,
  ]);

  const error = useMemo(() => {
    if (!position) {
      return undefined;
    }

    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const expressError = getExpressError({
      expressParams,
      tokensData,
    });

    const decreaseError = getDecreaseError({
      marketInfo: position.marketInfo,
      inputSizeUsd: closeSizeUsd,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      receiveToken,
      isTrigger: false,
      triggerPrice: undefined,
      triggerThresholdType: undefined,
      existingPosition: position,
      markPrice,
      nextPositionValues,
      isLong: position.isLong,
      isContractAccount: false,
      minCollateralUsd,
      isNotEnoughReceiveTokenLiquidity,
      minPositionSizeUsd,
      isTwap,
      numberOfParts,
    });

    if (commonError.buttonErrorMessage || decreaseError.buttonErrorMessage || expressError.buttonErrorMessage) {
      return commonError.buttonErrorMessage || decreaseError.buttonErrorMessage || expressError.buttonErrorMessage;
    }

    if (isSubmitting) {
      return t`Creating order...`;
    }
  }, [
    account,
    chainId,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    expressParams,
    hasOutdatedUi,
    isNotEnoughReceiveTokenLiquidity,
    isSubmitting,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    receiveToken,
    tokensData,
    minPositionSizeUsd,
    isTwap,
    numberOfParts,
  ]);

  async function onSubmit() {
    if (!account || !signer) {
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      if (!chainId || isApproving) return;

      approveToken({
        signer,
        tokenAddress: tokensToApprove[0].tokenAddress,
        chainId,
        allowPermit: Boolean(expressParams),
        setIsApproving,
      });

      return;
    }

    const params = batchParams?.createOrderParams[0];

    const metricData = initDecreaseOrderMetricData({
      collateralToken: position?.collateralToken,
      decreaseAmounts,
      hasExistingPosition: true,
      swapPath: params?.orderPayload.addresses.swapPath,
      executionFee,
      orderType: params?.orderPayload.orderType,
      hasReferralCode: Boolean(userReferralInfo?.referralCodeForTxn),
      subaccount: expressParams?.subaccount,
      triggerPrice: undefined,
      marketInfo: position?.marketInfo,
      executionFeeBufferBps,
      isTwap,
      allowedSlippage,
      isLong: position?.isLong,
      place: "positionSeller",
      interactionId: undefined,
      priceImpactDeltaUsd: undefined,
      priceImpactPercentage: undefined,
      netRate1h: undefined,
      isExpress: Boolean(expressParams),
      duration,
      partsCount: numberOfParts,
      tradeMode: ORDER_OPTION_TO_TRADE_MODE[orderOption],
      fastExpressParams,
      asyncExpressParams,
      expressParams,
      chainId: srcChainId ?? chainId,
      isCollateralFromMultichain: srcChainId !== undefined,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (
      !batchParams ||
      !tokensData ||
      !marketsInfoData ||
      !position ||
      executionFee?.feeTokenAmount == undefined ||
      !receiveToken?.address ||
      receiveUsd === undefined ||
      decreaseAmounts?.acceptablePrice === undefined ||
      !signer ||
      !provider
    ) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    setIsSubmitting(true);

    const fulfilledExpressParams = await expressParamsPromise;

    const txnPromise = sendBatchOrderTxn({
      chainId,
      signer,
      provider,
      batchParams,
      isGmxAccount: srcChainId !== undefined,
      expressParams:
        fulfilledExpressParams && getIsValidExpressParams(fulfilledExpressParams) ? fulfilledExpressParams : undefined,
      simulationParams: shouldDisableValidationForTesting
        ? undefined
        : {
            tokensData,
            blockTimestampData,
          },
      callback: makeOrderTxnCallback({
        metricId: metricData.metricId,
        slippageInputId,
      }),
    });

    if (expressParams?.subaccount) {
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
        if (closeUsdInputValue === closeUsdInputValueRaw) {
          latestOnSubmit.current();
        } else {
          setIsWaitingForDebounceBeforeSubmit(true);
        }
      }
    },
    {},
    [isVisible, error, closeUsdInputValue, closeUsdInputValueRaw, latestOnSubmit]
  );

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove.length]);

  useEffect(() => {
    if (isWaitingForDebounceBeforeSubmit && closeUsdInputValue === closeUsdInputValueRaw) {
      setIsWaitingForDebounceBeforeSubmit(false);
      latestOnSubmit.current();
    }
  }, [isWaitingForDebounceBeforeSubmit, latestOnSubmit, closeUsdInputValue, closeUsdInputValueRaw]);

  useEffect(() => {
    if (!isVisible) {
      setIsWaitingForDebounceBeforeSubmit(false);
    }
  }, [isVisible]);

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
    if (isTwap && decreaseAmounts) {
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
    isTwap,
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

  const receiveTokenRow = (
    <SyntheticsInfoRow
      label={t`Receive`}
      value={
        receiveToken && (
          <TokenSelector
            label={t`Receive`}
            className={cx({
              "*:!text-yellow-300 hover:!text-yellow-300": isNotEnoughReceiveTokenLiquidity,
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
                <AmountWithUsdBalance
                  className={cx({
                    "*:!text-yellow-300 hover:!text-yellow-300": isNotEnoughReceiveTokenLiquidity,
                  })}
                  amount={receiveTokenAmount}
                  decimals={receiveToken.decimals}
                  symbol={receiveToken.symbol}
                  usd={receiveUsd}
                  isStable={receiveToken.isStable}
                />
              </span>
            }
            extendedSortSequence={availableTokensOptions?.sortedLongAndShortTokens}
          />
        )
      }
    />
  );

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
          <ExternalLink href="https://docs.gmx.io/docs/trading/#max-leverage">Read more</ExternalLink>.
        </Trans>
      }
    />
  ) : (
    keepLeverageText
  );

  const shouldHidePnlPercentage = useMemo(() => {
    const fromPnl = position?.pnl;
    const toPnl = nextPositionValues?.nextPnl;

    if (fromPnl === undefined || toPnl === undefined) return false;

    return bigMath.abs(fromPnl) > PNL_TOOLTIP_THRESHOLD && bigMath.abs(toPnl) > PNL_TOOLTIP_THRESHOLD;
  }, [position?.pnl, nextPositionValues?.nextPnl]);

  const pnlRow = position && (
    <SyntheticsInfoRow
      label={t`PnL`}
      value={
        shouldHidePnlPercentage ? (
          <ValueTransition
            from={
              <TooltipWithPortal
                handle={formatDeltaUsd(position.pnl, position.pnlPercentage, { hidePercentage: true })}
                content={
                  <span className={position.pnl > 0n ? "text-green-500" : "text-red-500"}>
                    {formatPercentage(position.pnlPercentage, { signed: true })}
                  </span>
                }
              />
            }
            to={
              <TooltipWithPortal
                handle={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage, {
                  hidePercentage: true,
                })}
                content={
                  <span
                    className={
                      nextPositionValues?.nextPnl !== undefined && nextPositionValues.nextPnl > 0n
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })}
                  </span>
                }
              />
            }
          />
        ) : (
          <ValueTransition
            from={formatDeltaUsd(position.pnl, position.pnlPercentage)}
            to={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage)}
          />
        )
      }
    />
  );

  const buttonState = useMemo(() => {
    if (!isAllowanceLoaded) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (isExpressLoading) {
      return {
        text: (
          <>
            {t`Loading Express params...`}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isApproving && tokensToApprove.length) {
      const tokenToApprove = tokensToApprove[0];
      return {
        text: (
          <>
            {t`Allow ${getToken(chainId, tokenToApprove.tokenAddress).symbol} to be spent`}{" "}
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      const tokenToApprove = tokensToApprove[0];
      return {
        text: t`Allow ${getToken(chainId, tokenToApprove.tokenAddress).symbol} to be spent`,
        disabled: false,
      };
    }

    return {
      text:
        error ||
        (tradeType !== undefined
          ? `${localizedTradeModeLabels[tradeMode]}: ${localizedTradeTypeLabels[tradeType]} ${t`Decrease`}`
          : t`Close`),
      disabled: Boolean(error) && !shouldDisableValidationForTesting,
    };
  }, [
    chainId,
    error,
    isAllowanceLoaded,
    isApproving,
    isExpressLoading,
    localizedTradeModeLabels,
    localizedTradeTypeLabels,
    shouldDisableValidationForTesting,
    tradeMode,
    tradeType,
    tokensToApprove,
  ]);

  return (
    <div className="text-body-medium">
      <Modal
        isVisible={isVisible}
        setIsVisible={onClose}
        label={
          <Trans>
            {localizedTradeModeLabels[tradeMode]}: {position?.isLong ? t`Long` : t`Short`}{" "}
            {position?.indexToken && getTokenVisualMultiplier(position.indexToken)}
            {position?.indexToken?.symbol}/USD decrease
          </Trans>
        }
        qa="position-close-modal"
        contentClassName="w-[380px]"
        contentPadding={false}
      >
        <div className="w-full">
          {position && (
            <>
              <div className="mt-12 flex flex-col gap-4 border-t-1/2 border-slate-600 px-20 py-16">
                {twapRecommendation && (
                  <ColorfulBanner color="blue" icon={InfoCircleIcon}>
                    <div className="flex flex-col gap-8">
                      <span>
                        <span
                          className="cursor-pointer font-medium text-blue-300"
                          onClick={() => {
                            handleSetOrderOption(OrderOption.Twap);
                          }}
                        >
                          <Trans>Use a TWAP order</Trans>
                        </span>{" "}
                        <Trans> for lower net price impact.</Trans>
                      </span>
                    </div>
                  </ColorfulBanner>
                )}
                <div className="flex flex-col gap-8">
                  <BuyInputSection
                    topLeftLabel={t`Close`}
                    inputValue={closeUsdInputValue}
                    onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
                    showPercentSelector
                    onPercentChange={(percentage) => {
                      const formattedAmount = formatAmountFree(
                        (maxCloseSize * BigInt(percentage)) / 100n,
                        USD_DECIMALS,
                        2
                      );
                      setCloseUsdInputValueRaw(formattedAmount);
                    }}
                    qa="amount-input"
                    maxDecimals={USD_DECIMALS}
                  >
                    USD
                  </BuyInputSection>
                  <MarginPercentageSlider value={closePercentage} onChange={handleClosePercentageChange} />
                </div>
              </div>

              {isTwap && (
                <div className="px-20 py-14">
                  <TwapRows
                    duration={duration}
                    numberOfParts={numberOfParts}
                    setNumberOfParts={setNumberOfParts}
                    setDuration={setDuration}
                    isLong={position.isLong}
                    sizeUsd={decreaseAmounts?.sizeDeltaUsd}
                    marketInfo={position.marketInfo}
                    type="decrease"
                  />
                </div>
              )}

              <div className="flex w-full flex-col gap-14 px-20 pb-14">
                <HighPriceImpactOrFeesWarningCard
                  priceImpactWarningState={priceImpactWarningState}
                  swapPriceImpact={fees?.swapPriceImpact}
                  swapProfitFee={fees?.swapProfitFee}
                  executionFeeUsd={executionFee?.feeUsd}
                  maxNegativeImpactBps={position.marketInfo ? getMaxNegativeImpactBps(position.marketInfo) : undefined}
                />

                {!isTwap && (
                  <ToggleSwitch
                    textClassName="text-typography-secondary"
                    isChecked={leverageCheckboxDisabledByCollateral ? false : keepLeverageChecked}
                    setIsChecked={setKeepLeverage}
                    disabled={leverageCheckboxDisabledByCollateral || decreaseAmounts?.isFullClose}
                  >
                    {keepLeverageTextElem}
                  </ToggleSwitch>
                )}

                <Button
                  className="w-full"
                  variant="primary-action"
                  disabled={buttonState.disabled}
                  onClick={onSubmit}
                  buttonRef={submitButtonRef}
                  qa="confirm-button"
                >
                  {buttonState.text}
                </Button>

                <ExpressTradingWarningCard
                  expressParams={expressParams}
                  payTokenAddress={undefined}
                  isWrapOrUnwrap={false}
                  isGmxAccount={srcChainId !== undefined}
                />

                {!isTwap && (
                  <>
                    {receiveTokenRow}
                    {liqPriceRow}
                    {pnlRow}
                  </>
                )}

                <PositionSellerPriceImpactFeesRow />

                <PositionSellerAdvancedRows
                  triggerPriceInputValue={triggerPriceInputValue}
                  slippageInputId={slippageInputId}
                  gasPaymentParams={expressParams?.gasPaymentParams}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
