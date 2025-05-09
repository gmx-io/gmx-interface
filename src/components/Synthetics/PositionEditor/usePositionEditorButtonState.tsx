import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ImSpinner2 } from "react-icons/im";

import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
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
import { selectBlockTimestampData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorSelectedCollateralAddress,
  selectPositionEditorSelectedCollateralToken,
  selectPositionEditorSetCollateralInputValue,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
} from "domain/synthetics/orders";
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
  makeTxnErrorMetricsHandler,
  makeTxnSentMetricsHandler,
  sendOrderSubmittedMetric,
  sendTxnValidationErrorMetric,
} from "lib/metrics/utils";
import { expandDecimals, formatAmountFree } from "lib/numbers";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getWrappedToken } from "sdk/configs/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { usePositionEditorFees } from "./hooks/usePositionEditorFees";
import { OPERATION_LABELS, Operation } from "./types";

export function usePositionEditorButtonState(operation: Operation): {
  text: ReactNode;
  tooltipContent: ReactNode | null;
  disabled: boolean;
  onSubmit: () => void;
} {
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const { setPendingTxns } = usePendingTxns();
  const allowedSlippage = useSavedAllowedSlippage();
  const { chainId } = useChainId();
  const { shouldDisableValidationForTesting } = useSettings();
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
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

  const subaccount = useSubaccount(executionFee?.feeTokenAmount ?? null);

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
      subaccount,
      orderType,
      isLong: position?.isLong,
    });

    sendOrderSubmittedMetric(metricData.metricId);

    if (
      executionFee?.feeTokenAmount === undefined ||
      !tokensData ||
      markPrice === undefined ||
      !position?.indexToken ||
      collateralDeltaAmount === undefined ||
      !selectedCollateralAddress ||
      !signer
    ) {
      helperToast.error(t`Error submitting order`);
      sendTxnValidationErrorMetric(metricData.metricId);
      return;
    }

    let txnPromise: Promise<void>;

    if (isDeposit) {
      setIsSubmitting(true);

      txnPromise = createIncreaseOrderTxn({
        chainId,
        signer,
        subaccount,
        metricId: metricData.metricId,
        blockTimestampData,
        createIncreaseOrderParams: {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: selectedCollateralAddress,
          initialCollateralAmount: collateralDeltaAmount,
          targetCollateralAddress: position.collateralTokenAddress,
          collateralDeltaAmount,
          swapPath: [],
          externalSwapQuote: undefined,
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: markPrice,
          triggerPrice: undefined,
          orderType: OrderType.MarketIncrease,
          isLong: position.isLong,
          executionFee: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: shouldDisableValidationForTesting,
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
          slippageInputId: undefined,
        },
      });
    } else {
      if (receiveUsd === undefined) {
        return;
      }

      setIsSubmitting(true);

      txnPromise = createDecreaseOrderTxn(
        chainId,
        signer,
        subaccount,
        {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: position.collateralTokenAddress,
          initialCollateralDeltaAmount: collateralDeltaAmount,
          receiveTokenAddress: selectedCollateralAddress,
          swapPath: [],
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: markPrice,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          isLong: position.isLong,
          minOutputUsd: receiveUsd,
          executionFee: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: shouldDisableValidationForTesting,
          autoCancel: false,
          slippageInputId: undefined,
          isTwap: false,
        },
        {
          setPendingTxns,
          setPendingOrder,
          setPendingPosition,
        },
        blockTimestampData,
        metricData.metricId
      );
    }

    if (subaccount) {
      onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise = txnPromise
      .then(makeTxnSentMetricsHandler(metricData.metricId))
      .catch(makeTxnErrorMetricsHandler(metricData.metricId));

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
      onSubmit,
    };
  }

  if (isAllowanceLoaded && needCollateralApproval && selectedCollateralToken) {
    return {
      text: t`Allow ${selectedCollateralToken?.assetSymbol ?? selectedCollateralToken?.symbol} to be spent`,
      tooltipContent: errorTooltipContent,
      disabled: false,
      onSubmit,
    };
  }

  return {
    text: error || localizedOperationLabels[operation],
    tooltipContent: errorTooltipContent,
    disabled: Boolean(error) && !shouldDisableValidationForTesting,
    onSubmit,
  };
}
