import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  usePositiveFeePositions,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { createDecreaseOrderTxn, DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

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
  setPendingTxns: (txns: any) => void;
};

export function SettleAccruedFundingFeeModal({ allowedSlippage, isVisible, onClose, setPendingTxns }: Props) {
  const tokensData = useTokensData();
  const { account, signer } = useWallet();
  const { chainId } = useChainId();
  const userReferralInfo = useUserReferralInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const [pristine, setPristine] = useState(true);

  const { executionFee, feeUsd } = useMemo(() => {
    if (!gasLimits || !tokensData || gasPrice === undefined) return {};
    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    const fees = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
    return {
      executionFee: fees?.feeTokenAmount,
      feeUsd: fees?.feeUsd,
    };
  }, [chainId, gasLimits, gasPrice, tokensData]);

  const positiveFeePositions = usePositiveFeePositions();

  const preCheckedPositionKeys = useMemo(() => {
    return positiveFeePositions
      .filter((position) => shouldPreSelectPosition(position, feeUsd ?? 0n))
      .map((position) => position.key);
  }, [positiveFeePositions, feeUsd]);

  const [positionKeys, setPositionKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!pristine) return;
    setPositionKeys(preCheckedPositionKeys);
  }, [preCheckedPositionKeys, pristine]);

  const selectedPositions = useMemo(
    () => positiveFeePositions.filter((position) => positionKeys.includes(position.key)),
    [positionKeys, positiveFeePositions]
  );
  const total = useMemo(() => getTotalAccruedFundingUsd(selectedPositions), [selectedPositions]);
  const totalStr = formatDeltaUsd(total);

  const handleOnClose = useCallback(() => {
    setPositionKeys([]);
    setPristine(true);
    onClose();
  }, [onClose, setPositionKeys, setPristine]);

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
      setPristine(false);
      if (value) {
        setPositionKeys([...positionKeys, positionKey].filter((key, index, array) => array.indexOf(key) === index));
      } else {
        setPositionKeys(positionKeys.filter((key) => key !== positionKey));
      }
    },
    [positionKeys, setPositionKeys]
  );

  const { setPendingFundingFeeSettlement } = useSyntheticsEvents();

  const onSubmit = useCallback(() => {
    if (!account || !signer || !chainId || executionFee === undefined || !tokensData) return;

    setIsSubmitting(true);

    createDecreaseOrderTxn(
      chainId,
      signer,
      null, // Decided don't use subaccount for this action
      selectedPositions.map((position) => {
        return {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: position.collateralTokenAddress,
          initialCollateralDeltaAmount: BigInt(1),
          receiveTokenAddress: position.collateralToken.address,
          swapPath: [],
          sizeDeltaUsd: 0n,
          sizeDeltaInTokens: 0n,
          acceptablePrice: position.isLong ? 2n ** 256n - 1n : 0n,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          isLong: position.isLong,
          minOutputUsd: 0n,
          executionFee,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: true,
        };
      }),
      {
        setPendingTxns,
        setPendingFundingFeeSettlement,
      }
    )
      .then(handleOnClose)
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    account,
    allowedSlippage,
    chainId,
    executionFee,
    handleOnClose,
    selectedPositions,
    setPendingFundingFeeSettlement,
    setPendingTxns,
    signer,
    tokensData,
    userReferralInfo?.referralCodeForTxn,
  ]);

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
