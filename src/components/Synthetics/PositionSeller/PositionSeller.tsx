import { MessageDescriptor } from "@lingui/core";
import { msg, t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import { useKey, useLatest, useMedia } from "react-use";

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
  selectExpressNoncesData,
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
  selectPositionSellerTriggerPrice,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectAddTokenPermit,
  selectTokenPermits,
} from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { selectTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { formatLeverage, formatLiquidationPrice, getNameByOrderType } from "domain/synthetics/positions";
import { getApprovalRequirements } from "domain/synthetics/tokens";
import { getPositionSellerTradeFlags } from "domain/synthetics/trade";
import { TradeType } from "domain/synthetics/trade/types";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { ORDER_OPTION_TO_TRADE_MODE, OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { getCommonError, getDecreaseError, getExpressError } from "domain/synthetics/trade/utils/validation";
import { approveTokens, Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useDebouncedInputValue } from "lib/debounce/useDebouncedInputValue";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { initDecreaseOrderMetricData, sendOrderSubmittedMetric, sendTxnValidationErrorMetric } from "lib/metrics/utils";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatPercentage,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress, getToken, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
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
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import Tabs from "components/Tabs/Tabs";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { PositionSellerAdvancedRows } from "./PositionSellerAdvancedDisplayRows";
import { ExpressTradingWarningCard } from "../TradeBox/ExpressTradingWarningCard";
import TradeInfoIcon from "../TradeInfoIcon/TradeInfoIcon";
import TwapRows from "../TwapRows/TwapRows";

import "./PositionSeller.scss";

export type Props = {
  setPendingTxns: (txns: any) => void;
};

const ORDER_OPTION_LABELS: Record<OrderOption, MessageDescriptor> = {
  [OrderOption.Market]: msg`Market`,
  [OrderOption.Trigger]: msg`TP/SL`,
  [OrderOption.Twap]: msg`TWAP`,
};

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
  const localizedOrderOptionLabels = useLocalizedMap(ORDER_OPTION_LABELS);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);
  const addTokenPermit = useSelector(selectAddTokenPermit);
  const noncesData = useSelector(selectExpressNoncesData);

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
    setTriggerPriceInputValue: setTriggerPriceInputValueRaw,
    triggerPriceInputValue: triggerPriceInputValueRaw,
    resetPositionSeller,
    setIsReceiveTokenChanged,
    setKeepLeverage,
    duration,
    numberOfParts,
    setDuration,
    setNumberOfParts,
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
  const isTwap = orderOption === OrderOption.Twap;
  const isMarket = orderOption === OrderOption.Market;
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
    tradeFlags: getPositionSellerTradeFlags(position?.isLong, orderOption),
    payUsd: closeSizeUsd,
  });

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity < (receiveUsd ?? 0n) : false;
  const setIsDismissedLatestRef = useLatest(priceImpactWarningState.setIsDismissed);

  const slippageInputId = useId();

  useEffect(() => {
    if (isVisible) {
      setIsDismissedLatestRef.current(false);
    }
  }, [setIsDismissedLatestRef, isVisible, orderOption]);

  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: position?.key });

  const batchParams: BatchOrderTxnParams | undefined = useMemo(() => {
    let orderType = isTrigger ? decreaseAmounts?.triggerOrderType : OrderType.MarketDecrease;
    orderType = isTwap ? OrderType.LimitDecrease : orderType;

    // TODO findSwapPath considering decreasePositionSwapType?
    const swapPath =
      decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.SwapCollateralTokenToPnlToken
        ? []
        : swapAmounts?.swapPathStats?.swapPath || [];

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
      autoCancel: isTrigger ? autoCancelOrdersLimit > 0 : false,
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
      triggerPrice: isTrigger ? triggerPrice : undefined,
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
    autoCancelOrdersLimit,
    chainId,
    decreaseAmounts?.acceptablePrice,
    decreaseAmounts?.collateralDeltaAmount,
    decreaseAmounts?.decreaseSwapType,
    decreaseAmounts?.sizeDeltaInTokens,
    decreaseAmounts?.sizeDeltaUsd,
    decreaseAmounts?.triggerOrderType,
    duration,
    executionFee?.feeTokenAmount,
    executionFee?.gasLimit,
    isMarket,
    isTrigger,
    isTwap,
    marketsInfoData,
    numberOfParts,
    position,
    receiveToken?.address,
    receiveUsd,
    signer,
    swapAmounts?.swapPathStats?.swapPath,
    tokensData,
    triggerPrice,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const {
    expressParams,
    isLoading: isExpressLoading,
    expressParamsPromise,
    fastExpressParams,
    asyncExpressParams,
  } = useExpressOrdersParams({
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
      chainId,
      expressParams,
      tokensData,
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
      minPositionSizeUsd,
      isTwap,
      numberOfParts,
    });

    if (commonError[0] || decreaseError[0] || expressError[0]) {
      return commonError[0] || decreaseError[0] || expressError[0];
    }

    if (isSubmitting) {
      return t`Creating Order...`;
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
    isTrigger,
    markPrice,
    minCollateralUsd,
    nextPositionValues,
    position,
    receiveToken,
    tokensData,
    triggerPrice,
    minPositionSizeUsd,
    isTwap,
    numberOfParts,
  ]);

  async function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      if (!chainId || isApproving) return;

      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: {
          action: "ApproveClick",
        },
      });

      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: tokensToApprove[0].tokenAddress,
        spender: getContract(chainId, "SyntheticsRouter"),
        pendingTxns: [],
        setPendingTxns: () => null,
        infoTokens: {},
        chainId,
        permitParams: expressParams
          ? {
              addTokenPermit,
            }
          : undefined,
        approveAmount: undefined,
        onApproveFail: () => {
          userAnalytics.pushEvent<TokenApproveResultEvent>({
            event: "TokenApproveAction",
            data: {
              action: "ApproveFail",
            },
          });
        },
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
      triggerPrice,
      marketInfo: position?.marketInfo,
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
      noncesData,
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
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove.length]);

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
      value={
        <AmountWithUsdBalance
          amount={decreaseAmounts?.receiveTokenAmount}
          decimals={position?.collateralToken.decimals ?? 0}
          symbol={position?.collateralToken.symbol}
          usd={decreaseAmounts?.receiveUsd}
        />
      }
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
                <AmountWithUsdBalance
                  className={cx({
                    "*:!text-yellow-500 hover:!text-yellow-500": isNotEnoughReceiveTokenLiquidity,
                  })}
                  amount={receiveTokenAmount}
                  decimals={receiveToken.decimals}
                  symbol={receiveToken.symbol}
                  usd={receiveUsd}
                />
              </span>
            }
            extendedSortSequence={availableTokensOptions?.sortedLongAndShortTokens}
          />
        )
      }
    />
  );

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

  const pnlRow =
    position &&
    (isTrigger ? (
      <SyntheticsInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={
              <>
                {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
              </>
            }
            to={
              decreaseAmounts?.sizeDeltaUsd ? (
                <>
                  {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                  {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                </>
              ) : undefined
            }
          />
        }
      />
    ) : (
      <SyntheticsInfoRow
        label={t`PnL`}
        value={
          <ValueTransition
            from={formatDeltaUsd(position.pnl, position.pnlPercentage)}
            to={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage)}
          />
        }
      />
    ));

  const tabsOptions = useMemo(() => {
    return Object.values(OrderOption).map((option) => ({
      value: option,
      label: localizedOrderOptionLabels[option],
    }));
  }, [localizedOrderOptionLabels]);

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
            {t`Express params loading...`}
            <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isApproving) {
      const tokenToApprove = tokensToApprove[0];
      return {
        text: (
          <>
            {t`Allow ${getToken(chainId, tokenToApprove.tokenAddress).symbol} to be spent`}{" "}
            <ImSpinner2 className="ml-4 animate-spin" />
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
        (isTrigger || isTwap
          ? t`Create ${isTwap ? "TWAP Decrease" : getNameByOrderType(decreaseAmounts?.triggerOrderType, isTwap)} Order`
          : t`Close`),
      disabled: Boolean(error) && !shouldDisableValidationForTesting,
    };
  }, [
    chainId,
    decreaseAmounts?.triggerOrderType,
    error,
    isAllowanceLoaded,
    isApproving,
    isExpressLoading,
    isTrigger,
    isTwap,
    shouldDisableValidationForTesting,
    tokensToApprove,
  ]);

  const isMobile = useMedia("(max-width: 1100px)");

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
        <div className="mb-[10.5px] flex items-center justify-between">
          <Tabs
            options={tabsOptions}
            selectedValue={orderOption}
            type="inline"
            onChange={handleSetOrderOption}
            qa="operation-tabs"
          />

          <TradeInfoIcon
            isMobile={isMobile}
            tradeType={position?.isLong ? TradeType.Long : TradeType.Short}
            tradePlace="position-seller"
          />
        </div>

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

            {isTwap && (
              <div className="pt-14">
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
              {!isTwap && (
                <ToggleSwitch
                  textClassName="text-slate-100"
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
              />

              <div className="h-1 bg-stroke-primary" />

              {!isTwap && (
                <>
                  {receiveTokenRow}
                  {liqPriceRow}
                  {pnlRow}
                </>
              )}

              <PositionSellerAdvancedRows
                triggerPriceInputValue={triggerPriceInputValue}
                slippageInputId={slippageInputId}
                gasPaymentParams={expressParams?.gasPaymentParams}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
