import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import { usePublicClient } from "wagmi";

import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  usePositionEditorMinCollateralFactor,
  usePositionEditorPosition,
  usePositionEditorPositionState,
} from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { useSavedAllowedSlippage } from "context/SyntheticsStateContext/hooks/settingsHooks";
import {
  selectBlockTimestampData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSelectedCollateralToken,
  selectPositionEditorSetCollateralInputValue,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { selectAddTokenPermit } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGelatoRelayRouterDomain } from "domain/synthetics/express";
import { RelayerFeeParams } from "domain/synthetics/express/types";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { getOrderRelayRouterAddress } from "domain/synthetics/orders/expressOrderUtils";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  getIsPositionInfoLoaded,
  substractMaxLeverageSlippage,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { convertToTokenAmount, getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { getMarkPrice, getMinCollateralUsdForLeverage } from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { approveTokens } from "domain/tokens";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { isAddressZero } from "lib/legacy";
import {
  initEditCollateralMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { expandDecimals, formatAmountFree } from "lib/numbers";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getWrappedToken } from "sdk/configs/tokens";
import {
  BatchOrderTxnParams,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  IncreasePositionOrderParams,
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
} from "sdk/utils/orderTransactions";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { OPERATION_LABELS, Operation } from "./types";

export function usePositionEditorButtonState(operation: Operation): {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => void;
  relayerFeeParams?: RelayerFeeParams;
} {
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const allowedSlippage = useSavedAllowedSlippage();
  const { chainId } = useChainId();
  const { shouldDisableValidationForTesting } = useSettings();
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const settlementChainClient = usePublicClient({ chainId });
  const { openConnectModal } = useConnectModal();
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const hasOutdatedUi = useHasOutdatedUi();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const selectedCollateralAddress = useSelector(selectPositionEditorSelectedCollateralAddress);
  const selectedCollateralToken = useSelector(selectPositionEditorSelectedCollateralToken);
  const setCollateralInputValue = useSelector(selectPositionEditorSetCollateralInputValue);
  const { collateralDeltaAmount, collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoading,
    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: position ? [position.collateralTokenAddress] : [],
  });

  const isDeposit = operation === Operation.Deposit;

  const needCollateralApproval =
    isDeposit && getNeedTokenApprove(tokensAllowanceData, selectedCollateralAddress, collateralDeltaAmount);

  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!needCollateralApproval && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needCollateralApproval]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBalancesLoading = selectedCollateralToken?.balance === undefined;

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

  const collateralPrice = selectedCollateralToken?.prices.minPrice;

  const markPrice = position
    ? getMarkPrice({
        prices: position.indexToken.prices,
        isLong: position.isLong,
        isIncrease: isDeposit,
      })
    : undefined;

  const maxWithdrawAmount = useMemo(() => {
    if (!getIsPositionInfoLoaded(position)) return 0n;

    const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position, 0n);
    let _minCollateralUsd = minCollateralUsdForLeverage;

    if (minCollateralUsd !== undefined && minCollateralUsd > _minCollateralUsd) {
      _minCollateralUsd = minCollateralUsd;
    }

    _minCollateralUsd =
      _minCollateralUsd + (position?.pendingBorrowingFeesUsd ?? 0n) + (position?.pendingFundingFeesUsd ?? 0n);

    if (position.collateralUsd < _minCollateralUsd) {
      return 0n;
    }

    const maxWithdrawUsd = position.collateralUsd - _minCollateralUsd;
    const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, selectedCollateralToken?.decimals, collateralPrice);

    return maxWithdrawAmount;
  }, [collateralPrice, selectedCollateralToken?.decimals, minCollateralUsd, position]);

  const { executionFee } = usePositionEditorFees({
    operation,
  });

  const { nextLeverage, nextLiqPrice, receiveUsd } = usePositionEditorData({
    operation,
  });

  const minCollateralFactor = usePositionEditorMinCollateralFactor();

  const detectAndSetMaxSize = useCallback(() => {
    if (maxWithdrawAmount === undefined) return;
    if (!selectedCollateralToken) return;
    if (!position) return;
    if (minCollateralFactor === undefined) return;

    const { result: safeMaxWithdrawal } = bigNumberBinarySearch(
      BigInt(1),
      maxWithdrawAmount,
      expandDecimals(1, Math.ceil(selectedCollateralToken.decimals / 3)),
      (x) => {
        const isValid = willPositionCollateralBeSufficientForPosition(position, x, 0n, minCollateralFactor, 0n);
        return { isValid, returnValue: null };
      }
    );
    setCollateralInputValue(
      formatAmountFree(substractMaxLeverageSlippage(safeMaxWithdrawal), selectedCollateralToken.decimals)
    );
  }, [selectedCollateralToken, maxWithdrawAmount, minCollateralFactor, position, setCollateralInputValue]);

  const [error, tooltipName] = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextLeverage,
      nextLiqPrice,
      isDeposit,
      position,
      depositToken: selectedCollateralToken,
      depositAmount: collateralDeltaAmount,
      minCollateralFactor,
    });

    const error = commonError[0] || editCollateralError[0];
    const tooltipName = commonError[1] || editCollateralError[1];

    if (error) {
      return [error, tooltipName];
    }

    if (isAllowanceLoading || isBalancesLoading) {
      return [t`Loading...`];
    }

    if (isSubmitting) {
      return [t`Creating Order...`];
    }

    return [];
  }, [
    chainId,
    account,
    hasOutdatedUi,
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    selectedCollateralToken,
    minCollateralFactor,
    isAllowanceLoading,
    isBalancesLoading,
    isSubmitting,
  ]);

  const errorTooltipContent = useMemo(() => {
    if (tooltipName !== "maxLeverage") return null;

    return (
      <Trans>
        Decrease the withdraw size to match the max.{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
        <br />
        <br />
        <span onClick={detectAndSetMaxSize} className="Tradebox-handle">
          <Trans>Set max withdrawal</Trans>
        </span>
      </Trans>
    );
  }, [detectAndSetMaxSize, tooltipName]);

  const addTokenPermit = useSelector(selectAddTokenPermit);

  const batchParams: BatchOrderTxnParams | undefined = useMemo(() => {
    if (
      !account ||
      !tokensData ||
      !marketsInfoData ||
      !position ||
      !selectedCollateralAddress ||
      !signer ||
      !executionFee ||
      markPrice === undefined ||
      collateralDeltaAmount === undefined ||
      !selectedCollateralToken
    ) {
      return undefined;
    }

    let createOrderParams: CreateOrderTxnParams<IncreasePositionOrderParams | DecreasePositionOrderParams>;

    if (isDeposit) {
      createOrderParams = buildIncreaseOrderPayload({
        chainId,
        receiver: account,
        executionFeeAmount: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        referralCode: userReferralInfo?.referralCodeForTxn,
        swapPath: [],
        externalSwapQuote: undefined,
        payTokenAddress: selectedCollateralAddress,
        payTokenAmount: collateralDeltaAmount,
        collateralTokenAddress: selectedCollateralAddress,
        collateralDeltaAmount: collateralDeltaAmount,
        sizeDeltaUsd: 0n,
        sizeDeltaInTokens: 0n,
        acceptablePrice: markPrice,
        triggerPrice: undefined,
        orderType: OrderType.MarketIncrease,
        isLong: position.isLong,
        marketAddress: position.marketAddress,
        indexTokenAddress: position.indexToken.address,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
        allowedSlippage,
        autoCancel: false,
      });
    } else {
      if (receiveUsd === undefined) {
        return;
      }
      createOrderParams = buildDecreaseOrderPayload({
        chainId,
        receiver: account,
        executionFeeAmount: executionFee.feeTokenAmount,
        executionGasLimit: executionFee.gasLimit,
        referralCode: userReferralInfo?.referralCodeForTxn,
        swapPath: [],
        externalSwapQuote: undefined,
        collateralTokenAddress: selectedCollateralAddress,
        collateralDeltaAmount: collateralDeltaAmount,
        receiveTokenAddress: selectedCollateralAddress,
        minOutputUsd: receiveUsd,
        decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
        orderType: OrderType.MarketDecrease,
        isLong: position.isLong,
        marketAddress: position.marketAddress,
        indexTokenAddress: position.indexToken.address,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
        allowedSlippage,
        sizeDeltaUsd: 0n,
        sizeDeltaInTokens: 0n,
        acceptablePrice: markPrice,
        triggerPrice: undefined,
        autoCancel: false,
      });
    }

    return {
      createOrderParams: [createOrderParams],
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [
    account,
    allowedSlippage,
    chainId,
    collateralDeltaAmount,
    executionFee,
    isDeposit,
    markPrice,
    marketsInfoData,
    position,
    receiveUsd,
    selectedCollateralAddress,
    selectedCollateralToken,
    signer,
    tokensData,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const { expressParams } = useExpressOrdersParams({
    orderParams: batchParams,
  });

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && needCollateralApproval && selectedCollateralToken) {
      if (!chainId || isApproving) return;

      const wrappedToken = getWrappedToken(chainId);
      const tokenAddress = isAddressZero(selectedCollateralToken.address)
        ? wrappedToken.address
        : selectedCollateralToken.address;

      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: {
          action: "ApproveClick",
        },
      });

      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: tokenAddress,
        spender: getContract(chainId, "SyntheticsRouter"),
        pendingTxns: [],
        setPendingTxns: () => null,
        infoTokens: {},
        chainId,
        permitParams: expressParams
          ? {
              addTokenPermit,
              verifyingContract: getGelatoRelayRouterDomain(
                chainId,
                getOrderRelayRouterAddress(
                  chainId,
                  Boolean(expressParams?.subaccount),
                  // isMultichain
                  false
                ),
                Boolean(expressParams?.subaccount)
              ).verifyingContract,
            }
          : undefined,
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

    const orderType = isDeposit ? OrderType.MarketIncrease : OrderType.MarketDecrease;

    const metricData = initEditCollateralMetricData({
      collateralToken: selectedCollateralToken,
      executionFee,
      selectedCollateralAddress,
      marketInfo: position?.marketInfo,
      collateralDeltaAmount,
      subaccount: expressParams?.subaccount,
      orderType,
      isLong: position?.isLong,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (!batchParams || !tokensData || !signer) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    const txnPromise = sendBatchOrderTxn({
      chainId,
      signer,
      settlementChainClient,
      batchParams,
      expressParams,
      simulationParams: shouldDisableValidationForTesting
        ? undefined
        : {
            tokensData,
            blockTimestampData,
          },
      callback: makeOrderTxnCallback({
        metricId: metricData.metricId,
        slippageInputId: undefined,
      }),
    });

    if (expressParams?.subaccount) {
      onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise.then(onClose).finally(() => {
      setIsSubmitting(false);
    });
  }

  if (isApproving) {
    return {
      text: (
        <>
          {t`Allow ${selectedCollateralToken?.assetSymbol ?? selectedCollateralToken?.symbol} to be spent`}{" "}
          <ImSpinner2 className="ml-4 animate-spin" />
        </>
      ),
      tooltipContent: errorTooltipContent,
      disabled: true,
      relayerFeeParams: expressParams?.relayFeeParams,
      onSubmit,
    };
  }

  if (isAllowanceLoaded && needCollateralApproval && selectedCollateralToken) {
    return {
      text: t`Allow ${selectedCollateralToken?.assetSymbol ?? selectedCollateralToken?.symbol} to be spent`,
      tooltipContent: errorTooltipContent,
      disabled: false,
      relayerFeeParams: expressParams?.relayFeeParams,
      onSubmit,
    };
  }

  return {
    text: error || localizedOperationLabels[operation],
    tooltipContent: errorTooltipContent,
    disabled: Boolean(error) && !shouldDisableValidationForTesting,
    relayerFeeParams: expressParams?.relayFeeParams,
    onSubmit,
  };
}
