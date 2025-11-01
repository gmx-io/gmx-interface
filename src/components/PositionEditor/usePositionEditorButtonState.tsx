import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

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
  selectGasPaymentTokenAllowance,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorIsCollateralTokenFromGmxAccount,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSelectedCollateralToken,
  selectPositionEditorSetCollateralInputValue,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { selectTokenPermits } from "context/SyntheticsStateContext/selectors/tokenPermitsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { ExpressTxnParams } from "domain/synthetics/express/types";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  getIsPositionInfoLoaded,
  substractMaxLeverageSlippage,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { convertToTokenAmount, getApprovalRequirements, useTokensAllowanceData } from "domain/synthetics/tokens";
import { getMarkPrice, getMinCollateralUsdForLeverage } from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError, getExpressError } from "domain/synthetics/trade/utils/validation";
import { useApproveToken } from "domain/tokens/useApproveTokens";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import {
  initEditCollateralMetricData,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { expandDecimals, formatAmountFree } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import {
  BatchOrderTxnParams,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  IncreasePositionOrderParams,
  buildDecreaseOrderPayload,
  buildIncreaseOrderPayload,
} from "sdk/utils/orderTransactions";

import ExternalLink from "components/ExternalLink/ExternalLink";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { OPERATION_LABELS, Operation } from "./types";

export function usePositionEditorButtonState(operation: Operation): {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => void;
  expressParams: ExpressTxnParams | undefined;
  isExpressLoading: boolean;
} {
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const allowedSlippage = useSavedAllowedSlippage();
  const { chainId, srcChainId } = useChainId();
  const { shouldDisableValidationForTesting } = useSettings();
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const { openConnectModal } = useConnectModal();
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { minCollateralUsd } = usePositionsConstants();
  const userReferralInfo = useUserReferralInfo();
  const hasOutdatedUi = useHasOutdatedUi();
  const position = usePositionEditorPosition();
  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const selectedCollateralAddress = useSelector(selectPositionEditorSelectedCollateralAddress);
  const isCollateralTokenFromGmxAccount = useSelector(selectPositionEditorIsCollateralTokenFromGmxAccount);
  const selectedCollateralToken = useSelector(selectPositionEditorSelectedCollateralToken);
  const setCollateralInputValue = useSelector(selectPositionEditorSetCollateralInputValue);
  const { collateralDeltaAmount, collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const collateralTokenAllowance = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: position ? [position.collateralTokenAddress] : [],
  });

  const gasPaymentTokenAllowance = useSelector(selectGasPaymentTokenAllowance);
  const tokenPermits = useSelector(selectTokenPermits);

  const isDeposit = operation === Operation.Deposit;

  const { executionFee } = usePositionEditorFees({
    operation,
  });

  const { nextLeverage, nextLiqPrice, receiveUsd } = usePositionEditorData({
    operation,
  });

  const minCollateralFactor = usePositionEditorMinCollateralFactor();

  const collateralPrice = selectedCollateralToken?.prices.minPrice;

  const markPrice = position
    ? getMarkPrice({
        prices: position.indexToken.prices,
        isLong: position.isLong,
        isIncrease: isDeposit,
      })
    : undefined;

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
        validFromTime: 0n,
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
        validFromTime: 0n,
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

  const {
    expressParams,
    isLoading: isExpressLoading,
    fastExpressParams,
    asyncExpressParams,
    expressParamsPromise,
  } = useExpressOrdersParams({
    label: "Position Editor",
    orderParams: batchParams,
    isGmxAccount: isCollateralTokenFromGmxAccount,
  });

  const { tokensToApprove, isAllowanceLoaded } = useMemo(() => {
    if (isCollateralTokenFromGmxAccount) {
      return { tokensToApprove: [], isAllowanceLoaded: true };
    }

    if (!selectedCollateralAddress || collateralDeltaAmount === undefined) {
      return { tokensToApprove: [], isAllowanceLoaded: false };
    }

    const approvalRequirements = getApprovalRequirements({
      chainId,
      payTokenParamsList: [
        {
          tokenAddress: selectedCollateralAddress,
          amount: collateralDeltaAmount,
          allowanceData: collateralTokenAllowance.tokensAllowanceData,
          isAllowanceLoaded: collateralTokenAllowance.isLoaded,
        },
      ],
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
    isCollateralTokenFromGmxAccount,
    selectedCollateralAddress,
    collateralDeltaAmount,
    chainId,
    collateralTokenAllowance.tokensAllowanceData,
    collateralTokenAllowance.isLoaded,
    expressParams,
    gasPaymentTokenAllowance?.tokensAllowanceData,
    gasPaymentTokenAllowance?.isLoaded,
    tokenPermits,
  ]);

  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove.length]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBalancesLoading = selectedCollateralToken?.balance === undefined;

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

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

    const expressError = getExpressError({
      chainId,
      expressParams,
      tokensData,
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

    const error = commonError[0] || editCollateralError[0] || expressError[0];
    const tooltipName = commonError[1] || editCollateralError[1] || expressError[1];

    if (error) {
      return [error, tooltipName];
    }

    if (isSubmitting) {
      return [t`Creating order...`];
    }

    return [];
  }, [
    chainId,
    account,
    hasOutdatedUi,
    expressParams,
    tokensData,
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    selectedCollateralToken,
    minCollateralFactor,
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

  const { approveToken } = useApproveToken();

  async function onSubmit() {
    if (!account || !signer) {
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length && selectedCollateralToken) {
      if (!chainId || isApproving) return;

      approveToken({
        setIsApproving,
        tokenAddress: tokensToApprove[0].tokenAddress,
        chainId,
        signer,
        allowPermit: Boolean(expressParams),
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
      isExpress: Boolean(expressParams),
      orderType,
      isLong: position?.isLong,
      expressParams,
      asyncExpressParams,
      fastExpressParams,
      chainId: srcChainId ?? chainId,
      isCollateralFromMultichain: isCollateralTokenFromGmxAccount,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (!batchParams || !tokensData || !signer || !provider) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    const fulfilledExpressParams = await expressParamsPromise;

    const txnPromise = sendBatchOrderTxn({
      chainId,
      signer,
      provider,
      batchParams,
      expressParams:
        fulfilledExpressParams && getIsValidExpressParams(fulfilledExpressParams) ? fulfilledExpressParams : undefined,
      isGmxAccount: isCollateralTokenFromGmxAccount,
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

  const commonParams = {
    expressParams,
    isExpressLoading,
    onSubmit,
  };

  if (isApproving && tokensToApprove.length) {
    const tokenToApprove = tokensToApprove[0];
    return {
      text: (
        <>
          {t`Allow ${getToken(chainId, tokenToApprove.tokenAddress).symbol} to be spent`}{" "}
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      tooltipContent: errorTooltipContent,
      disabled: true,
      ...commonParams,
    };
  }

  if (isExpressLoading) {
    return {
      text: (
        <>
          {t`Loading Express params`}
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      tooltipContent: errorTooltipContent,
      disabled: true,
      ...commonParams,
    };
  }

  if (!isAllowanceLoaded || isBalancesLoading) {
    return {
      text: (
        <>
          {t`Loading...`}
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      tooltipContent: errorTooltipContent,
      disabled: true,
      ...commonParams,
    };
  }

  if (isAllowanceLoaded && tokensToApprove.length && selectedCollateralToken) {
    const tokenToApprove = tokensToApprove[0];
    return {
      text: t`Allow ${getToken(chainId, tokenToApprove.tokenAddress).symbol} to be spent`,
      tooltipContent: errorTooltipContent,
      disabled: false,
      ...commonParams,
    };
  }

  return {
    text: error || localizedOperationLabels[operation],
    tooltipContent: errorTooltipContent,
    disabled: Boolean(error) && !shouldDisableValidationForTesting,
    ...commonParams,
  };
}
