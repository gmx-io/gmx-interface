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

  const chosenLabel = chosenReceiveToGmxAccount ? "GMX Account" : "Arbitrum wallet";
  const currentLabel = chosenReceiveToGmxAccount ? "Arbitrum wallet" : "GMX Account";

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
            You chose to send the remaining collateral to your{" "}
            <span className="font-medium text-typography-primary">{chosenLabel}</span>. Do you want to make this the
            default destination when closing positions?
          </Trans>
        </div>

        <TooltipWithPortal
          handle={<Trans>How do I choose?</Trans>}
          handleClassName="text-14 text-typography-secondary"
          variant="iconStroke"
          content={
            <div>
              <Trans>
                Because positions on Arbitrum can be funded from both your wallet and your GMX Account, we can't always
                determine where to return the collateral automatically.
                <br />
                <br />
                Choose:
                <br />• <span className="font-bold">Wallet</span> if you mostly trade from your personal wallet on
                Arbitrum
                <br />• <span className="font-bold">GMX Account</span> if you plan to keep trading or reusing collateral
                on GMX.
                <br />
                <br />
                You can change this preference anytime in Settings or when closing a position.
              </Trans>
            </div>
          }
        />

        <div className="flex flex-col gap-8">
          <Button className="w-full" variant="primary" onClick={handleYes}>
            <Trans>Yes, set {chosenLabel} as default</Trans>
          </Button>
          <Button className="w-full" variant="secondary" onClick={handleNo}>
            <Trans>No, keep {currentLabel} as default</Trans>
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
