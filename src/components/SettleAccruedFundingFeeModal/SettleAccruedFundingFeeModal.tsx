import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import {
  usePositiveFeePositionsSortedByUsd,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
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
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatUsd } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { getContract } from "sdk/configs/contracts";
import { getToken } from "sdk/configs/tokens";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { SettleAccruedFundingFeeRow } from "./SettleAccruedFundingFeeRow";
import { getIsSettlementLikelyToFail, shouldPreSelectPosition } from "./utils";

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
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

  const preCheckedPositionKeys = useMemo(() => {
    return positiveFeePositions
      .filter((position) => shouldPreSelectPosition(position, feeUsd ?? 0n))
      .map((position) => position.key);
  }, [positiveFeePositions, feeUsd]);

  const [positionKeys, setPositionKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isUntouched) return;
    setPositionKeys(preCheckedPositionKeys);
  }, [preCheckedPositionKeys, isUntouched]);

  const selectedPositions = useMemo(
    () => positiveFeePositions.filter((position) => positionKeys.includes(position.key)),
    [positionKeys, positiveFeePositions]
  );
  const hasSelectedPositionsLikelyToFail = useMemo(
    () => selectedPositions.some(getIsSettlementLikelyToFail),
    [selectedPositions]
  );
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
          collateralDeltaAmount: 1n,
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

  const { expressParams, expressParamsPromise, isMultichainSubmitDisabled } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "Settle Funding Fee",
    isGmxAccount: srcChainId !== undefined,
  });

  const approvalTokens = useMemo(() => {
    if (!expressParams?.gasPaymentParams) return [];

    return [
      {
        tokenAddress: expressParams.gasPaymentParams.gasPaymentTokenAddress,
        amount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
      },
    ];
  }, [expressParams?.gasPaymentParams]);

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
    skip: Boolean(srcChainId),
  });

  const isAllowanceLoaded = Boolean(batchParams) && isAllowanceLoadedRaw;

  const handleOnClose = useCallback(() => {
    setPositionKeys([]);
    setIsUntouched(true);
    onClose();
  }, [onClose, setPositionKeys, setIsUntouched]);

  useEffect(() => {
    if (!isVisible) setIsSubmitting(false);
  }, [isVisible]);

  const [buttonText, buttonDisabled] = useMemo(() => {
    if (hasOutdatedUi) return [getPageOutdatedError(), true];
    if (isMultichainSubmitDisabled) return [t`Loading network fees…`, true];
    if (isSubmitting) return [t`Settling...`, true];
    if (positionKeys.length === 0) return [t`Select positions`, true];

    if (!isAllowanceLoaded) return [t`Loading...`, true];

    if (tokensToApprove.length) {
      const tokenSymbol = getToken(chainId, tokensToApprove[0]).symbol;
      return [t`Approve ${tokenSymbol}`, isApproving];
    }

    return [t`Settle`, false];
  }, [
    hasOutdatedUi,
    isMultichainSubmitDisabled,
    isSubmitting,
    positionKeys.length,
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
      const isGmxAccount = srcChainId !== undefined;

      if (
        reportMultichainExpressSubmitError({
          isGmxAccount,
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
        isGmxAccount,
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
    makeOrderTxnCallback,
    provider,
    signer,
    srcChainId,
    tokensData,
    tokensToApprove,
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
              isSettlementLikelyToFail={getIsSettlementLikelyToFail(position)}
              isSelected={positionKeys.includes(position.key)}
              onCheckboxChange={handleRowCheckboxChange}
            />
          ))}
        </div>
      </div>
      {hasSelectedPositionsLikelyToFail && (
        <AlertInfo type="warning" compact textColor="text-yellow-300">
          <Trans>
            Some selected positions have a negative margin after pending borrow and funding fees, so their settlement is
            likely to fail: positive funding only becomes claimable after a successful settlement. Add margin, or reduce
            or close enough of those positions for the realized profit to cover the shortfall.
          </Trans>
        </AlertInfo>
      )}
      <AlertInfo type="info" compact>
        <Trans>Select positions where accrued funding fee exceeds the {formatUsd(feeUsd)} gas cost to settle</Trans>
      </AlertInfo>
      <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={onSubmit}>
        {buttonText}
        {isApproving && tokensToApprove.length > 0 && <SpinnerIcon className="ml-4 animate-spin" />}
      </Button>
    </Modal>
  );
}
