import { t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import { formatDeltaUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";

import Button from "components/Button/Button";
import { PositionInfo } from "domain/synthetics/positions";
import { useEffect, useState } from "react";

type Props = {
  isVisible: boolean;
  onClose: () => void;
  position: PositionInfo | undefined;
};

export function ClaimFundingFeeModal({ isVisible, onClose, position }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalStr = formatDeltaUsd(position?.pendingClaimableFundingFeesUsd) || "...";

  useEffect(() => {
    if (!isVisible) setIsSubmitting(false);
  }, [isVisible]);

  return (
    <Modal
      className="Confirmation-box ClaimableModal"
      isVisible={isVisible}
      setIsVisible={onClose}
      label={t`Confirm Claim`}
    >
      <div className="ConfirmationBox-main text-center">Claim {totalStr}</div>
      <div className="ClaimModal-content">
        <div className="App-card-content">
          <ExchangeInfoRow className="ClaimModal-row" label={t`Accrued Positive Funding Fee`} value={totalStr} />

          <div className="App-card-divider ClaimModal-divider" />
        </div>
      </div>
      <Button className="w-full" variant="primary-action" disabled={isSubmitting} onClick={() => setIsSubmitting(true)}>
        {isSubmitting ? t`Claiming...` : t`Claim`}
      </Button>
    </Modal>
  );
}
