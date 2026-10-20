import { Trans } from "@lingui/macro";
import { useState } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { MarginDestinationTooltipContent } from "components/MarginDestinationSelector/MarginDestinationTooltipContent";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import StandardTooltip from "components/Tooltip/StandardTooltip";

interface MarginDestinationDialogProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  chosenReceiveToGmxAccount: boolean;
  setDialogHidden: (val: boolean) => void;
}

export function MarginDestinationDialog({
  isVisible,
  setIsVisible,
  chosenReceiveToGmxAccount,
  setDialogHidden,
}: MarginDestinationDialogProps) {
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
      label={<Trans>Update default destination</Trans>}
      contentClassName="w-[380px]"
      zIndex={1002}
    >
      <div className="flex flex-col gap-16">
        <div className="text-14 text-typography-secondary">
          <Trans>
            You chose to send the remaining margin to your{" "}
            <span className="font-medium text-typography-primary">{chosenLabel}</span>. Make this the default
            destination when closing positions?
          </Trans>
        </div>

        <StandardTooltip
          handle={<Trans>How do I choose?</Trans>}
          handleClassName="text-14 text-typography-secondary"
          variant="iconStroke"
          content={<MarginDestinationTooltipContent />}
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
