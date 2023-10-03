import { t, Trans } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import { formatDeltaUsd } from "lib/numbers";

import Button from "components/Button/Button";
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SettleAccruedFundingFeeRow } from "./SettleAccruedFundingFeeRow";

import Tooltip from "components/Tooltip/Tooltip";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralInfo } from "domain/referrals";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { createDecreaseOrderTxn, DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { TokensData } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import "./SettleAccruedFundingFeeModal.scss";

type Props = {
  allowedSlippage: number;
  isVisible: boolean;
  onClose: () => void;
  positionKeys: string[];
  positionsInfoData: PositionsInfoData | undefined;
  setPositionKeys: (keys: string[]) => void;
  tokensData?: TokensData;
  setPendingTxns: (txns: any) => void;
};

export function SettleAccruedFundingFeeModal({
  allowedSlippage,
  tokensData,
  isVisible,
  onClose,
  positionKeys,
  setPositionKeys,
  positionsInfoData,
  setPendingTxns,
}: Props) {
  const { account, signer } = useWallet();
  const { chainId } = useChainId();
  const userReferralInfo = useUserReferralInfo(signer, chainId, account);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { gasLimits } = useGasLimits(chainId);
  const { gasPrice } = useGasPrice(chainId);

  const positiveFeePositions = useMemo(
    () => Object.values(positionsInfoData || {}).filter((position) => position.pendingClaimableFundingFeesUsd.gt(0)),
    [positionsInfoData]
  );
  const selectedPositions = useMemo(
    () => positiveFeePositions.filter((position) => positionKeys.includes(position.key)),
    [positionKeys, positiveFeePositions]
  );
  const total = useMemo(() => getTotalAccruedFundingUsd(selectedPositions), [selectedPositions]);
  const totalStr = formatDeltaUsd(total);

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
      if (value) {
        setPositionKeys([...positionKeys, positionKey].filter((key, index, array) => array.indexOf(key) === index));
      } else {
        setPositionKeys(positionKeys.filter((key) => key !== positionKey));
      }
    },
    [positionKeys, setPositionKeys]
  );

  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const onSubmit = useCallback(() => {
    if (!account || !signer || !chainId || !gasLimits || !tokensData || !gasPrice) return;

    setIsSubmitting(true);

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice)?.feeTokenAmount;

    createDecreaseOrderTxn(
      chainId,
      signer,
      selectedPositions.map((position) => {
        const markPrice = position
          ? getMarkPrice({
              prices: position.indexToken.prices,
              isLong: position.isLong,
              isIncrease: false,
            })
          : undefined;

        return {
          account,
          marketAddress: position.marketAddress,
          initialCollateralAddress: position.collateralTokenAddress,
          initialCollateralDeltaAmount: BigNumber.from(1), // FIXME ?
          receiveTokenAddress: position.collateralToken.address,
          swapPath: [],
          sizeDeltaUsd: BigNumber.from(0),
          sizeDeltaInTokens: BigNumber.from(0),
          acceptablePrice: markPrice!,
          triggerPrice: undefined,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          orderType: OrderType.MarketDecrease,
          isLong: position.isLong,
          minOutputUsd: BigNumber.from(0),
          executionFee: executionFee!,
          allowedSlippage,
          referralCode: userReferralInfo?.referralCodeForTxn,
          indexToken: position.indexToken,
          tokensData,
          skipSimulation: true,
        };
      }),
      {
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      }
    )
      .then(onClose)
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    account,
    allowedSlippage,
    chainId,
    gasLimits,
    gasPrice,
    onClose,
    selectedPositions,
    setPendingOrder,
    setPendingPosition,
    setPendingTxns,
    signer,
    tokensData,
    userReferralInfo?.referralCodeForTxn,
  ]);

  const renderTooltipContent = useCallback(() => t`Accrued Funding Fee`, []);

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={isVisible}
      setIsVisible={onClose}
      label={t`Confirm Settle`}
    >
      <div className="ConfirmationBox-main text-center">Settle {totalStr}</div>
      <div className="App-card-divider ClaimModal-divider FeeModal-divider SettleAccruedFundingFeeModal-divider" />
      <div className="ClaimModal-content SettleAccruedFundingFeeModal-modal-content">
        <div className="App-card-content">
          <div className="SettleAccruedFundingFeeModal-alert">
            <Trans>
              Consider not selecting position's with less accrued Funding Fees than the gas spent to Settle, which is
              around FIXME.
            </Trans>
          </div>

          <div className="App-card-divider ClaimModal-divider" />
          <div className="SettleAccruedFundingFeeModal-header">
            <div className="SettleAccruedFundingFeeModal-header-left">
              <Trans>POSITION</Trans>
            </div>
            <div className="SettleAccruedFundingFeeModal-header-right">
              <Tooltip
                className="SettleAccruedFundingFeeModal-tooltip"
                position="right-top"
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
