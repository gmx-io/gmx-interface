import { Trans } from "@lingui/macro";
import { useState } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

interface CollateralDestinationDialogProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  chosenReceiveToGmxAccount: boolean;
  setDialogHidden: (val: boolean) => void;
}

export function CollateralDestinationDialog({
  isVisible,
  setIsVisible,
  chosenReceiveToGmxAccount,
  setDialogHidden,
}: CollateralDestinationDialogProps) {
  const settings = useSettings();
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const destinationLabel = chosenReceiveToGmxAccount ? "GMX Balance" : "Wallet";

  function handleYes() {
    settings.setReceiveToGmxAccount(chosenReceiveToGmxAccount);
    if (dontAskAgain) {
      setDialogHidden(true);
    }
    setIsVisible(false);
  }

  function handleNo() {
    if (dontAskAgain) {
      setDialogHidden(true);
    }
    setIsVisible(false);
  }

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Update Default Destination</Trans>}
      contentClassName="w-[380px]"
      zIndex={1002}
    >
      <div className="flex flex-col gap-16">
        <div className="text-14 text-typography-secondary">
          <Trans>
            You chose to send the remaining collateral to <span className="font-medium text-typography-primary">{destinationLabel}</span>.
            Do you want to make <span className="font-medium text-typography-primary">{destinationLabel}</span> your default destination
            when closing positions?
          </Trans>
        </div>

        <TooltipWithPortal
          handle={
            <Trans>How do I choose?</Trans>
          }
          handleClassName="text-typography-secondary text-14"
          variant="iconStroke"
          content={
            <div>
              <Trans>
                <span className="font-bold">GMX Balance</span> keeps funds in your GMX Account for faster trading and
                lower gas costs.
                <br />
                <br />
                <span className="font-bold">Wallet</span> sends funds directly to your connected wallet.
              </Trans>
            </div>
          }
        />

        <div className="flex flex-col gap-8">
          <Button className="w-full" variant="primary" onClick={handleYes}>
            <Trans>Yes, set {destinationLabel} as default</Trans>
          </Button>
          <Button className="w-full" variant="secondary" onClick={handleNo}>
            <Trans>No, keep current default</Trans>
          </Button>
        </div>

        <Checkbox isChecked={dontAskAgain} setIsChecked={setDontAskAgain}>
          <span className="text-14 text-typography-secondary">
            <Trans>Don't ask again</Trans>
          </span>
        </Checkbox>
      </div>
    </ModalWithPortal>
  );
}
