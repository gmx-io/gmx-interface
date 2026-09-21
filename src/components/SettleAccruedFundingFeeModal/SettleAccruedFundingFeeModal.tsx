import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  usePositiveFeePositionsSortedByUsd,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectGmxAccountGasPaymentToken,
  selectIsExpressTransactionAvailable,
  selectSettlementChainGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import {
  getExpressParamsForSubmit,
  reportMultichainExpressSubmitError,
} from "domain/synthetics/express/validateMultichainExpressSubmit";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateOrderOraclePriceCount,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { getNetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { getExpressError } from "domain/synthetics/trade/utils/validation";
import { getApproveButtonText, getGasPaymentTokenApprovalTooltip } from "domain/tokens/gasPaymentTokenApproval";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatUsd } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { getNativeToken, getToken } from "sdk/configs/tokens";
import { getIsConfirmedOutOfGasPaymentTokenBalance } from "sdk/utils/express";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { buildDecreaseOrderPayload, getBatchTotalExecutionFee } from "sdk/utils/orderTransactions";

import { useActiveForm } from "components/ActiveFormScope/ActiveFormScope";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ValidationBannerErrorContent } from "components/Errors/gasErrors";
import Modal from "components/Modal/Modal";
import { NetworkFeeRow } from "components/NetworkFeeRow/NetworkFeeRow";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";
import Tooltip from "components/Tooltip/Tooltip";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { SettleAccruedFundingFeeRow } from "./SettleAccruedFundingFeeRow";
import {
  SETTLEMENT_COLLATERAL_DELTA_AMOUNT,
  getIsPositionSettleable,
  getSettlementBlockReason,
  getShouldSwitchNetworkFeeSource,
  shouldPreSelectPosition,
} from "./utils";

import "./SettleAccruedFundingFeeModal.scss";

type Props = {
  allowedSlippage: number;
  isVisible: boolean;
  onClose: () => void;
};

export function SettleAccruedFundingFeeModal({ allowedSlippage, isVisible, onClose }: Props) {
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const { provider } = useJsonRpcProvider(chainId);
  const userReferralInfo = useUserReferralInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const [isUntouched, setIsUntouched] = useState(true);
  const hasOutdatedUi = useHasOutdatedUi();
  const settings = useSettings();
  const isExpressAvailable = useSelector(selectIsExpressTransactionAvailable);
  const walletGasPaymentToken = useSelector(selectSettlementChainGasPaymentToken);
  const gmxAccountGasPaymentToken = useSelector(selectGmxAccountGasPaymentToken);

  const canUseGmxAccountFeeSource = chainId === ARBITRUM && srcChainId === undefined && isExpressAvailable;
  const preferGmxAccount = canUseGmxAccountFeeSource && (settings.receiveToGmxAccount ?? false);
  const [switchedFromPreference, setSwitchedFromPreference] = useState<boolean | undefined>(undefined);
  const isFeeSourceSwitched = canUseGmxAccountFeeSource && switchedFromPreference === preferGmxAccount;
  const isGmxAccountFeeSource =
    srcChainId !== undefined || (canUseGmxAccountFeeSource && preferGmxAccount !== isFeeSourceSwitched);

  const { executionFee, gasLimit, feeUsd } = useMemo(() => {
    if (!gasLimits || !tokensData || gasPrice === undefined) return {};
    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      decreaseSwapType: DecreasePositionSwapType.NoSwap,
      swapsCount: 0,
    });
    const oraclePriceCount = estimateOrderOraclePriceCount(0);
    const fees = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
    return {
      gasLimit: fees?.gasLimit,
      executionFee: fees?.feeTokenAmount,
      feeUsd: fees?.feeUsd,
    };
  }, [chainId, gasLimits, gasPrice, tokensData]);

  const positiveFeePositions = usePositiveFeePositionsSortedByUsd();
  const { minCollateralUsd } = usePositionsConstants();
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

  const preCheckedPositionKeys = useMemo(() => {
    return positiveFeePositions
      .filter((position) => shouldPreSelectPosition(position, feeUsd ?? 0n, minCollateralUsd))
      .map((position) => position.key);
  }, [positiveFeePositions, feeUsd, minCollateralUsd]);

  const [positionKeys, setPositionKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isUntouched) return;
    setPositionKeys(preCheckedPositionKeys);
  }, [preCheckedPositionKeys, isUntouched]);

  const selectedPositions = useMemo(
    () =>
      positiveFeePositions.filter(
        (position) => positionKeys.includes(position.key) && getIsPositionSettleable(position, minCollateralUsd)
      ),
    [minCollateralUsd, positionKeys, positiveFeePositions]
  );
  const selectedPositionKeys = useMemo(() => selectedPositions.map((position) => position.key), [selectedPositions]);
  const total = useMemo(() => getTotalAccruedFundingUsd(selectedPositions), [selectedPositions]);
  const totalStr = formatDeltaUsd(total);

  const batchParams = useMemo(() => {
    if (!account || !chainId || executionFee === undefined || gasLimit === undefined || !signer) {
      return undefined;
    }

    return {
      createOrderParams: selectedPositions.map((position) =>
        buildDecreaseOrderPayload({
          chainId,
          receiver: signer?.address,
          marketAddress: position.marketAddress,
          indexTokenAddress: position.indexToken.address,
          collateralTokenAddress: position.collateralTokenAddress,
          collateralDeltaAmount: SETTLEMENT_COLLATERAL_DELTA_AMOUNT,
          receiveTokenAddress: position.collateralToken.address,
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: position.isLong ? 2n ** 256n - 1n : 0n,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          executionFeeAmount: executionFee,
          executionGasLimit: gasLimit,
          referralCode: userReferralInfo?.referralCodeForTxn,
          isLong: position.isLong,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
          allowedSlippage,
          autoCancel: false,
          swapPath: [],
          externalSwapQuote: undefined,
          minOutputUsd: 0n,
          validFromTime: 0n,
        })
      ),
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [
    account,
    chainId,
    executionFee,
    gasLimit,
    signer,
    selectedPositions,
    userReferralInfo?.referralCodeForTxn,
    allowedSlippage,
  ]);

  const totalExecutionFee = useMemo(() => {
    if (!batchParams || !tokensData || selectedPositions.length === 0) {
      return undefined;
    }

    return getBatchTotalExecutionFee({ batchParams, chainId, tokensData });
  }, [batchParams, chainId, selectedPositions.length, tokensData]);

  const { formId, isActiveForm } = useActiveForm();

  const {
    expressParams,
    expressParamsPromise,
    isMultichainSubmitDisabled,
    isLoading: isExpressLoading,
  } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "Settle Funding Fee",
    isGmxAccount: isGmxAccountFeeSource,
    canSwitchGasPaymentToken: isActiveForm,
  });

  const isSwitchPending = useMemo(
    () =>
      isVisible &&
      canUseGmxAccountFeeSource &&
      !isFeeSourceSwitched &&
      selectedPositions.length > 0 &&
      expressParams !== undefined &&
      getShouldSwitchNetworkFeeSource({ chainId, tokensData, expressParams }),
    [
      canUseGmxAccountFeeSource,
      chainId,
      expressParams,
      isFeeSourceSwitched,
      isVisible,
      selectedPositions.length,
      tokensData,
    ]
  );

  useEffect(() => {
    if (isSwitchPending) setSwitchedFromPreference(preferGmxAccount);
  }, [isSwitchPending, preferGmxAccount]);

  useEffect(() => {
    setSwitchedFromPreference(undefined);
  }, [account]);

  const expressError = useMemo(() => getExpressError({ expressParams, tokensData }), [expressParams, tokensData]);
  const isWalletOutOfGasPaymentToken =
    !isGmxAccountFeeSource && getIsConfirmedOutOfGasPaymentTokenBalance(expressParams?.gasPaymentValidations);
  const isWalletClassicFallback =
    !isSwitchPending && isWalletOutOfGasPaymentToken && expressError.buttonErrorMessage === undefined;

  const approvalTokens = useMemo(() => {
    if (!expressParams?.gasPaymentParams || isWalletOutOfGasPaymentToken) return [];

    return [
      {
        tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
      },
    ];
  }, [expressParams?.gasPaymentParams, isWalletOutOfGasPaymentToken]);

  const {
    tokensToApprove,
    isAllowanceLoaded: isAllowanceLoadedRaw,
    isApproving,
    handleApprove,
  } = useTokenApproval({
    chainId,
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokens: approvalTokens,
    allowPermit: Boolean(expressParams),
    skip: isGmxAccountFeeSource,
  });

  const isAllowanceLoaded = Boolean(batchParams) && isAllowanceLoadedRaw;

  const handleOnClose = useCallback(() => {
    setPositionKeys([]);
    setIsUntouched(true);
    setSwitchedFromPreference(undefined);
    onClose();
  }, [onClose, setPositionKeys, setIsUntouched]);

  useEffect(() => {
    if (!isVisible) setIsSubmitting(false);
  }, [isVisible]);

  const [buttonText, buttonDisabled, buttonTooltip] = useMemo((): [string, boolean, string?] => {
    if (hasOutdatedUi) return [getPageOutdatedError(), true];
    if (isExpressLoading || isMultichainSubmitDisabled || isSwitchPending) return [t`Loading network fees…`, true];
    if (isSubmitting) return [t`Settling...`, true];
    if (selectedPositions.length === 0) return [t`Select positions`, true];
    if (expressError.buttonErrorMessage) return [expressError.buttonErrorMessage, true];

    if (!isAllowanceLoaded) return [t`Loading...`, true];

    if (tokensToApprove.length) {
      const tokenSymbol = getToken(chainId, tokensToApprove[0]).symbol;
      return [
        getApproveButtonText({ tokenSymbol, isGasPaymentToken: true }),
        isApproving,
        getGasPaymentTokenApprovalTooltip(tokenSymbol),
      ];
    }

    return [t`Settle`, false];
  }, [
    hasOutdatedUi,
    isExpressLoading,
    isMultichainSubmitDisabled,
    isSwitchPending,
    isSubmitting,
    selectedPositions.length,
    expressError,
    isAllowanceLoaded,
    tokensToApprove,
    isApproving,
    chainId,
  ]);

  const handleRowCheckboxChange = useCallback(
    (value: boolean, positionKey: string) => {
      setIsUntouched(false);
      if (value) {
        setPositionKeys([...positionKeys, positionKey].filter((key, index, array) => array.indexOf(key) === index));
      } else {
        setPositionKeys(positionKeys.filter((key) => key !== positionKey));
      }
    },
    [positionKeys, setPositionKeys]
  );

  const onSubmit = useCallback(async () => {
    if (!account || !signer?.provider || !chainId || !batchParams || !provider || !tokensData) {
      return;
    }

    if (isAllowanceLoaded && tokensToApprove.length) {
      if (isApproving) return;

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

    setIsSubmitting(true);

    try {
      const fulfilledExpressParams = await expressParamsPromise;

      if (
        reportMultichainExpressSubmitError({
          isGmxAccount: isGmxAccountFeeSource,
          expressParams: fulfilledExpressParams,
          tokensData,
          actionName: "Settle Funding Fee",
        })
      ) {
        return;
      }

      await sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams: getExpressParamsForSubmit(fulfilledExpressParams),
        simulationParams: undefined,
        callback: makeOrderTxnCallback({
          metricId: undefined,
          slippageInputId: undefined,
          isFundingFeeSettlement: true,
          actionName: "Settle Funding Fee",
        }),
        provider,
        isGmxAccount: isGmxAccountFeeSource,
      });

      handleOnClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    account,
    batchParams,
    chainId,
    expressParamsPromise,
    handleApprove,
    handleOnClose,
    isAllowanceLoaded,
    isApproving,
    isGmxAccountFeeSource,
    makeOrderTxnCallback,
    provider,
    signer,
    tokensData,
    tokensToApprove,
  ]);

  const feeSourceExplanation = useMemo(() => {
    if (srcChainId !== undefined) return undefined;

    const walletGasTokenSymbol = walletGasPaymentToken?.symbol;
    const gmxAccountGasTokenSymbol = gmxAccountGasPaymentToken?.symbol;

    if (isWalletClassicFallback && walletGasTokenSymbol) {
      const nativeTokenSymbol = getNativeToken(chainId).symbol;
      return t`Paid in ${nativeTokenSymbol} from your Wallet because your Wallet does not have enough ${walletGasTokenSymbol} for Express.`;
    }

    if (isFeeSourceSwitched && isGmxAccountFeeSource && walletGasTokenSymbol) {
      return t`Paid from your GMX Account because your Wallet does not have enough ${walletGasTokenSymbol} for the fee.`;
    }

    if (isFeeSourceSwitched && !isGmxAccountFeeSource && gmxAccountGasTokenSymbol) {
      return t`Paid from your Wallet because your GMX Account does not have enough ${gmxAccountGasTokenSymbol} for the fee.`;
    }

    return undefined;
  }, [
    chainId,
    gmxAccountGasPaymentToken?.symbol,
    isFeeSourceSwitched,
    isGmxAccountFeeSource,
    isWalletClassicFallback,
    srcChainId,
    walletGasPaymentToken?.symbol,
  ]);

  const renderTooltipContent = useCallback(
    () => (
      <span className="text-typography-primary">
        <Trans>Accrued funding fees available for settlement</Trans>
      </span>
    ),
    []
  );

  return (
    <Modal
      activeFormId={formId}
      className="Confirmation-box ClaimableModal"
      isVisible={isVisible}
      setIsVisible={handleOnClose}
      label={t`Confirm settle`}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>Settle {totalStr}</Trans>
        </div>
      </div>
      <div className="mb-20 mt-15 h-1 bg-slate-700" />
      <div className="ClaimModal-content ClaimSettleModal-modal-content">
        <div className="App-card-content">
          <div className="ClaimSettleModal-header">
            <div className="ClaimSettleModal-header-left">
              <Trans>POSITION</Trans>
            </div>
            <div className="ClaimSettleModal-header-right">
              <Tooltip
                className="ClaimSettleModal-tooltip"
                position="top-end"
                handle={<Trans>FUNDING FEE</Trans>}
                renderContent={renderTooltipContent}
              />
            </div>
          </div>
          {positiveFeePositions.map((position) => (
            <SettleAccruedFundingFeeRow
              key={position.key}
              position={position}
              isMarketDisabled={position.marketInfo?.isDisabled ?? false}
              blockReason={getSettlementBlockReason(position, minCollateralUsd)}
              isSelected={selectedPositionKeys.includes(position.key)}
              onCheckboxChange={handleRowCheckboxChange}
            />
          ))}
        </div>
      </div>
      <div className="mb-15">
        <NetworkFeeRow
          executionFee={isExpressLoading || isSwitchPending ? undefined : totalExecutionFee}
          gasPaymentParams={
            selectedPositions.length > 0 && !isWalletClassicFallback && !isSwitchPending
              ? expressParams?.gasPaymentParams
              : undefined
          }
          feeSource={getNetworkFeeSource({ isGmxAccount: isGmxAccountFeeSource })}
          feeSourceExplanation={feeSourceExplanation}
        />
      </div>
      <AlertInfo type="info" compact>
        <Trans>Select positions where accrued funding fee exceeds the {formatUsd(feeUsd)} gas cost to settle</Trans>
      </AlertInfo>
      {expressError.bannerErrorName && !isSwitchPending && (
        <AlertInfoCard type="error" hideClose>
          <ValidationBannerErrorContent
            validationBannerErrorName={expressError.bannerErrorName}
            chainId={chainId}
            srcChainId={srcChainId}
            gasPaymentTokenAddress={expressParams?.gasPaymentParams.gasPaymentTokenAddress}
            onBeforeNavigation={handleOnClose}
          />
        </AlertInfoCard>
      )}
      <ButtonTooltipWrapper content={buttonTooltip} isHandlerDisabled={buttonDisabled}>
        <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={onSubmit}>
          {buttonText}
          {isApproving && tokensToApprove.length > 0 && <SpinnerIcon className="ml-4 animate-spin" />}
        </Button>
      </ButtonTooltipWrapper>
    </Modal>
  );
}
