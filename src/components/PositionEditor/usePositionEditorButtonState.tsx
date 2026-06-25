import { Trans, t } from "@lingui/macro";
import { ReactNode, useCallback, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
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
  selectPositionEditorIsCollateralTokenFromGmxAccount,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSelectedCollateralToken,
  selectPositionEditorSetCollateralInputValue,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express/types";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import {
  getExpressParamsForSubmit,
  reportMultichainExpressSubmitError,
} from "domain/synthetics/express/validateMultichainExpressSubmit";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  addMinDepositSlippage,
  getIsPositionInfoLoaded,
  substractMaxLeverageSlippage,
  willPositionCollateralBeSufficientForPosition,
} from "domain/synthetics/positions";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { getMarkPrice, getMaxWithdrawAmount, getMinRequiredCollateralUsdForPosition } from "domain/synthetics/trade";
import {
  getCommonError,
  getEditCollateralError,
  getExpressError,
  takeValidationResult,
  ValidationBannerErrorName,
  ValidationButtonTooltipName,
  ValidationResult,
} from "domain/synthetics/trade/utils/validation";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { bigNumberBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
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
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
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

import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { OPERATION_LABELS, Operation } from "./types";

type PositionEditorButtonState = {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  errorBannerContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => void;
  expressParams: ExpressTxnParams | undefined;
  isExpressLoading: boolean;
  bannerErrorName: ValidationBannerErrorName | undefined;
};

export function usePositionEditorButtonState(operation: Operation): PositionEditorButtonState {
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
  const multipleWalletExtensionsChainError = useMultipleWalletExtensionsChainError();
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
    isMultichainSubmitDisabled,
    fastExpressParams,
    asyncExpressParams,
    expressParamsPromise,
  } = useExpressOrdersParams({
    label: "Position Editor",
    orderParams: batchParams,
    isGmxAccount: isCollateralTokenFromGmxAccount,
  });

  const approvalTokens = useMemo(() => {
    const list: { tokenAddress: string; amount: bigint | undefined }[] = [];

    if (selectedCollateralAddress && collateralDeltaAmount !== undefined) {
      list.push({ tokenAddress: selectedCollateralAddress, amount: collateralDeltaAmount });
    }

    if (expressParams?.gasPaymentParams) {
      list.push({
        tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
      });
    }

    return list;
  }, [selectedCollateralAddress, collateralDeltaAmount, expressParams?.gasPaymentParams]);

  const {
    tokensToApprove,
    isAllowanceLoaded: isAllowanceLoadedRaw,
    isApproving,
    handleApprove,
  } = useTokenApproval({
    chainId,
    spenderAddress: routerAddress,
    tokens: approvalTokens,
    allowPermit: Boolean(expressParams),
    skip: isCollateralTokenFromGmxAccount,
  });

  const isAllowanceLoaded =
    Boolean(selectedCollateralAddress && collateralDeltaAmount !== undefined) && isAllowanceLoadedRaw;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBalancesLoading = selectedCollateralToken?.balance === undefined;

  const onClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, [setEditingPositionKey]);

  const maxWithdrawAmount = useMemo(() => {
    if (!getIsPositionInfoLoaded(position)) return 0n;

    return getMaxWithdrawAmount({
      position,
      minCollateralUsd,
      collateralPrice,
      collateralDecimals: selectedCollateralToken?.decimals,
      userReferralInfo,
    });
  }, [collateralPrice, selectedCollateralToken?.decimals, minCollateralUsd, position, userReferralInfo]);

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

  const minDepositUsd = useMemo(() => {
    if (!isDeposit || !getIsPositionInfoLoaded(position) || minCollateralUsd === undefined) {
      return undefined;
    }

    const minRequiredCollateralUsd = getMinRequiredCollateralUsdForPosition({
      position,
      minCollateralUsd,
      userReferralInfo,
    });

    const requiredDepositUsd = minRequiredCollateralUsd - position.collateralUsd;

    return requiredDepositUsd > 0 ? requiredDepositUsd : undefined;
  }, [isDeposit, minCollateralUsd, position, userReferralInfo]);

  const setMinDepositValue = useCallback(() => {
    if (minDepositUsd === undefined || !selectedCollateralToken) return;

    const minDepositAmount = convertToTokenAmount(
      addMinDepositSlippage(minDepositUsd),
      selectedCollateralToken.decimals,
      selectedCollateralToken.prices.minPrice
    );

    if (minDepositAmount === undefined) return;

    setCollateralInputValue(formatAmountFree(minDepositAmount, selectedCollateralToken.decimals));
  }, [minDepositUsd, selectedCollateralToken, setCollateralInputValue]);

  const validationResult: ValidationResult = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const expressError = getExpressError({
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
      minDepositUsd,
      marketInfo: position?.marketInfo,
      maxWithdrawAmount,
    });

    return takeValidationResult(commonError, multipleWalletExtensionsChainError, editCollateralError, expressError);
  }, [
    chainId,
    account,
    hasOutdatedUi,
    multipleWalletExtensionsChainError,
    expressParams,
    tokensData,
    collateralDeltaAmount,
    collateralDeltaUsd,
    nextLeverage,
    nextLiqPrice,
    isDeposit,
    position,
    selectedCollateralToken,
    minDepositUsd,
    maxWithdrawAmount,
  ]);

  const errorTooltipContent = useMemo(() => {
    if (validationResult.buttonTooltipMessage) {
      return validationResult.buttonTooltipMessage;
    }

    if (validationResult.buttonTooltipName !== ValidationButtonTooltipName.maxLeverage) {
      return null;
    }

    return (
      <Trans>
        Reduce withdrawal to match the max.{" "}
        <ExternalLink href="https://docs.gmx.io/docs/trading/order-types/#max-leverage">Read more</ExternalLink>.
        <br />
        <br />
        <span onClick={detectAndSetMaxSize} className="Tradebox-handle">
          <Trans>Set max withdrawal</Trans>
        </span>
      </Trans>
    );
  }, [detectAndSetMaxSize, validationResult.buttonTooltipMessage, validationResult.buttonTooltipName]);

  const errorBannerContent = useMemo(() => {
    if (validationResult.buttonTooltipName !== ValidationButtonTooltipName.minDeposit) {
      return null;
    }

    return (
      <div>
        <Trans>
          Accrued borrow and funding fees are deducted from the deposit before it improves the position's margin, so the
          deposit must also cover them.
        </Trans>
        <ColorfulButtonLink color="red" onClick={setMinDepositValue}>
          <Trans>Set min deposit</Trans>
        </ColorfulButtonLink>
      </div>
    );
  }, [setMinDepositValue, validationResult.buttonTooltipName]);

  async function onSubmit() {
    if (!account || !signer) {
      openConnectModal?.();
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length && selectedCollateralToken) {
      if (!chainId || isApproving) return;

      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: { action: "ApproveClick" },
      });
      handleApprove({
        onApproveFail: () =>
          userAnalytics.pushEvent<TokenApproveResultEvent>({
            event: "TokenApproveAction",
            data: { action: "ApproveFail" },
          }),
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
      helperToast.error(t`Order failed`, {
        tradingErrorInfo: {
          actionName: "Edit Collateral",
          collateral: selectedCollateralToken?.symbol,
          requestId: metricData.requestId,
        },
      });
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    setIsSubmitting(true);

    const fulfilledExpressParams = await expressParamsPromise;

    if (
      reportMultichainExpressSubmitError({
        isGmxAccount: isCollateralTokenFromGmxAccount,
        expressParams: fulfilledExpressParams,
        tokensData,
        actionName: "Edit Collateral",
        collateral: selectedCollateralToken?.symbol,
        requestId: metricData.requestId,
        metricId: metricData.metricId,
      })
    ) {
      setIsSubmitting(false);
      return;
    }

    const txnPromise = sendBatchOrderTxn({
      chainId,
      signer,
      provider,
      batchParams,
      expressParams: getExpressParamsForSubmit(fulfilledExpressParams),
      isGmxAccount: isCollateralTokenFromGmxAccount,
      simulationParams: shouldDisableValidationForTesting
        ? undefined
        : {
            tokensData,
            blockTimestampData,
          },
      callback: makeOrderTxnCallback({
        metricId: metricData.metricId,
        requestId: metricData.requestId,
        slippageInputId: undefined,
        actionName: "Edit Collateral",
        collateralSymbol: selectedCollateralToken?.symbol,
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

  const commonParams: Pick<
    PositionEditorButtonState,
    "expressParams" | "isExpressLoading" | "onSubmit" | "tooltipContent" | "errorBannerContent" | "bannerErrorName"
  > = {
    expressParams,
    isExpressLoading,
    onSubmit,
    tooltipContent: errorTooltipContent,
    errorBannerContent,
    bannerErrorName: validationResult.bannerErrorName,
  };

  if (multipleWalletExtensionsChainError.buttonErrorMessage) {
    return {
      text: multipleWalletExtensionsChainError.buttonErrorMessage,
      disabled: true,
      ...commonParams,
    };
  }

  if (isApproving && tokensToApprove.length) {
    const tokenToApprove = tokensToApprove[0];
    return {
      text: (
        <>
          {t`Approve ${getToken(chainId, tokenToApprove).symbol}`} <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
      ...commonParams,
    };
  }

  if (isExpressLoading || isMultichainSubmitDisabled) {
    return {
      text: (
        <>
          {t`Loading Express Trading params...`}
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
      disabled: true,
      ...commonParams,
    };
  }

  if (isSubmitting) {
    return {
      text: (
        <>
          <Trans>Creating order...</Trans>
          <SpinnerIcon className="ml-4 animate-spin" />
        </>
      ),
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
      disabled: true,
      ...commonParams,
    };
  }

  if (isAllowanceLoaded && tokensToApprove.length && selectedCollateralToken) {
    const tokenToApprove = tokensToApprove[0];
    return {
      text: t`Approve ${getToken(chainId, tokenToApprove).symbol}`,
      disabled: false,
      ...commonParams,
    };
  }

  return {
    text: validationResult.buttonErrorMessage || localizedOperationLabels[operation],
    disabled: Boolean(validationResult.buttonErrorMessage) && !shouldDisableValidationForTesting,
    ...commonParams,
  };
}
