import { t, Trans } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import { formatDeltaUsd } from "lib/numbers";

import Button from "components/Button/Button";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTotalAccruedFundingUsd } from "domain/synthetics/markets";
import { SettleAccruedFundingFeeRow } from "./SettleAccruedFundingFeeRow";

import "./SettleAccruedFundingFeeModal.scss";
import useWallet from "lib/wallets/useWallet";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  positionKeys: string[];
  positionsInfoData: PositionsInfoData | undefined;
  setPositionKeys: (keys: string[]) => void;
};

export function SettleAccruedFundingFeeModal({
  isVisible,
  onClose,
  positionKeys,
  setPositionKeys,
  positionsInfoData,
}: Props) {
  const { account, signer } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const positiveFeePositions = useMemo(
    () => Object.values(positionsInfoData || {}).filter((position) => position.pendingFundingFeesUsd.gt(0)),
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

  const onSubmit = useCallback(() => {
    if (!account || !signer) return;

    // const fundingMarketAddresses: string[] = [];
    // const fundingTokenAddresses: string[] = [];

    // for (const market of ) {
    //   if (market.claimableFundingAmountLong?.gt(0)) {
    //     fundingMarketAddresses.push(market.marketTokenAddress);
    //     fundingTokenAddresses.push(market.longTokenAddress);
    //   }

    //   if (market.claimableFundingAmountShort?.gt(0)) {
    //     fundingMarketAddresses.push(market.marketTokenAddress);
    //     fundingTokenAddresses.push(market.shortTokenAddress);
    //   }
    // }

    setIsSubmitting(true);
    setIsSubmitting(false);

    // claimCollateralTxn(chainId, signer, {
    //   account,
    //   fundingFees: {
    //     marketAddresses: fundingMarketAddresses,
    //     tokenAddresses: fundingTokenAddresses,
    //   },
    //   setPendingTxns,
    // })
    //   .then(onClose)
    //   .finally(() => setIsSubmitting(false));
  }, [account, signer]);

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
              <Trans>FUNDING FEE</Trans>
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
