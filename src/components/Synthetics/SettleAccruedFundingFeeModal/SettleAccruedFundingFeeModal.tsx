import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import {
  usePositiveFeePositionsSortedByUsd,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectExpressNoncesData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
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
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import { buildDecreaseOrderPayload } from "sdk/utils/orderTransactions";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import { SettleAccruedFundingFeeRow } from "./SettleAccruedFundingFeeRow";
import { shouldPreSelectPosition } from "./utils";

import "./SettleAccruedFundingFeeModal.scss";

type Props = {
  allowedSlippage: number;
  isVisible: boolean;
  onClose: () => void;
};

export function SettleAccruedFundingFeeModal({ allowedSlippage, isVisible, onClose }: Props) {
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { chainId } = useChainId();
  const userReferralInfo = useUserReferralInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const [isUntouched, setIsUntouched] = useState(true);
  const noncesData = useSelector(selectExpressNoncesData);

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

  const { expressParams } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "Settle Funding Fee",
  });

  const handleOnClose = useCallback(() => {
    setPositionKeys([]);
    setIsUntouched(true);
    onClose();
  }, [onClose, setPositionKeys, setIsUntouched]);

  useEffect(() => {
    if (!isVisible) setIsSubmitting(false);
  }, [isVisible]);

  const [buttonText, buttonDisabled] = useMemo(() => {
    if (isSubmitting) return [t`Settling...`, true];
    if (positionKeys.length === 0) return [t`Select Positions`, true];
    return [t`Settle`, false];
  }, [isSubmitting, positionKeys.length]);

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

  const onSubmit = useCallback(() => {
    if (!account || !signer?.provider || !chainId || !batchParams) {
      return;
    }

    setIsSubmitting(true);

    sendBatchOrderTxn({
      chainId,
      signer,
      batchParams,
      expressParams,
      noncesData,
      simulationParams: undefined,
      callback: makeOrderTxnCallback({
        metricId: undefined,
        slippageInputId: undefined,
        isFundingFeeSettlement: true,
      }),
    })
      .then(handleOnClose)
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [account, batchParams, chainId, expressParams, handleOnClose, makeOrderTxnCallback, noncesData, signer]);

  const renderTooltipContent = useCallback(
    () => (
      <span className="text-white">
        <Trans>Accrued Funding Fee.</Trans>
      </span>
    ),
    []
  );

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={isVisible}
      setIsVisible={handleOnClose}
      label={t`Confirm Settle`}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">Settle {totalStr}</div>
      </div>
      <div className="App-card-divider ClaimModal-divider FeeModal-divider ClaimSettleModal-divider" />
      <div className="ClaimModal-content ClaimSettleModal-modal-content">
        <div className="App-card-content">
          <AlertInfo type="warning" compact>
            <Trans>
              Consider selecting only positions where the accrued funding fee exceeds the {formatUsd(feeUsd)} gas cost
              to settle each position.
            </Trans>
          </AlertInfo>

          <div className="App-card-divider" />
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
              isSelected={positionKeys.includes(position.key)}
              onCheckboxChange={handleRowCheckboxChange}
            />
          ))}
        </div>
      </div>
      <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={onSubmit}>
        {buttonText}
      </Button>
    </Modal>
  );
}
